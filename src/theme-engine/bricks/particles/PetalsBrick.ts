/**
 * src/theme-engine/bricks/particles/PetalsBrick.ts
 *
 * Brique de Particules : Pétales de Cerisier en Fleur / Sakura (Couche 3 : Particles).
 * Voletement soyeux et aérien de pétales délicats avec rotation 3D douce en spirale,
 * ondulation sinueuse sous la brise printanière, courbure organique galbée
 * et palette rose poudré nacré.
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
import { getPetalTexture } from './particleTextures'

export interface PetalsProps {
  /** Teinte dominante des pétales de fleur (défaut: '#fbcfe8'). */
  petalColor?: string
  /** Teinte accentuée plus vive pour le cœur (défaut: '#f472b6'). */
  accentColor?: string
  /** Multiplicateur de densité/nombre de pétales (0.2 à 2.5, défaut: 1.0 -> 110 pétales). */
  density?: number
  /** Vitesse de descente vaporeuse (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Douceur et éclat général (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Variabilité des tournoiements (0.0 à 1.0, défaut: 0.45). */
  randomness?: number
  /** Amplitude de vrille et courbure 3D (0.2 à 2.0, défaut: 1.0). */
  curlAmount?: number
  /** Vitesse de dérive latérale sous la brise (0.0 à 1.5, défaut: 0.4). */
  windSpeed?: number
}

export class PetalsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'petals'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private curlPhases: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array

  private petalColor: THREE.Color
  private accentColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private curlAmount: number
  private windSpeed: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: PetalsProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.petalColor = new THREE.Color(props.petalColor ?? '#fbcfe8')
    this.accentColor = new THREE.Color(props.accentColor ?? '#f472b6')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.45
    this.curlAmount = props.curlAmount ?? 1.0
    this.windSpeed = props.windSpeed ?? 0.4

    this.totalCount = Math.floor(110 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount * 3)
    this.rotVelocities = new Float32Array(this.totalCount * 3)
    this.curlPhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getPetalTexture(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.seeds[i] = Math.random() * 600
      this.resetParticle(i, true)

      // Nuances de rose et blanc
      this.tempColor.copy(this.petalColor).lerp(this.accentColor, Math.random() * 0.4)
      this.mesh.setColorAt(i, this.tempColor)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 18
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 14 : 8.0 + Math.random() * 2.5
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = this.windSpeed * 0.35
    this.velocities[idx3 + 1] = -(0.3 + Math.random() * 0.3) * this.speed
    this.velocities[idx3 + 2] = 0

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    this.rotVelocities[idx3] = (Math.random() - 0.5) * 1.5 * this.curlAmount
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 2.2 * this.curlAmount
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.2 * this.curlAmount

    this.curlPhases[i] = Math.random() * Math.PI * 2
    this.baseScales[i] = (0.16 + Math.random() * 0.16) * this.intensity
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

      // Mouvement hélicoïdal gracieux
      const spiral = Math.sin(time * 1.8 + this.curlPhases[i]) * 0.4
      const seed = this.seeds[i]
      const breeze =
        simplex3D(this.positions[idx3] * 0.15, time * 0.2, seed) * 0.3 * this.randomness

      // Répulsion interactive au passage du curseur
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 6.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.45) * 1.0
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      this.positions[idx3] +=
        (this.velocities[idx3] + spiral + breeze + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + repulseY) * delta * 2.0 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -8.0) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 12.0) this.positions[idx3] = -12.0
      if (this.positions[idx3] < -12.0) this.positions[idx3] = 12.0

      // Rotation 3D
      this.rotations[idx3] += this.rotVelocities[idx3] * delta
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.45, 1.25)
      const scale = this.baseScales[i] * depthFactor * this.surgeMultiplier

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

    for (let i = this.activeCount; i < this.totalCount; i++) {
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
  }

  public updateProps(newProps: Partial<PetalsProps>): void {
    if (newProps.petalColor !== undefined) this.petalColor.set(newProps.petalColor)
    if (newProps.accentColor !== undefined) this.accentColor.set(newProps.accentColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.curlAmount !== undefined) this.curlAmount = newProps.curlAmount
    if (newProps.windSpeed !== undefined) this.windSpeed = newProps.windSpeed

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(110 * this.density * mobileFactor))
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
    // Brise printanière tourbillonnante
    this.surgeMultiplier = 2.4
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.8
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

export const PetalsDefinition: IBrickDefinition<PetalsProps> = {
  type: 'petals',
  category: 'particles',
  create: (id, props, context) => new PetalsInstance(id, props, context),
}

BrickRegistry.register(PetalsDefinition)
