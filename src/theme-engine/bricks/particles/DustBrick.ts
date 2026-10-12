/**
 * src/theme-engine/bricks/particles/DustBrick.ts
 *
 * Brique de Particules : Poussière en Suspension & Motes Dorées (Couche 3 : Particles).
 * Particules microscopiques dérivant en quasi-apesanteur dans les rais de lumière,
 * animées par un mouvement brownien à très basse fréquence (Simplex 3D),
 * avec scintillement doux non-périodique et répulsion feutrée au passage de la souris.
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
import { getSoftCircleTexture } from './particleTextures'

export interface DustProps {
  /** Teinte lumineuse des grains de poussière (défaut: '#fef08a'). */
  dustColor?: string
  /** Multiplicateur de densité/nombre de motes (0.2 à 2.5, défaut: 1.0 -> 180 motes). */
  density?: number
  /** Vitesse de dérive lente (0.05 à 1.5, défaut: 0.2). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Brillance et radiance des reflets (0.2 à 2.0, défaut: 1.1). */
  intensity?: number
  /** Amplitude de dispersion brownienne (0.0 à 1.0, défaut: 0.4). */
  randomness?: number
  /** Fréquence du scintillement d'entrée/sortie de lumière (0.5 à 3.0, défaut: 1.2). */
  twinkleSpeed?: number
}

export class DustInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'dust'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private baseScales: Float32Array
  private phases: Float32Array
  private seeds: Float32Array

  private dustColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private twinkleSpeed: number

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: DustProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.dustColor = new THREE.Color(props.dustColor ?? '#fef08a')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.2
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.1
    this.randomness = props.randomness ?? 0.4
    this.twinkleSpeed = props.twinkleSpeed ?? 1.2

    this.totalCount = Math.floor(180 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.baseScales = new Float32Array(this.totalCount)
    this.phases = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getSoftCircleTexture(),
      color: this.dustColor,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      const idx3 = i * 3
      this.positions[idx3] = (Math.random() - 0.5) * 18
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 14
      this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (5 * this.depthFactor)
      this.baseScales[i] = (0.04 + Math.random() * 0.08) * this.intensity
      this.phases[i] = Math.random() * Math.PI * 2
      this.seeds[i] = Math.random() * 1000
    }

    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.0)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const seed = this.seeds[i]

      // Dérive brownienne par Simplex 3D
      const nx = simplex3D(this.positions[idx3] * 0.15, time * 0.15 * this.speed, seed)
      const ny = simplex3D(
        this.positions[idx3 + 1] * 0.15 + seed,
        time * 0.12 * this.speed,
        seed + 5.0
      )
      const nz = simplex3D(seed, this.positions[idx3 + 2] * 0.15, time * 0.1 * this.speed)

      // Répulsion feutrée au passage de la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 5.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.23) * 0.6
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      this.positions[idx3] +=
        (nx * this.randomness * 0.5 + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (ny * this.randomness * 0.4 + 0.05 * this.speed + repulseY) *
        delta *
        2.0 *
        this.surgeMultiplier
      this.positions[idx3 + 2] += nz * this.randomness * 0.2 * delta * 2.0

      // Re-bouclage aux frontières
      if (this.positions[idx3 + 1] > 8.0) this.positions[idx3 + 1] = -8.0
      if (this.positions[idx3 + 1] < -8.0) this.positions[idx3 + 1] = 8.0
      if (this.positions[idx3] > 11.0) this.positions[idx3] = -11.0
      if (this.positions[idx3] < -11.0) this.positions[idx3] = 11.0

      // Scintillement organique
      const twinkle = 0.5 + 0.5 * Math.sin(time * this.twinkleSpeed * 1.5 + this.phases[i])
      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.4, 1.2)
      const scale = this.baseScales[i] * twinkle * depthFactor * this.surgeMultiplier

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

  public updateProps(newProps: Partial<DustProps>): void {
    if (newProps.dustColor !== undefined) {
      this.dustColor.set(newProps.dustColor)
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).color.copy(this.dustColor)
      }
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.twinkleSpeed !== undefined) this.twinkleSpeed = newProps.twinkleSpeed

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(180 * this.density * mobileFactor))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.floor(this.totalCount * mobileRatio)
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.floor(this.totalCount * 0.55 * mobileRatio)
    } else {
      this.activeCount = Math.floor(this.totalCount * 0.25 * mobileRatio)
    }
  }

  public triggerEvent(_event: RareEventTrigger): void {
    this.surgeMultiplier = 2.0
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.6
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

export const DustDefinition: IBrickDefinition<DustProps> = {
  type: 'dust',
  category: 'particles',
  create: (id, props, context) => new DustInstance(id, props, context),
}

BrickRegistry.register(DustDefinition)
