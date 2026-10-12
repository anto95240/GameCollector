/**
 * src/theme-engine/bricks/particles/FirefliesBrick.ts
 *
 * Brique de Particules : Lucioles Nocturnes & Bioluminescence (Couche 3 : Particles).
 * Insectes lumineux aux trajectoires 3D imprévisibles (alternance de surplace
 * et d'accélérations fluides), pulsation biologique asynchrone respirante,
 * double aura lumineuse (cœur chaud + couronne diffuse) et curiosité envers la souris.
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
import { getFireflyTexture } from './particleTextures'

export interface FirefliesProps {
  /** Teinte de la couronne bioluminescente (défaut: '#a3e635'). */
  glowColor?: string
  /** Teinte du cœur incandescent de la luciole (défaut: '#fef08a'). */
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
}

export class FirefliesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'fireflies'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private targets: Float32Array
  private pulseOffsets: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array

  private glowColor: THREE.Color
  private coreColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private pulseFrequency: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
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

    this.totalCount = Math.floor(45 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.4) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.targets = new Float32Array(this.totalCount * 3)
    this.pulseOffsets = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getFireflyTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      const idx3 = i * 3
      this.positions[idx3] = (Math.random() - 0.5) * 16
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 12
      this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4 * this.depthFactor)

      this.targets[idx3] = this.positions[idx3]
      this.targets[idx3 + 1] = this.positions[idx3 + 1]
      this.targets[idx3 + 2] = this.positions[idx3 + 2]

      this.pulseOffsets[i] = Math.random() * Math.PI * 2
      this.baseScales[i] = (0.2 + Math.random() * 0.15) * this.intensity
      this.seeds[i] = Math.random() * 1000

      this.tempColor.copy(this.glowColor).lerp(this.coreColor, Math.random() * 0.4)
      this.mesh.setColorAt(i, this.tempColor)
    }

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

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const seed = this.seeds[i]

      // Biorhythme de vol : vol stationnaire avec embardées douces
      const vx = simplex3D(time * 0.25 * this.speed + seed, seed, 0) * 1.8 * this.randomness
      const vy = simplex3D(seed + 10.0, time * 0.22 * this.speed + seed, 0) * 1.4 * this.randomness
      const vz = simplex3D(0, seed + 20.0, time * 0.18 * this.speed) * 0.8 * this.randomness

      // Curiosité envers la souris (attraction douce si à distance moyenne, fuite si trop proche)
      const dx = mouseWorldX - this.positions[idx3]
      const dy = mouseWorldY - this.positions[idx3 + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      let steerX = 0
      let steerY = 0

      if (dist > 1.2 && dist < 6.0) {
        // Attirance douce
        steerX = (dx / dist) * 0.35
        steerY = (dy / dist) * 0.35
      } else if (dist <= 1.2 && dist > 0.05) {
        // Évitement d'urgence
        steerX = -(dx / dist) * 0.8
        steerY = -(dy / dist) * 0.8
      }

      this.positions[idx3] += (vx + steerX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] += (vy + steerY) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 2] += vz * delta * 2.0

      // Rebouclage doux
      if (this.positions[idx3 + 1] > 7.0) this.positions[idx3 + 1] = -7.0
      if (this.positions[idx3 + 1] < -7.0) this.positions[idx3 + 1] = 7.0
      if (this.positions[idx3] > 10.0) this.positions[idx3] = -10.0
      if (this.positions[idx3] < -10.0) this.positions[idx3] = 10.0

      // Rythme biologique respirant : flash asymétrique en cloche
      const phase = time * this.pulseFrequency + this.pulseOffsets[i]
      const flash = Math.pow(Math.max(0, Math.sin(phase)), 3.5)
      const pulseBrightness = 0.2 + 0.8 * flash

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.5, 1.25)
      const scale = this.baseScales[i] * pulseBrightness * depthFactor * this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = this.activeCount; i < this.totalCount; i++) {
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
  }

  public updateProps(newProps: Partial<FirefliesProps>): void {
    if (newProps.glowColor !== undefined) this.glowColor.set(newProps.glowColor)
    if (newProps.coreColor !== undefined) this.coreColor.set(newProps.coreColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.pulseFrequency !== undefined) this.pulseFrequency = newProps.pulseFrequency

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.4 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(45 * this.density * mobileFactor))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.4 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.floor(this.totalCount * mobileRatio)
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.floor(this.totalCount * 0.6 * mobileRatio)
    } else {
      this.activeCount = Math.floor(this.totalCount * 0.3 * mobileRatio)
    }
  }

  public triggerEvent(_event: RareEventTrigger): void {
    // Sursaut lumineux collectif des lucioles
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
    }
  }
}

export const FirefliesDefinition: IBrickDefinition<FirefliesProps> = {
  type: 'fireflies',
  category: 'particles',
  create: (id, props, context) => new FirefliesInstance(id, props, context),
}

BrickRegistry.register(FirefliesDefinition)
