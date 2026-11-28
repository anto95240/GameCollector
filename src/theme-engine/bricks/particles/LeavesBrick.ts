/**
 * src/theme-engine/bricks/particles/LeavesBrick.ts
 *
 * Brique de Particules : Feuilles Mortes & Tourbillons d'Automne (Couche 3 : Particles).
 * Feuilles automnales variées (érable lobé, chêne sinué, bouleau dentelé, saule effilé)
 * avec palette d'automne riche (roux, or, pourpre, bronze, ocre), chute aérodynamique
 * en balancement pendulaire et culbute 3D couplée, poussée cohérente par les rafales de vent
 * et ombrage/translucidité 3D selon l'orientation face à la lumière.
 */

import * as THREE from 'three'

import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  InteractionState,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { simplex3D } from '../../utils/noise'
import { BrickRegistry } from '../registry'

export interface LeavesProps {
  /** Teinte dominante des feuilles rousses (défaut: '#ea580c'). */
  leafColor?: string
  /** Teinte secondaire pour les feuilles dorées (défaut: '#ca8a04'). */
  altColor?: string
  /** Multiplicateur de densité/nombre de feuilles (0.2 à 2.5, défaut: 1.0 -> 85 feuilles). */
  density?: number
  /** Vitesse moyenne de chute (0.1 à 2.0, défaut: 0.4). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Saturation et contraste général (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Turbulence des rafales et désynchronisation (0.0 à 1.0, défaut: 0.55). */
  randomness?: number
  /** Fréquence du balancement aérodynamique (0.5 à 3.0, défaut: 1.6). */
  flutterRate?: number
  /** Dérive globale sous le vent horizontal (0.0 à 1.5, défaut: 0.5). */
  windDrift?: number
  /** Amplitude des rafales de vent cohérentes (0.0 à 1.5, défaut: 0.55). */
  gustStrength?: number
  /** Position horizontale X de la source lumineuse (-1.0 à 1.0, défaut: 0.35). */
  lightSourceX?: number
  /** Position verticale Y de la source lumineuse (-1.0 à 1.5, défaut: 0.85). */
  lightSourceY?: number
}

export class LeavesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'leaves'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private flutterPhases: Float32Array
  private flutterFreqs: Float32Array
  private shapeTypes: Uint8Array // 0: érable, 1: chêne, 2: bouleau, 3: saule
  private baseScales: Float32Array
  private seeds: Float32Array
  private baseColors: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, shapeType, lightExposure, seed]

  private leafColor: THREE.Color
  private altColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private flutterRate: number
  private windDrift: number
  private gustStrength: number
  private lightSourceX: number
  private lightSourceY: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private crimsonColor = new THREE.Color('#b91c1c')
  private umberColor = new THREE.Color('#92400e')
  private goldColor = new THREE.Color('#eab308')
  private lightDir = new THREE.Vector3()
  private leafNormal = new THREE.Vector3()
  private euler = new THREE.Euler()
  private surgeMultiplier = 1.0

  constructor(id: string, props: LeavesProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.leafColor = new THREE.Color(props.leafColor ?? '#ea580c')
    this.altColor = new THREE.Color(props.altColor ?? '#ca8a04')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.4
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.55
    this.flutterRate = props.flutterRate ?? 1.6
    this.windDrift = props.windDrift ?? 0.5
    this.gustStrength = props.gustStrength ?? 0.55
    this.lightSourceX = props.lightSourceX ?? 0.35
    this.lightSourceY = props.lightSourceY ?? 0.85
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(110, Math.floor(85 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(85 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.rotations = new Float32Array(this.capacity * 3)
    this.rotVelocities = new Float32Array(this.capacity * 3)
    this.flutterPhases = new Float32Array(this.capacity)
    this.flutterFreqs = new Float32Array(this.capacity)
    this.shapeTypes = new Uint8Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.baseColors = new Float32Array(this.capacity * 3)
    this.instanceColors = new Float32Array(this.capacity * 3)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const colorAttr = new THREE.InstancedBufferAttribute(this.instanceColors, 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aColor', colorAttr)

    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: this.intensity },
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vColor = aColor;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        uniform int uQualityLevel;

        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          float alpha = vData.x;
          if (alpha <= 0.004) discard;

          float shapeType = vData.y;
          float lightExp = vData.z;
          float seed = vData.w;

          vec2 p = (vUv - 0.5) * 2.0;

          float leafMask = 0.0;
          float veinShade = 0.0;
          float edgeTan = 0.0;

          // Tige fine commune (pétiole en bas)
          float stemDist = max(abs(p.x - 0.02 * sin(p.y * 5.0)) - 0.024, max(-p.y - 0.90, p.y + 0.45));
          float stemMask = 1.0 - smoothstep(0.0, 0.02, stemDist);

          if (shapeType < 0.5) {
            // 0 : Feuille d'érable lobée (palme à 5 lobes)
            vec2 q = p - vec2(0.0, -0.06);
            float r = length(q);
            float ang = atan(q.y, q.x);
            float upAng = ang - 1.570796;
            // Symétrie bilatérale
            float a = abs(atan(sin(upAng), cos(upAng)));
            float lobeMain = pow(max(0.0, cos(a * 2.35)), 1.9) * 0.46;
            float lobeMid = exp(-pow((a - 0.92) * 3.2, 2.0)) * 0.34;
            float lobeLow = exp(-pow((a - 1.62) * 3.6, 2.0)) * 0.24;
            float serration = uQualityLevel >= 1 ? 0.035 * sin(a * 16.0) : 0.0;
            float radius = 0.26 + lobeMain + lobeMid + lobeLow + serration;
            // Base échancrée en bas
            if (a > 2.25) radius *= mix(1.0, 0.22, smoothstep(2.25, 2.85, a));
            leafMask = 1.0 - smoothstep(radius - 0.04, radius + 0.04, r);
            edgeTan = smoothstep(radius * 0.65, radius, r);
            if (uQualityLevel >= 2) {
              float midrib = exp(-abs(q.x) * 45.0) * step(-0.2, q.y) * step(q.y, 0.65);
              float diagRib = exp(-abs(abs(q.x) - (q.y + 0.15) * 0.85) * 36.0) * step(-0.1, q.y) * step(q.y, 0.48);
              veinShade = max(midrib, diagRib * 0.7);
            }
          } else if (shapeType < 1.5) {
            // 1 : Feuille de chêne à lobes arrondis sinueux
            float t = clamp((p.y + 0.64) / 1.44, 0.0, 1.0);
            float env = sin(t * 3.14159) * (0.58 + 0.16 * sin(t * 3.14159));
            float lobes = 1.0 + 0.26 * sin(t * 21.0 - 0.4);
            float halfW = env * lobes * 0.66;
            float d = abs(p.x) - halfW;
            float yCap = max(-p.y - 0.64, p.y - 0.80);
            leafMask = (1.0 - smoothstep(-0.03, 0.04, d)) * (1.0 - smoothstep(-0.02, 0.03, yCap));
            edgeTan = smoothstep(halfW * 0.65, halfW, abs(p.x));
            if (uQualityLevel >= 2) {
              float midrib = exp(-abs(p.x) * 48.0) * step(0.02, t) * step(t, 0.94);
              float latRib = exp(-abs((t * 1.44 - abs(p.x) * 1.35) * 6.283 - floor(t * 9.0) * 1.0) * 14.0) * 0.35;
              veinShade = max(midrib, latRib * 0.5);
            }
          } else if (shapeType < 2.5) {
            // 2 : Feuille de bouleau / hêtre ovale pointue
            float t = clamp((p.y + 0.62) / 1.42, 0.0, 1.0);
            float env = pow(sin(t * 3.14159), 0.72) * (1.0 - 0.34 * t);
            float teeth = uQualityLevel >= 1 ? (1.0 + 0.06 * sin(t * 38.0)) : 1.0;
            float halfW = env * teeth * 0.56;
            float d = abs(p.x) - halfW;
            float yCap = max(-p.y - 0.62, p.y - 0.80);
            leafMask = (1.0 - smoothstep(-0.03, 0.04, d)) * (1.0 - smoothstep(-0.02, 0.03, yCap));
            edgeTan = smoothstep(halfW * 0.68, halfW, abs(p.x));
            if (uQualityLevel >= 2) {
              float midrib = exp(-abs(p.x) * 50.0) * step(0.02, t) * step(t, 0.94);
              veinShade = midrib;
            }
          } else {
            // 3 : Feuille allongée effilée (saule)
            float t = clamp((p.y + 0.72) / 1.56, 0.0, 1.0);
            float curveX = 0.08 * sin(t * 3.14159);
            float halfW = sin(t * 3.14159) * 0.28 * (1.0 - 0.2 * t);
            float d = abs(p.x - curveX) - halfW;
            float yCap = max(-p.y - 0.72, p.y - 0.84);
            leafMask = (1.0 - smoothstep(-0.03, 0.035, d)) * (1.0 - smoothstep(-0.02, 0.03, yCap));
            edgeTan = smoothstep(halfW * 0.65, halfW, abs(p.x - curveX));
            if (uQualityLevel >= 2) {
              veinShade = exp(-abs(p.x - curveX) * 55.0) * step(0.02, t) * step(t, 0.95);
            }
          }

          float totalMask = max(leafMask, stemMask);
          if (totalMask <= 0.01) discard;

          // Variations automnales internes (taches de séchage & bordure grillée sur HIGH/MEDIUM)
          vec3 col = vColor;
          if (uQualityLevel >= 1) {
            float mottle = 0.5 + 0.5 * sin(p.x * 6.5 + seed * 3.1) * cos(p.y * 5.8 - seed * 2.3);
            col = mix(col, col * vec3(0.72, 0.48, 0.30), edgeTan * 0.45 + mottle * 0.16);
          }

          // Nervure légèrement plus claire ou dorée
          col = mix(col, col * 0.68 + vec3(0.24, 0.14, 0.05), veinShade * 0.42);
          col = mix(col, vec3(0.32, 0.16, 0.08), stemMask * (1.0 - leafMask) * 0.75);

          // Ombrage 3D et légère translucidité rétro-éclairée lors du retournement
          float shade = mix(0.54, 1.24, lightExp);
          float rimWarmth = (1.0 - abs(lightExp - 0.5) * 2.0) * 0.16;
          col = col * shade * clamp(0.65 + 0.35 * uIntensity, 0.3, 1.8) + col * rimWarmth;

          gl_FragColor = vec4(col, clamp(totalMask * alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      this.seeds[i] = Math.random() * 800
      this.shapeTypes[i] = i % 4
      this.resetParticle(i, true)
    }

    this.assignAutumnPalette()
    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private assignAutumnPalette(): void {
    for (let i = 0; i < this.capacity; i++) {
      const r = Math.random()
      if (r < 0.32) {
        // Roux vibrant nuancé
        this.tempColor.copy(this.leafColor).lerp(this.altColor, Math.random() * 0.25)
      } else if (r < 0.6) {
        // Or automnal / ocre lumineux
        this.tempColor.copy(this.altColor).lerp(this.goldColor, Math.random() * 0.45)
      } else if (r < 0.82) {
        // Pourpre / érable rougeoyant
        this.tempColor.copy(this.crimsonColor).lerp(this.leafColor, Math.random() * 0.4)
      } else {
        // Bronze / feuille sèche brun-cuivré
        this.tempColor.copy(this.umberColor).lerp(this.altColor, Math.random() * 0.45)
      }

      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
    }
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 19.5
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 13.5 : 7.2 + Math.random() * 2.2
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4.8 * this.depthFactor)

    this.velocities[idx3] = this.windDrift * (0.45 + Math.random() * 0.35)
    this.velocities[idx3 + 1] = -(0.32 + Math.random() * 0.34) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.06

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    const spinSign = Math.random() < 0.5 ? 1 : -1
    this.rotVelocities[idx3] = spinSign * (0.65 + Math.random() * 1.4) * (0.45 + this.randomness)
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 2.2 * (0.45 + this.randomness)
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.3 * (0.45 + this.randomness)

    this.flutterPhases[i] = Math.random() * Math.PI * 2
    this.flutterFreqs[i] = 0.72 + Math.random() * 0.56
    this.baseScales[i] = 0.22 + Math.random() * 0.24
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.4)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0
    this.lightDir.set(this.lightSourceX * 4.0, this.lightSourceY * 4.0, 3.0).normalize()

    // Rafales globales cohérentes
    const macroGust =
      this.windDrift * (0.65 + 0.45 * Math.sin(time * 0.38) + 0.28 * Math.sin(time * 0.97 + 1.1))

    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const seed = this.seeds[i]

      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      // Balancement pendulaire aérodynamique couplé à l'inclinaison
      const swingPhase = time * this.flutterRate * this.flutterFreqs[i] + this.flutterPhases[i]
      const swing = Math.sin(swingPhase)
      const swingDeriv = Math.cos(swingPhase)

      // Rafales locales par Simplex 3D (HIGH/MEDIUM)
      let gustX = 0
      let gustY = 0
      if (isHigh) {
        gustX = simplex3D(px * 0.16, py * 0.14 + seed, time * 0.28) * 1.05 * this.gustStrength
        gustY =
          simplex3D(py * 0.16, pz * 0.14 + seed + 13.0, time * 0.22) * 0.38 * this.gustStrength
      } else if (!isLow) {
        gustX = simplex3D(px * 0.14 + seed, py * 0.12, time * 0.24) * 0.75 * this.gustStrength
      }

      // Calcul normal 3D pour portance et éclairement
      this.euler.set(this.rotations[idx3], this.rotations[idx3 + 1], this.rotations[idx3 + 2])
      this.leafNormal.set(0, 0, 1).applyEuler(this.euler)

      // Portance : plus la feuille est à plat face au flux vertical, plus elle plane doucement
      const flatness = Math.abs(this.leafNormal.y)
      const glideSlowdown = 0.55 + 0.65 * (1.0 - flatness)
      const tumbleBoost = 0.45 + 1.25 * (1.0 - flatness) + Math.abs(gustX) * 0.45

      // Répulsion interactive au passage de la souris (tourbillon d'air)
      let repulseX = 0
      let repulseY = 0
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      if (distSq < 6.8 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.6) * 1.35
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      // Inertie lissée sur les vitesses horizontale et verticale
      const targetVx = macroGust + gustX + swing * (0.75 + 0.35 * this.randomness) + repulseX * 1.4
      const targetVy =
        -(0.32 + 0.24 * (seed % 1)) * this.speed * glideSlowdown +
        Math.abs(swing) * 0.14 * this.speed +
        gustY +
        repulseY

      const drag = Math.min(1.0, delta * 3.2)
      this.velocities[idx3] += (targetVx - this.velocities[idx3]) * drag
      this.velocities[idx3 + 1] += (targetVy - this.velocities[idx3 + 1]) * drag

      this.positions[idx3] += this.velocities[idx3] * delta * 1.85 * this.surgeMultiplier
      this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta * 1.85 * this.surgeMultiplier
      this.positions[idx3 + 2] += Math.sin(swingPhase * 0.7) * 0.25 * delta * this.depthFactor

      if (this.positions[idx3 + 1] < -7.5) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 11.5) this.positions[idx3] = -11.5
      if (this.positions[idx3] < -11.5) this.positions[idx3] = 11.5

      // Culbute 3D couplée au balancement et aux rafales
      this.rotations[idx3] +=
        (this.rotVelocities[idx3] * tumbleBoost + swingDeriv * 0.65) * delta * this.surgeMultiplier
      this.rotations[idx3 + 1] +=
        (this.rotVelocities[idx3 + 1] * (0.7 + 0.5 * Math.abs(gustX)) + swing * 0.4) * delta
      this.rotations[idx3 + 2] += (this.rotVelocities[idx3 + 2] * 0.6 - swingDeriv * 0.55) * delta

      const lightExposure = THREE.MathUtils.clamp(
        0.5 + 0.5 * this.leafNormal.dot(this.lightDir),
        0,
        1
      )

      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.48, 1.26)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.58, 1.0)
      const topFade = 1.0 - THREE.MathUtils.smoothstep(this.positions[idx3 + 1], 6.0, 7.6)
      const bottomFade = THREE.MathUtils.smoothstep(this.positions[idx3 + 1], -7.5, -5.8)

      this.instanceColors[idx3] = this.baseColors[idx3] * depthOpacity
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1] * depthOpacity
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2] * depthOpacity

      this.instanceData[idx4] = Math.min(1.0, topFade * bottomFade * (0.85 + 0.15 * depthOpacity))
      this.instanceData[idx4 + 1] = isLow ? this.shapeTypes[i] % 2 : this.shapeTypes[i]
      this.instanceData[idx4 + 2] = lightExposure
      this.instanceData[idx4 + 3] = seed

      const scale = this.baseScales[i] * depthFactor
      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.set(
        this.rotations[idx3],
        this.rotations[idx3 + 1],
        this.rotations[idx3 + 2]
      )
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = this.activeCount; i < this.capacity; i++) {
      this.instanceData[i * 4] = 0
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
    const colorAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute
    if (colorAttr) colorAttr.needsUpdate = true
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    if (dataAttr) dataAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<LeavesProps>): void {
    let colorsChanged = false
    if (newProps.leafColor !== undefined) {
      this.leafColor.set(newProps.leafColor)
      colorsChanged = true
    }
    if (newProps.altColor !== undefined) {
      this.altColor.set(newProps.altColor)
      colorsChanged = true
    }
    if (colorsChanged) {
      this.assignAutumnPalette()
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.material) this.material.uniforms.uIntensity.value = this.intensity
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.flutterRate !== undefined) this.flutterRate = newProps.flutterRate
    if (newProps.windDrift !== undefined) this.windDrift = newProps.windDrift
    if (newProps.gustStrength !== undefined) this.gustStrength = newProps.gustStrength
    if (newProps.lightSourceX !== undefined) this.lightSourceX = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined) this.lightSourceY = newProps.lightSourceY

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(85 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(48 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(22 * this.density * mobileRatio))
    }

    if (this.material) {
      this.material.uniforms.uQualityLevel.value =
        quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
    this.surgeMultiplier = 2.2
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.7
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) {
        this.material.dispose()
        this.material = null
      }
      this.mesh = null
    }
  }
}

export const LeavesDefinition: IBrickDefinition<LeavesProps> = {
  type: 'leaves',
  category: 'particles',
  create: (id, props, context) => new LeavesInstance(id, props, context),
}

BrickRegistry.register(LeavesDefinition)
