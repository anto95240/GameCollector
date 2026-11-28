/**
 * src/theme-engine/bricks/particles/FirefliesBrick.ts
 *
 * Brique de Particules : Lucioles Nocturnes & Bioluminescence (Couche 3 : Particles).
 * Petits insectes nocturnes à lueur jaune-vert entourée d'un halo doux, clignotement pulsé
 * individuel asynchrone (montée rapide, extinction douce, pauses sombres entre flashs),
 * trajectoires erratiques mais lisses (inertie directionnelle + vol stationnaire)
 * et rendu ShaderMaterial GPU sans allocation par frame.
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

export interface FirefliesProps {
  /** Teinte de la couronne bioluminescente jaune-vert (défaut: '#a3e635'). */
  glowColor?: string
  /** Teinte du cœur lumineux de la luciole (défaut: '#fef08a'). */
  coreColor?: string
  /** Multiplicateur de densité/nombre de lucioles (0.2 à 2.5, défaut: 1.0 -> 45 lucioles). */
  density?: number
  /** Vitesse et vivacité de vol (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.45). */
  depth?: number
  /** Éclat lumineux de crête (0.2 à 2.0, défaut: 1.3). */
  intensity?: number
  /** Imprévisibilité des virages et trajectoires (0.0 à 1.0, défaut: 0.55). */
  randomness?: number
  /** Fréquence du rythme biologique de pulsation (0.5 à 3.0, défaut: 1.4). */
  pulseFrequency?: number
  /** Fraction du cycle pendant laquelle la luciole reste allumée (0.15 à 0.8, défaut: 0.35). */
  pulseDutyCycle?: number
}

export class FirefliesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'fireflies'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private pulseOffsets: Float32Array
  private pulsePeriods: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array
  private instanceData: Float32Array // [pulseIntensity, depthAlpha, seed, unused]

  private glowColor: THREE.Color
  private coreColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private pulseFrequency: number
  private pulseDutyCycle: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: FirefliesProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.glowColor = new THREE.Color(props.glowColor ?? '#a3e635')
    this.coreColor = new THREE.Color(props.coreColor ?? '#fef08a')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.45
    this.intensity = props.intensity ?? 1.3
    this.randomness = props.randomness ?? 0.55
    this.pulseFrequency = props.pulseFrequency ?? 1.4
    this.pulseDutyCycle = THREE.MathUtils.clamp(props.pulseDutyCycle ?? 0.35, 0.15, 0.8)
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(60, Math.floor(45 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(45 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.pulseOffsets = new Float32Array(this.capacity)
    this.pulsePeriods = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: this.glowColor },
        uCoreColor: { value: this.coreColor },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGlowColor;
        uniform vec3 uCoreColor;
        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float pulse = vData.x;
          float depthAlpha = vData.y;

          if (pulse <= 0.008 || depthAlpha <= 0.004) discard;

          float r = length(p);
          if (r > 1.0) discard;

          // Petit cœur net bioluminescent + halo doux étendu
          float core = exp(-r * r * 36.0) * (0.25 + 0.95 * pulse);
          float innerGlow = exp(-r * r * 9.5) * (0.12 + 0.65 * pulse);
          float softHalo = exp(-r * r * 3.6) * (1.0 - smoothstep(0.65, 1.0, r)) * (0.04 + 0.36 * pulse);

          vec3 col = mix(uGlowColor, uCoreColor, clamp(core * 1.1 + innerGlow * 0.35, 0.0, 1.0));
          float energy = (core + innerGlow + softHalo) * depthAlpha;

          gl_FragColor = vec4(col * energy, clamp(energy, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      const idx3 = i * 3
      this.positions[idx3] = (Math.random() - 0.5) * 15
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 10
      this.positions[idx3 + 2] = -9 * this.depthFactor + Math.random() * (4.5 * this.depthFactor)

      this.velocities[idx3] = (Math.random() - 0.5) * 0.25
      this.velocities[idx3 + 1] = (Math.random() - 0.5) * 0.2
      this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.08

      // Phases et périodes propres à chaque luciole
      this.pulseOffsets[i] = Math.random()
      this.pulsePeriods[i] = 2.6 + Math.random() * 3.4
      // Petites tailles réalistes (quad incluant le halo doux)
      this.baseScales[i] = 0.14 + Math.random() * 0.11
      this.seeds[i] = Math.random() * 1000
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.5)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    const isLow = this.currentQuality === 'LOW'
    const smoothLerp = 1.0 - Math.exp(-delta * 3.2)
    const freqScale = Math.max(0.35, this.pulseFrequency / 1.4)

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const seed = this.seeds[i]

      // Trajectoire erratique mais lisse avec inertie + alternance vol / surplace doux
      const hoverWave = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.45 + seed * 1.7))
      let targetVx = 0
      let targetVy = 0
      let targetVz = 0

      if (!isLow) {
        const t = time * 0.32 * this.speed
        targetVx =
          simplex3D(t + seed, seed * 0.5, this.positions[idx3 + 1] * 0.15) *
          1.35 *
          this.randomness *
          hoverWave
        targetVy =
          simplex3D(seed + 11.0, t + seed, this.positions[idx3] * 0.15) *
          1.05 *
          this.randomness *
          hoverWave
        targetVz = simplex3D(0, seed + 23.0, t * 0.8) * 0.45 * this.randomness
      } else {
        const t = time * 0.55 * this.speed
        targetVx = Math.sin(t + seed) * 0.9 * this.randomness
        targetVy = Math.cos(t * 0.83 + seed * 1.4) * 0.7 * this.randomness
      }

      // Curiosité envers la souris (attraction douce ou évitement si très proche)
      if (!isLow) {
        const dx = mouseWorldX - this.positions[idx3]
        const dy = mouseWorldY - this.positions[idx3 + 1]
        const distSq = dx * dx + dy * dy
        if (distSq > 1.44 && distSq < 36.0) {
          const dist = Math.sqrt(distSq)
          targetVx += (dx / dist) * 0.32
          targetVy += (dy / dist) * 0.32
        } else if (distSq <= 1.44 && distSq > 0.0025) {
          const dist = Math.sqrt(distSq)
          targetVx -= (dx / dist) * 0.65
          targetVy -= (dy / dist) * 0.65
        }
      }

      // Lissage inertiel de la vitesse -> virages fluides et courbes organiques
      this.velocities[idx3] += (targetVx - this.velocities[idx3]) * smoothLerp
      this.velocities[idx3 + 1] += (targetVy - this.velocities[idx3 + 1]) * smoothLerp
      this.velocities[idx3 + 2] += (targetVz - this.velocities[idx3 + 2]) * smoothLerp

      this.positions[idx3] += this.velocities[idx3] * delta * 1.8 * this.surgeMultiplier
      this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta * 1.8 * this.surgeMultiplier
      this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta * 1.4

      if (this.positions[idx3 + 1] > 6.5) this.positions[idx3 + 1] = -6.5
      if (this.positions[idx3 + 1] < -6.5) this.positions[idx3 + 1] = 6.5
      if (this.positions[idx3] > 9.5) this.positions[idx3] = -9.5
      if (this.positions[idx3] < -9.5) this.positions[idx3] = 9.5

      // Clignotement pulsé biologique propre à chaque luciole :
      // phase de montée rapide, décroissance douce puis repos sombre
      const period = this.pulsePeriods[i] / freqScale
      const cyclePos = (((time / period + this.pulseOffsets[i]) % 1.0) + 1.0) % 1.0
      let flash = 0.0
      if (cyclePos < this.pulseDutyCycle) {
        const u = cyclePos / this.pulseDutyCycle
        const rise = THREE.MathUtils.smoothstep(u, 0.0, 0.22)
        const decay = Math.pow(Math.max(0.0, 1.0 - (u - 0.15) / 0.85), 1.75)
        flash = u < 0.15 ? rise : rise * decay
      }

      const pulseIntensity = Math.min(1.4, (0.03 + 0.97 * flash) * (0.65 + 0.35 * this.intensity))

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -9 * this.depthFactor, 2, 0.6, 1.2)
      const depthAlpha = THREE.MathUtils.mapLinear(pz, -9 * this.depthFactor, 2, 0.48, 1.0)

      this.instanceData[idx4] = pulseIntensity
      this.instanceData[idx4 + 1] = depthAlpha
      this.instanceData[idx4 + 2] = seed
      this.instanceData[idx4 + 3] = 0

      // Le halo s'épanouit légèrement pendant le flash sans réduire la luciole à zéro
      const scale =
        this.baseScales[i] *
        (0.65 + 0.55 * flash) *
        Math.min(1.4, 0.65 + 0.35 * this.intensity) *
        depthFactor *
        this.surgeMultiplier

      this.dummy.position.set(this.positions[idx3], this.positions[idx3 + 1], pz)
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.count = this.activeCount
    this.mesh.instanceMatrix.needsUpdate = true
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    dataAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<FirefliesProps>): void {
    if (newProps.glowColor !== undefined) this.glowColor.set(newProps.glowColor)
    if (newProps.coreColor !== undefined) this.coreColor.set(newProps.coreColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.pulseFrequency !== undefined) this.pulseFrequency = newProps.pulseFrequency
    if (newProps.pulseDutyCycle !== undefined) {
      this.pulseDutyCycle = THREE.MathUtils.clamp(newProps.pulseDutyCycle, 0.15, 0.8)
    }

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.4 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(45 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(27 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(14 * this.density * mobileRatio))
    }

    if (this.mesh) {
      this.mesh.count = this.activeCount
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
    this.surgeMultiplier = 1.9
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach((m) => m.dispose())
        } else {
          this.mesh.material.dispose()
        }
      }
      this.mesh = null
      this.material = null
    }
  }
}

export const FirefliesDefinition: IBrickDefinition<FirefliesProps> = {
  type: 'fireflies',
  category: 'particles',
  create: (id, props, context) => new FirefliesInstance(id, props, context),
}

BrickRegistry.register(FirefliesDefinition)
