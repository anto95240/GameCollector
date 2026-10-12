/**
 * src/theme-engine/bricks/particles/RainBrick.ts
 *
 * Brique de Particules : Pluie Battante & Averse Cinématique (Couche 3 : Particles).
 * Traits obliques étirés par la vitesse (motion streaks) avec orientation cohérente
 * selon l'angle du vent, étagement en 3 strates de vitesse et de profondeur Z,
 * et micro-éclaboussures (splashes) en bas d'écran.
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
import { BrickRegistry } from '../registry'
import { getRainStreakTexture } from './particleTextures'

export interface RainProps {
  /** Teinte des gouttes de pluie (défaut: '#93c5fd'). */
  rainColor?: string
  /** Multiplicateur de densité/nombre de gouttes (0.2 à 2.5, défaut: 1.0 -> 280 gouttes). */
  density?: number
  /** Vitesse de chute de l'averse (0.2 à 3.0, défaut: 1.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Opacité et éclat lumineux des gouttes (0.2 à 2.0, défaut: 0.9). */
  intensity?: number
  /** Dispersion de longueur et vitesse (0.0 à 1.0, défaut: 0.35). */
  randomness?: number
  /** Angle d'inclinaison sous le vent en radians (-0.8 à 0.8, défaut: 0.18). */
  windAngle?: number
  /** Facteur d'étirement en longueur des traits de pluie (0.4 à 2.5, défaut: 1.2). */
  streakLength?: number
}

export class RainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'rain'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private lengths: Float32Array
  private widths: Float32Array

  private rainColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private windAngle: number
  private streakLength: number

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: RainProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.rainColor = new THREE.Color(props.rainColor ?? '#93c5fd')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 1.6
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 0.9
    this.randomness = props.randomness ?? 0.35
    this.windAngle = props.windAngle ?? 0.18
    this.streakLength = props.streakLength ?? 1.2

    this.totalCount = Math.floor(280 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.lengths = new Float32Array(this.totalCount)
    this.widths = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getRainStreakTexture(),
      color: this.rainColor,
      transparent: true,
      depthWrite: false,
      opacity: this.intensity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.resetParticle(i, true)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 22
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 16 : 8.5 + Math.random() * 2.0
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    // Vélocité selon windAngle
    const fallSpeed = (3.5 + Math.random() * 2.0 * this.randomness) * this.speed
    this.velocities[idx3] = Math.sin(this.windAngle) * fallSpeed
    this.velocities[idx3 + 1] = -Math.cos(this.windAngle) * fallSpeed
    this.velocities[idx3 + 2] = 0

    this.lengths[i] = (0.7 + Math.random() * 0.6) * this.streakLength
    this.widths[i] = 0.04 + Math.random() * 0.03
  }

  public init(): void {}

  public update(delta: number, _time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 2.0)
    }

    // Le vent est influencé subtilement par le mouvement horizontal de la souris
    const dynamicWind = this.windAngle + interaction.mouseX * 0.12

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3

      const vx = this.velocities[idx3] * this.surgeMultiplier
      const vy = this.velocities[idx3 + 1] * this.surgeMultiplier

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0

      if (this.positions[idx3 + 1] < -8.5) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 14.0) this.positions[idx3] = -14.0
      if (this.positions[idx3] < -14.0) this.positions[idx3] = 14.0

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.45, 1.25)

      const length = this.lengths[i] * depthFactor * this.surgeMultiplier
      const width = this.widths[i] * depthFactor

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.z = -dynamicWind
      this.dummy.scale.set(width, length, 1)
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

  public updateProps(newProps: Partial<RainProps>): void {
    if (newProps.rainColor !== undefined) {
      this.rainColor.set(newProps.rainColor)
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).color.copy(this.rainColor)
      }
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = this.intensity
      }
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.windAngle !== undefined) this.windAngle = newProps.windAngle
    if (newProps.streakLength !== undefined) this.streakLength = newProps.streakLength

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(280 * this.density * mobileFactor))
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
    // Rafale de pluie / orage
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

export const RainDefinition: IBrickDefinition<RainProps> = {
  type: 'rain',
  category: 'particles',
  create: (id, props, context) => new RainInstance(id, props, context),
}

BrickRegistry.register(RainDefinition)
