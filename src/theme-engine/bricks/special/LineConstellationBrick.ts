/**
 * src/theme-engine/bricks/special/LineConstellationBrick.ts
 *
 * Brique Spéciale : Constellation de Lignes & Réseau Synaptique 3D (Couche : Spéciaux).
 * Étoiles de magnitudes et tailles variées scintillant de manière asynchrone avec halo lumineux
 * (et aigrettes optiques discrètes sur les plus brillantes), dérive brownienne lente ancrée
 * avec parallaxe souris/scroll proportionnelle à la profondeur Z, et liaisons continues
 * à opacité progressive selon la distance et influx synaptiques en HIGH.
 * Zéro allocation Garbage Collector par frame.
 */

import * as THREE from 'three'

import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  InteractionState,
  QualityTier,
} from '../../types'
import { simplex3D } from '../../utils/noise'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Constellation de Lignes.
 */
export interface LineConstellationProps {
  /** Couleur principale des nœuds stellaires (défaut #00f0ff ou uPaletteAccent). */
  nodeColor?: string
  /** Couleur des lignes de connexion (défaut #38bdf8 ou uPaletteSecondary). */
  lineColor?: string
  /** Couleur des impulsions et paquets synaptiques (défaut #ffffff). */
  pulseColor?: string
  /** Densité et nombre de nœuds dans la constellation (0.4 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de dérive brownienne des nœuds (0.05 à 1.5, défaut 0.25). */
  speed?: number
  /** Amplitude de profondeur Z et réactivité à la parallaxe (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance et éclat lumineux des nœuds et lignes (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Turbulence chaotique et dispersion aléatoire (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Distance maximale d'interconnexion entre deux nœuds (1.5 à 5.0, défaut 2.8). */
  connectDistance?: number
  /** Taille relative des nœuds (0.4 à 2.5, défaut 1.0). */
  nodeSize?: number
  /** Vitesse de propagation des impulsions synaptiques le long des lignes (0.5 à 4.0, défaut 1.5). */
  pulseSpeed?: number
  /** Vitesse de scintillement asynchrone des étoiles (0.0 à 3.0, défaut 1.2). */
  twinkleSpeed?: number
  /** Ampleur du halo lumineux autour des nœuds (0.0 à 2.0, défaut 1.0). */
  haloStrength?: number
  /** Amplitude de la parallaxe souris/scroll selon la profondeur Z (0.0 à 2.0, défaut 1.0). */
  parallaxStrength?: number
}

const MAX_NODES = 100
const MAX_LINES = 350

export class LineConstellationInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'line_constellation'

  private scene: THREE.Scene
  private props: LineConstellationProps
  private quality: QualityTier = 'HIGH'

  // Three.js objets
  private nodesMesh: THREE.InstancedMesh | null = null
  private nodeMaterial: THREE.ShaderMaterial | null = null
  private linesSegments: THREE.LineSegments | null = null
  private linesGeometry: THREE.BufferGeometry | null = null
  private linesMaterial: THREE.ShaderMaterial | null = null

  // Buffers pré-alloués pour zéro allocation en RAF
  private nodeHomePositions = new Float32Array(MAX_NODES * 3)
  private nodePositions = new Float32Array(MAX_NODES * 3)
  private renderPositions = new Float32Array(MAX_NODES * 3)
  private nodeVelocities = new Float32Array(MAX_NODES * 3)
  private nodeSeeds = new Float32Array(MAX_NODES)
  private nodeSizes = new Float32Array(MAX_NODES)
  private nodeDepthNorms = new Float32Array(MAX_NODES)
  private nodeColorMix = new Float32Array(MAX_NODES)

  private linePositionsBuffer = new Float32Array(MAX_LINES * 2 * 3)
  private lineColorsBuffer = new Float32Array(MAX_LINES * 2 * 4)
  private lineMetaBuffer = new Float32Array(MAX_LINES * 2 * 2) // [progress (0..1), phase]

  private seedAttr: THREE.InstancedBufferAttribute | null = null
  private depthAttr: THREE.InstancedBufferAttribute | null = null
  private colorMixAttr: THREE.InstancedBufferAttribute | null = null

  private dummy = new THREE.Object3D()
  private nodeColorObj = new THREE.Color('#00f0ff')
  private lineColorObj = new THREE.Color('#38bdf8')
  private pulseColorObj = new THREE.Color('#ffffff')

  private activeNodeCount = 75
  private activeLineLimit = 240
  private timeAccumulator = 0

  constructor(id: string, props: LineConstellationProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.quality = context.quality

    this.configureCountsForQuality()

    if (props.nodeColor) this.nodeColorObj.set(props.nodeColor)
    if (props.lineColor) this.lineColorObj.set(props.lineColor)
    if (props.pulseColor) this.pulseColorObj.set(props.pulseColor)

    // Distribution stratifiée dans le frustum visible (caméra z=5, fov=50° -> ~[-5.2, 5.2] x [-3.0, 3.0])
    const depthAmp = props.depth ?? 0.4
    const cols = 10
    const rows = 10
    for (let i = 0; i < MAX_NODES; i++) {
      const idx = i * 3
      const gx = (i % cols) / cols - 0.5
      const gy = Math.floor(i / cols) / rows - 0.5
      const jitterX = (Math.random() - 0.5) * 1.1
      const jitterY = (Math.random() - 0.5) * 0.65

      const hx = gx * 10.6 + 0.53 + jitterX
      const hy = gy * 6.0 + 0.3 + jitterY
      const hz = (Math.random() - 0.5) * 5.2 * depthAmp - 0.8

      this.nodeHomePositions[idx] = hx
      this.nodeHomePositions[idx + 1] = hy
      this.nodeHomePositions[idx + 2] = hz

      this.nodePositions[idx] = hx
      this.nodePositions[idx + 1] = hy
      this.nodePositions[idx + 2] = hz

      const angle = Math.random() * Math.PI * 2
      const spd = 0.22 + Math.random() * 0.35
      this.nodeVelocities[idx] = Math.cos(angle) * spd
      this.nodeVelocities[idx + 1] = Math.sin(angle) * spd
      this.nodeVelocities[idx + 2] = (Math.random() - 0.5) * spd * 0.25

      this.nodeSeeds[i] = Math.random() * 100.0
      const magRoll = Math.random()
      this.nodeSizes[i] = magRoll < 0.15 ? 1.25 + Math.random() * 0.65 : 0.42 + Math.random() * 0.58
      this.nodeColorMix[i] = Math.random()
    }

    this.initMeshes(context)
  }

  private configureCountsForQuality(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const density = this.props.density ?? 1.0

    if (isMobile || this.quality === 'LOW') {
      this.activeNodeCount = Math.min(MAX_NODES, Math.floor(25 * density))
      this.activeLineLimit = 60
    } else if (this.quality === 'MEDIUM') {
      this.activeNodeCount = Math.min(MAX_NODES, Math.floor(45 * density))
      this.activeLineLimit = 130
    } else {
      this.activeNodeCount = Math.min(MAX_NODES, Math.floor(75 * density))
      this.activeLineLimit = 240
    }
  }

  private initMeshes(context: BrickContext): void {
    const nodeGeo = new THREE.PlaneGeometry(0.62, 0.62)
    this.seedAttr = new THREE.InstancedBufferAttribute(this.nodeSeeds, 1)
    this.depthAttr = new THREE.InstancedBufferAttribute(this.nodeDepthNorms, 1)
    this.colorMixAttr = new THREE.InstancedBufferAttribute(this.nodeColorMix, 1)
    this.depthAttr.setUsage(THREE.DynamicDrawUsage)

    nodeGeo.setAttribute('aSeed', this.seedAttr)
    nodeGeo.setAttribute('aDepthNorm', this.depthAttr)
    nodeGeo.setAttribute('aColorMix', this.colorMixAttr)

    const qualityInt = this.quality === 'HIGH' ? 2 : this.quality === 'MEDIUM' ? 1 : 0

    this.nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uColor: { value: this.nodeColorObj },
        uPulseColor: { value: this.pulseColorObj },
        uIntensity: { value: this.props.intensity ?? 1.0 },
        uTwinkleSpeed: { value: this.props.twinkleSpeed ?? 1.2 },
        uHaloStrength: { value: this.props.haloStrength ?? 1.0 },
        uQualityLevel: { value: qualityInt },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aDepthNorm;
        attribute float aColorMix;
        varying vec2 vUv;
        varying float vSeed;
        varying float vDepthNorm;
        varying float vColorMix;

        void main() {
          vUv = uv;
          vSeed = aSeed;
          vDepthNorm = aDepthNorm;
          vColorMix = aColorMix;

          float sx = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
          vec4 mvCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mvCenter.xy += position.xy * sx;
          gl_Position = projectionMatrix * mvCenter;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uPulseColor;
        uniform float uIntensity;
        uniform float uTwinkleSpeed;
        uniform float uHaloStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;
        varying float vSeed;
        varying float vDepthNorm;
        varying float vColorMix;

        void main() {
          vec2 centered = (vUv - 0.5) * 2.0;
          float d = length(centered);
          if (d >= 1.0) discard;

          float edgeMask = smoothstep(1.0, 0.65, d);

          float tw = 1.0;
          if (uTwinkleSpeed > 0.001) {
            float t = uTime * uTwinkleSpeed;
            if (uQualityLevel >= 1) {
              float f1 = 1.15 + fract(vSeed * 0.37) * 1.45;
              float f2 = 2.618 + fract(vSeed * 0.71) * 1.1;
              tw = 0.74 + 0.17 * sin(t * f1 + vSeed * 6.2831) + 0.09 * sin(t * f2 + vSeed * 11.13);
            } else {
              tw = 0.80 + 0.20 * sin(t * 1.4 + vSeed * 6.2831);
            }
          }

          float core = exp(-d * 10.5) * 1.35;
          float innerGlow = exp(-d * 4.4) * 0.72;
          float outerHalo = exp(-d * 2.1) * 0.34 * max(0.0, uHaloStrength);

          float spikes = 0.0;
          if (uQualityLevel >= 2 && vColorMix > 0.72) {
            float sx = exp(-abs(centered.y) * 24.0) * exp(-abs(centered.x) * 4.2);
            float sy = exp(-abs(centered.x) * 24.0) * exp(-abs(centered.y) * 4.2);
            spikes = (sx + sy) * 0.38 * max(0.2, uHaloStrength);
          }

          float depthAtten = 0.45 + 0.55 * clamp(vDepthNorm, 0.0, 1.0);
          float lum = (core + innerGlow + outerHalo + spikes) * edgeMask * tw * depthAtten;

          vec3 starBase = mix(uColor, uPulseColor, 0.28 * vColorMix);
          vec3 col = mix(starBase, uPulseColor, clamp(core * 0.75, 0.0, 1.0)) * (lum * uIntensity);

          gl_FragColor = vec4(col, clamp(lum * 0.95, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.nodesMesh = new THREE.InstancedMesh(nodeGeo, this.nodeMaterial, MAX_NODES)
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.nodesMesh.frustumCulled = false
    this.nodesMesh.renderOrder = -4
    this.scene.add(this.nodesMesh)

    this.linesGeometry = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(this.linePositionsBuffer, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    this.linesGeometry.setAttribute('position', posAttr)

    const colAttr = new THREE.BufferAttribute(this.lineColorsBuffer, 4)
    colAttr.setUsage(THREE.DynamicDrawUsage)
    this.linesGeometry.setAttribute('color', colAttr)

    const metaAttr = new THREE.BufferAttribute(this.lineMetaBuffer, 2)
    metaAttr.setUsage(THREE.DynamicDrawUsage)
    this.linesGeometry.setAttribute('aLineMeta', metaAttr)

    this.linesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uIntensity: { value: this.props.intensity ?? 1.0 },
        uPulseSpeed: { value: this.props.pulseSpeed ?? 1.5 },
        uPulseColor: { value: this.pulseColorObj },
        uQualityLevel: { value: qualityInt },
      },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        attribute vec2 aLineMeta;
        varying vec4 vColor;
        varying vec2 vLineMeta;
        void main() {
          vColor = color;
          vLineMeta = aLineMeta;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uPulseSpeed;
        uniform vec3 uPulseColor;
        uniform int uQualityLevel;
        varying vec4 vColor;
        varying vec2 vLineMeta;

        void main() {
          vec3 rgb = vColor.rgb;
          float alpha = vColor.a;

          if (uQualityLevel >= 2 && alpha > 0.005) {
            float pulsePos = fract(uTime * uPulseSpeed * 0.22 + vLineMeta.y);
            float distToPulse = abs(vLineMeta.x - pulsePos);
            float packet = exp(-distToPulse * distToPulse * 28.0) * smoothstep(0.05, 0.2, vColor.a);
            rgb += uPulseColor * (packet * 0.65);
            alpha = min(1.0, alpha + packet * 0.35);
          }

          gl_FragColor = vec4(rgb * uIntensity, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.linesSegments = new THREE.LineSegments(this.linesGeometry, this.linesMaterial)
    this.linesSegments.frustumCulled = false
    this.linesSegments.renderOrder = -5
    this.scene.add(this.linesSegments)
  }

  public init(): void {}

  public update(delta: number, _time: number, interaction: InteractionState): void {
    if (!this.nodesMesh || !this.linesGeometry || !this.depthAttr) return

    const dt = Math.min(delta, 0.05)
    this.timeAccumulator += dt
    const speed = this.props.speed ?? 0.25
    const randomness = this.props.randomness ?? 0.35
    const nodeSize = this.props.nodeSize ?? 1.0
    const depthFactor = this.props.depth ?? 0.4
    const connectDist = this.props.connectDistance ?? 2.8
    const connectDistSq = connectDist * connectDist
    const parallaxStrength = this.props.parallaxStrength ?? 1.0
    const intensity = this.props.intensity ?? 1.0

    const mouseX = interaction.mouseX * 5.2
    const mouseY = interaction.mouseY * 3.0
    const count = this.activeNodeCount

    // 1. Dérive brownienne ancrée (évite tout regroupement/effondrement sous le curseur) + parallaxe Z
    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const seed = this.nodeSeeds[i]

      const zNorm = Math.min(1.0, Math.max(0.0, (this.nodePositions[idx + 2] + 3.2) / 5.6))
      this.nodeDepthNorms[i] = zNorm

      const layerDrift = 0.45 + 0.55 * zNorm
      const effectiveSpeed = speed * 0.65 * layerDrift

      if (this.quality !== 'LOW') {
        const noiseX = simplex3D(
          this.nodePositions[idx] * 0.16,
          this.timeAccumulator * speed * 0.2,
          seed
        )
        const noiseY = simplex3D(
          seed,
          this.nodePositions[idx + 1] * 0.16,
          this.timeAccumulator * speed * 0.2
        )
        const noiseZ = simplex3D(
          this.nodePositions[idx + 2] * 0.16,
          seed,
          this.timeAccumulator * speed * 0.2
        )

        this.nodePositions[idx] +=
          (this.nodeVelocities[idx] + noiseX * randomness * 1.4) * effectiveSpeed * dt
        this.nodePositions[idx + 1] +=
          (this.nodeVelocities[idx + 1] + noiseY * randomness * 1.4) * effectiveSpeed * dt
        this.nodePositions[idx + 2] +=
          (this.nodeVelocities[idx + 2] + noiseZ * randomness * 0.8) * effectiveSpeed * dt
      } else {
        this.nodePositions[idx] += this.nodeVelocities[idx] * effectiveSpeed * dt
        this.nodePositions[idx + 1] += this.nodeVelocities[idx + 1] * effectiveSpeed * dt
        this.nodePositions[idx + 2] += this.nodeVelocities[idx + 2] * effectiveSpeed * dt
      }

      // Rappel élastique doux vers l'ancre stellaire répartie (empêche toute agrégation permanente)
      const hx = this.nodeHomePositions[idx]
      const hy = this.nodeHomePositions[idx + 1]
      const hz = this.nodeHomePositions[idx + 2]
      const spring = 0.28 * dt
      this.nodePositions[idx] += (hx - this.nodePositions[idx]) * spring
      this.nodePositions[idx + 1] += (hy - this.nodePositions[idx + 1]) * spring
      this.nodePositions[idx + 2] += (hz - this.nodePositions[idx + 2]) * spring

      // Déviation douce au curseur sans piégeage (répulsion en noyau proche + légère inflexion autour)
      const x = this.nodePositions[idx]
      const y = this.nodePositions[idx + 1]
      const z = this.nodePositions[idx + 2]
      const dxm = mouseX - x
      const dym = mouseY - y
      const distMouseSq = dxm * dxm + dym * dym
      if (distMouseSq < 6.25 && distMouseSq > 0.04) {
        const distMouse = Math.sqrt(distMouseSq)
        // Attire doucement à moyenne distance (1.3..2.5) et repousse légèrement en dessous de 1.3
        const radialBias = distMouse > 1.3 ? 0.16 : -0.22
        const force = (1.0 - distMouse / 2.5) * radialBias * dt
        this.nodePositions[idx] += (dxm / distMouse) * force
        this.nodePositions[idx + 1] += (dym / distMouse) * force
      }

      // Parallaxe souris et scroll proportionnelle à Z
      const parallaxOffset = (zNorm - 0.35) * depthFactor * parallaxStrength
      const rx = this.nodePositions[idx] - interaction.mouseX * parallaxOffset * 1.45
      const ry =
        this.nodePositions[idx + 1] -
        interaction.mouseY * parallaxOffset * 1.0 +
        interaction.scrollY * 0.0018 * parallaxOffset
      const rz = z

      this.renderPositions[idx] = rx
      this.renderPositions[idx + 1] = ry
      this.renderPositions[idx + 2] = rz

      const scale = this.nodeSizes[i] * (0.58 + zNorm * 0.65) * nodeSize

      this.dummy.position.set(rx, ry, rz)
      this.dummy.scale.set(scale, scale, 1.0)
      this.dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = count; i < MAX_NODES; i++) {
      this.dummy.position.set(999, 999, 999)
      this.dummy.scale.set(0.001, 0.001, 0.001)
      this.dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.nodesMesh.instanceMatrix.needsUpdate = true
    this.depthAttr.needsUpdate = true

    // 2. Liaisons de proximité avec opacité continue jusqu'à 0 à connectDistance
    let lineIdx = 0
    const maxLines = this.activeLineLimit

    for (let i = 0; i < count && lineIdx < maxLines; i++) {
      const i3 = i * 3
      const xi = this.renderPositions[i3]
      const yi = this.renderPositions[i3 + 1]
      const zi = this.renderPositions[i3 + 2]
      const zNi = this.nodeDepthNorms[i]

      for (let j = i + 1; j < count && lineIdx < maxLines; j++) {
        const j3 = j * 3
        const xj = this.renderPositions[j3]
        const yj = this.renderPositions[j3 + 1]
        const zj = this.renderPositions[j3 + 2]

        const dx = xi - xj
        const dy = yi - yj
        const dz = zi - zj
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < connectDistSq) {
          const dist = Math.sqrt(distSq)
          const proximity = Math.max(0.0, 1.0 - dist / connectDist)
          const distFalloff = Math.pow(proximity, 1.65)
          const avgDepthFade = 0.32 + 0.68 * ((zNi + this.nodeDepthNorms[j]) * 0.5)
          const baseAlpha = Math.min(
            0.95,
            distFalloff * avgDepthFade * 0.88 * Math.min(1.5, intensity)
          )

          if (baseAlpha < 0.006) continue

          const vertexOffset = lineIdx * 6
          const colorOffset = lineIdx * 8
          const metaOffset = lineIdx * 4

          this.linePositionsBuffer[vertexOffset] = xi
          this.linePositionsBuffer[vertexOffset + 1] = yi
          this.linePositionsBuffer[vertexOffset + 2] = zi

          this.linePositionsBuffer[vertexOffset + 3] = xj
          this.linePositionsBuffer[vertexOffset + 4] = yj
          this.linePositionsBuffer[vertexOffset + 5] = zj

          this.lineColorsBuffer[colorOffset] = this.lineColorObj.r
          this.lineColorsBuffer[colorOffset + 1] = this.lineColorObj.g
          this.lineColorsBuffer[colorOffset + 2] = this.lineColorObj.b
          this.lineColorsBuffer[colorOffset + 3] = baseAlpha

          this.lineColorsBuffer[colorOffset + 4] = this.lineColorObj.r
          this.lineColorsBuffer[colorOffset + 5] = this.lineColorObj.g
          this.lineColorsBuffer[colorOffset + 6] = this.lineColorObj.b
          this.lineColorsBuffer[colorOffset + 7] = baseAlpha

          const phase = ((i * 7 + j * 13) % 97) / 97.0
          this.lineMetaBuffer[metaOffset] = 0.0
          this.lineMetaBuffer[metaOffset + 1] = phase
          this.lineMetaBuffer[metaOffset + 2] = 1.0
          this.lineMetaBuffer[metaOffset + 3] = phase

          lineIdx++
        }
      }
    }

    const posAttr = this.linesGeometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = this.linesGeometry.getAttribute('color') as THREE.BufferAttribute
    const metaAttr = this.linesGeometry.getAttribute('aLineMeta') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    metaAttr.needsUpdate = true
    this.linesGeometry.setDrawRange(0, lineIdx * 2)
  }

  public updateProps(newProps: Partial<LineConstellationProps>): void {
    this.props = { ...this.props, ...newProps }

    if (newProps.nodeColor) {
      this.nodeColorObj.set(newProps.nodeColor)
      if (this.nodeMaterial) this.nodeMaterial.uniforms.uColor.value = this.nodeColorObj
    }
    if (newProps.lineColor) {
      this.lineColorObj.set(newProps.lineColor)
    }
    if (newProps.pulseColor) {
      this.pulseColorObj.set(newProps.pulseColor)
      if (this.nodeMaterial) this.nodeMaterial.uniforms.uPulseColor.value = this.pulseColorObj
      if (this.linesMaterial) this.linesMaterial.uniforms.uPulseColor.value = this.pulseColorObj
    }
    if (newProps.intensity !== undefined) {
      if (this.nodeMaterial) this.nodeMaterial.uniforms.uIntensity.value = newProps.intensity
      if (this.linesMaterial) this.linesMaterial.uniforms.uIntensity.value = newProps.intensity
    }
    if (newProps.pulseSpeed !== undefined && this.linesMaterial) {
      this.linesMaterial.uniforms.uPulseSpeed.value = newProps.pulseSpeed
    }
    if (newProps.twinkleSpeed !== undefined && this.nodeMaterial) {
      this.nodeMaterial.uniforms.uTwinkleSpeed.value = newProps.twinkleSpeed
    }
    if (newProps.haloStrength !== undefined && this.nodeMaterial) {
      this.nodeMaterial.uniforms.uHaloStrength.value = newProps.haloStrength
    }
    if (newProps.density !== undefined) {
      this.configureCountsForQuality()
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.quality = quality
    this.configureCountsForQuality()
    const qualityInt = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    if (this.nodeMaterial) this.nodeMaterial.uniforms.uQualityLevel.value = qualityInt
    if (this.linesMaterial) this.linesMaterial.uniforms.uQualityLevel.value = qualityInt
  }

  public dispose(): void {
    if (this.nodesMesh) {
      this.scene.remove(this.nodesMesh)
      if (this.nodesMesh.geometry) this.nodesMesh.geometry.dispose()
      if (this.nodeMaterial) this.nodeMaterial.dispose()
      this.nodesMesh = null
      this.nodeMaterial = null
      this.seedAttr = null
      this.depthAttr = null
      this.colorMixAttr = null
    }
    if (this.linesSegments) {
      this.scene.remove(this.linesSegments)
      if (this.linesGeometry) this.linesGeometry.dispose()
      if (this.linesMaterial) this.linesMaterial.dispose()
      this.linesSegments = null
      this.linesGeometry = null
      this.linesMaterial = null
    }
  }
}

export const LineConstellationDefinition: IBrickDefinition<LineConstellationProps> = {
  type: 'line_constellation',
  category: 'special',
  create: (id, props, context) => new LineConstellationInstance(id, props, context),
}

BrickRegistry.register(LineConstellationDefinition)
