/**
 * src/theme-engine/bricks/special/LineConstellationBrick.ts
 *
 * Brique Spéciale : Constellation de Lignes & Réseau Synaptique 3D (Couche : Spéciaux).
 * Nœuds lumineux 3D dérivant selon des mouvements browniens continus par Simplex 3D,
 * interconnectés dynamiquement par des lignes de proximité à opacité continue, avec
 * paquets d'ondes synaptiques se propageant le long des segments, attraction gravitationnelle
 * au curseur souris et dispersion de profondeur Z réaliste.
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
  private nodePositions = new Float32Array(MAX_NODES * 3)
  private nodeVelocities = new Float32Array(MAX_NODES * 3)
  private nodeSeeds = new Float32Array(MAX_NODES)
  private linePositionsBuffer = new Float32Array(MAX_LINES * 2 * 3)
  private lineColorsBuffer = new Float32Array(MAX_LINES * 2 * 4)

  private dummy = new THREE.Object3D()
  private nodeColorObj = new THREE.Color('#00f0ff')
  private lineColorObj = new THREE.Color('#38bdf8')
  private pulseColorObj = new THREE.Color('#ffffff')

  private activeNodeCount = 75
  private activeLineLimit = 220
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

    // Initialisation des nœuds dans l'espace 3D
    const depthAmp = props.depth ?? 0.4
    for (let i = 0; i < MAX_NODES; i++) {
      const idx = i * 3
      this.nodePositions[idx] = (Math.random() - 0.5) * 16.0
      this.nodePositions[idx + 1] = (Math.random() - 0.5) * 10.0
      this.nodePositions[idx + 2] = (Math.random() - 0.5) * 8.0 * depthAmp - 1.0

      const angle = Math.random() * Math.PI * 2
      const spd = 0.4 + Math.random() * 0.6
      this.nodeVelocities[idx] = Math.cos(angle) * spd
      this.nodeVelocities[idx + 1] = Math.sin(angle) * spd
      this.nodeVelocities[idx + 2] = (Math.random() - 0.5) * spd * 0.5
      this.nodeSeeds[i] = Math.random() * 100.0
    }

    this.initMeshes(context)
  }

  private configureCountsForQuality(): void {
    const isMobile = window.innerWidth < 768
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
    // 1. Shaders & Maillage pour les nœuds (InstancedMesh avec cercles doux et halo)
    const nodeGeo = new THREE.CircleGeometry(0.18, 16)
    this.nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uColor: { value: this.nodeColorObj },
        uPulseColor: { value: this.pulseColorObj },
        uIntensity: { value: this.props.intensity ?? 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uPulseColor;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          if (d > 1.0) discard;
          // Cœur étincelant avec couronne corona externe
          float core = smoothstep(0.45, 0.0, d);
          float corona = exp(-d * 2.8);
          float alpha = max(core * 1.2, corona * 0.9);
          vec3 col = mix(uColor, uPulseColor, core * 0.8) * (uIntensity * 1.3);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.nodesMesh = new THREE.InstancedMesh(nodeGeo, this.nodeMaterial, MAX_NODES)
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.nodesMesh.frustumCulled = false
    this.nodesMesh.renderOrder = -4
    this.scene.add(this.nodesMesh)

    // 2. BufferGeometry pour les lignes dynamiques
    this.linesGeometry = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(this.linePositionsBuffer, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    this.linesGeometry.setAttribute('position', posAttr)

    const colAttr = new THREE.BufferAttribute(this.lineColorsBuffer, 4)
    colAttr.setUsage(THREE.DynamicDrawUsage)
    this.linesGeometry.setAttribute('color', colAttr)

    this.linesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: this.props.intensity ?? 1.0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        varying vec4 vColor;
        void main() {
          gl_FragColor = vec4(vColor.rgb * uIntensity, vColor.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.linesSegments = new THREE.LineSegments(this.linesGeometry, this.linesMaterial)
    this.linesSegments.frustumCulled = false
    this.linesSegments.renderOrder = -5
    this.scene.add(this.linesSegments)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.nodesMesh || !this.linesGeometry) return

    const dt = Math.min(delta, 0.05)
    this.timeAccumulator += dt
    const speed = this.props.speed ?? 0.25
    const randomness = this.props.randomness ?? 0.35
    const nodeSize = this.props.nodeSize ?? 1.0
    const depthFactor = this.props.depth ?? 0.4
    const connectDist = this.props.connectDistance ?? 2.8
    const connectDistSq = connectDist * connectDist
    const pulseSpeed = this.props.pulseSpeed ?? 1.5

    // Position virtuelle de la souris dans l'espace 3D
    const mouseX = interaction.mouseX * 7.0
    const mouseY = interaction.mouseY * 4.5

    const count = this.activeNodeCount

    // 1. Mise à jour de la dérive brownienne des nœuds
    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const seed = this.nodeSeeds[i]

      // Turbulence Simplex 3D continue
      const noiseX = simplex3D(this.nodePositions[idx] * 0.15, this.timeAccumulator * speed * 0.3, seed)
      const noiseY = simplex3D(seed, this.nodePositions[idx + 1] * 0.15, this.timeAccumulator * speed * 0.3)
      const noiseZ = simplex3D(this.nodePositions[idx + 2] * 0.15, seed, this.timeAccumulator * speed * 0.3)

      this.nodePositions[idx] += (this.nodeVelocities[idx] + noiseX * randomness * 2.5) * speed * dt
      this.nodePositions[idx + 1] += (this.nodeVelocities[idx + 1] + noiseY * randomness * 2.5) * speed * dt
      this.nodePositions[idx + 2] += (this.nodeVelocities[idx + 2] + noiseZ * randomness * 1.5) * speed * dt

      // Rebond doux aux bordures virtuelles
      if (Math.abs(this.nodePositions[idx]) > 9.0) this.nodeVelocities[idx] *= -1
      if (Math.abs(this.nodePositions[idx + 1]) > 5.5) this.nodeVelocities[idx + 1] *= -1
      if (Math.abs(this.nodePositions[idx + 2]) > 4.0 * depthFactor) this.nodeVelocities[idx + 2] *= -1

      // Attraction douce gravitationnelle vers la souris
      const dxm = mouseX - this.nodePositions[idx]
      const dym = mouseY - this.nodePositions[idx + 1]
      const distMouseSq = dxm * dxm + dym * dym
      if (distMouseSq < 16.0) {
        const force = (1.0 - Math.sqrt(distMouseSq) / 4.0) * 0.65 * dt
        this.nodePositions[idx] += dxm * force
        this.nodePositions[idx + 1] += dym * force
      }

      // Échelle dynamique avec la profondeur Z
      const zNorm = (this.nodePositions[idx + 2] + 4.0) / 8.0 // 0 (loin) à 1 (proche)
      const scale = (0.7 + zNorm * 0.6) * nodeSize

      this.dummy.position.set(this.nodePositions[idx], this.nodePositions[idx + 1], this.nodePositions[idx + 2])
      this.dummy.scale.set(scale, scale, 1.0)
      this.dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, this.dummy.matrix)
    }

    // Masquer les nœuds inactifs
    for (let i = count; i < MAX_NODES; i++) {
      this.dummy.position.set(999, 999, 999)
      this.dummy.scale.set(0.001, 0.001, 0.001)
      this.dummy.updateMatrix()
      this.nodesMesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.nodesMesh.instanceMatrix.needsUpdate = true

    // 2. Détection dynamique des paires de proximité pour les lignes
    let lineIdx = 0
    const maxLines = this.activeLineLimit

    for (let i = 0; i < count && lineIdx < maxLines; i++) {
      const i3 = i * 3
      const xi = this.nodePositions[i3]
      const yi = this.nodePositions[i3 + 1]
      const zi = this.nodePositions[i3 + 2]

      for (let j = i + 1; j < count && lineIdx < maxLines; j++) {
        const j3 = j * 3
        const dx = xi - this.nodePositions[j3]
        const dy = yi - this.nodePositions[j3 + 1]
        const dz = zi - this.nodePositions[j3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < connectDistSq) {
          const dist = Math.sqrt(distSq)
          const proximity = 1.0 - dist / connectDist

          // Paquet synaptique le long de la ligne (HIGH uniquement)
          let pulseFactor = 0.0
          if (this.quality === 'HIGH') {
            const wave = Math.sin(time * pulseSpeed * 3.5 - dist * 2.5 + (i * 2 + j))
            pulseFactor = Math.pow(Math.max(0.0, wave), 6.0) * 1.2
          }

          const intensity = this.props.intensity ?? 1.0
          // Opacité renforcée pour garantir la visibilité des filaments à 60 FPS
          const baseAlpha = Math.min(1.0, (0.35 + proximity * 0.65 + pulseFactor * 0.5) * intensity)

          const vertexOffset = lineIdx * 6
          const colorOffset = lineIdx * 8

          // Sommet 1 (Nœud i)
          this.linePositionsBuffer[vertexOffset] = xi
          this.linePositionsBuffer[vertexOffset + 1] = yi
          this.linePositionsBuffer[vertexOffset + 2] = zi

          // Sommet 2 (Nœud j)
          this.linePositionsBuffer[vertexOffset + 3] = this.nodePositions[j3]
          this.linePositionsBuffer[vertexOffset + 4] = this.nodePositions[j3 + 1]
          this.linePositionsBuffer[vertexOffset + 5] = this.nodePositions[j3 + 2]

          // Couleur Sommet 1 avec sursaut synaptique
          this.lineColorsBuffer[colorOffset] = Math.min(1.0, this.lineColorObj.r + this.pulseColorObj.r * pulseFactor)
          this.lineColorsBuffer[colorOffset + 1] = Math.min(1.0, this.lineColorObj.g + this.pulseColorObj.g * pulseFactor)
          this.lineColorsBuffer[colorOffset + 2] = Math.min(1.0, this.lineColorObj.b + this.pulseColorObj.b * pulseFactor)
          this.lineColorsBuffer[colorOffset + 3] = baseAlpha

          // Couleur Sommet 2
          this.lineColorsBuffer[colorOffset + 4] = this.lineColorObj.r
          this.lineColorsBuffer[colorOffset + 5] = this.lineColorObj.g
          this.lineColorsBuffer[colorOffset + 6] = this.lineColorObj.b
          this.lineColorsBuffer[colorOffset + 7] = baseAlpha * 0.85

          lineIdx++
        }
      }
    }

    // Réinitialiser les sommets restants hors champ
    for (let l = lineIdx; l < MAX_LINES; l++) {
      const vOffset = l * 6
      const cOffset = l * 8
      this.linePositionsBuffer[vOffset] = 0
      this.linePositionsBuffer[vOffset + 1] = 0
      this.linePositionsBuffer[vOffset + 2] = 0
      this.linePositionsBuffer[vOffset + 3] = 0
      this.linePositionsBuffer[vOffset + 4] = 0
      this.linePositionsBuffer[vOffset + 5] = 0
      this.lineColorsBuffer[cOffset + 3] = 0
      this.lineColorsBuffer[cOffset + 7] = 0
    }

    const posAttr = this.linesGeometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = this.linesGeometry.getAttribute('color') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
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
    }
    if (newProps.intensity !== undefined) {
      if (this.nodeMaterial) this.nodeMaterial.uniforms.uIntensity.value = newProps.intensity
      if (this.linesMaterial) this.linesMaterial.uniforms.uIntensity.value = newProps.intensity
    }
    if (newProps.density !== undefined) {
      this.configureCountsForQuality()
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.quality = quality
    this.configureCountsForQuality()
  }

  public dispose(): void {
    if (this.nodesMesh) {
      this.scene.remove(this.nodesMesh)
      if (this.nodesMesh.geometry) this.nodesMesh.geometry.dispose()
      if (this.nodeMaterial) this.nodeMaterial.dispose()
      this.nodesMesh = null
      this.nodeMaterial = null
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
