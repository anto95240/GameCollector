/**
 * src/theme-engine/bricks/particles/SmokeBrick.ts
 *
 * Brique de Particules : Volutes de Fumée Vaporeuses (Couche 3 : Particles).
 * Volutes de fumée expansives naissant compactes puis gonflant en s'élevant,
 * avec tournoiements de vortex lents, dissipation progressive par perte d'opacité,
 * convection thermique ascendante et sillage d'évitement doux au pointeur.
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
import { getSmokeTexture } from './particleTextures'

export interface SmokeProps {
  /** Teinte dominante de la fumée vaporeuse (défaut: '#64748b'). */
  smokeColor?: string
  /** Teinte secondaire d'ombrage interne (défaut: '#334155'). */
  tintColor?: string
  /** Multiplicateur de densité/nombre de volutes (0.2 à 2.5, défaut: 1.0 -> 60 volutes). */
  density?: number
  /** Vitesse d'ascension lente (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.45). */
  depth?: number
  /** Opacité générale des volutes vaporeuses (0.2 à 2.0, défaut: 0.7). */
  intensity?: number
  /** Turbulence chaotique et dispersion des vortex (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Facteur d'expansion des volutes au fil de leur vie (0.5 à 2.5, défaut: 1.4). */
  expansionRate?: number
  /** Cadence d'estompement et dissipation (0.5 à 2.0, défaut: 1.0). */
  dissipationSpeed?: number
}

export class SmokeInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'smoke'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array

  private smokeColor: THREE.Color
  private tintColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private expansionRate: number
  private dissipationSpeed: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: SmokeProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.smokeColor = new THREE.Color(props.smokeColor ?? '#64748b')
    this.tintColor = new THREE.Color(props.tintColor ?? '#334155')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.45
    this.intensity = props.intensity ?? 0.7
    this.randomness = props.randomness ?? 0.5
    this.expansionRate = props.expansionRate ?? 1.4
    this.dissipationSpeed = props.dissipationSpeed ?? 1.0

    this.totalCount = Math.floor(60 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.4) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount)
    this.rotVelocities = new Float32Array(this.totalCount)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getSmokeTexture(),
      transparent: true,
      depthWrite: false,
      opacity: this.intensity,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.seeds[i] = Math.random() * 500
      this.resetParticle(i, true)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    // Émission concentrée en bas au centre ou légèrement décalée
    this.positions[idx3] = (Math.random() - 0.5) * 12
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 14 : -7.5 + Math.random() * 2.0
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = (Math.random() - 0.5) * 0.15 * this.randomness
    this.velocities[idx3 + 1] = (0.4 + Math.random() * 0.4) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.05

    this.rotations[i] = Math.random() * Math.PI * 2
    this.rotVelocities[i] = (Math.random() - 0.5) * 0.3 * this.randomness

    const maxLifeSec = (5.0 + Math.random() * 4.0) / this.dissipationSpeed
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0
    this.baseScales[i] = (0.6 + Math.random() * 0.5) * this.intensity

    // Couleur nuancée
    this.tempColor.copy(this.smokeColor).lerp(this.tintColor, Math.random() * 0.5)
    this.mesh?.setColorAt(i, this.tempColor)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.2)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const progress = this.life[i] / this.maxLife[i]
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      // Turbulence douce par Simplex 3D
      const seed = this.seeds[i]
      const turbX = simplex3D(px * 0.15, py * 0.15 + seed, time * 0.15) * 0.4 * this.randomness
      const turbY = simplex3D(py * 0.15, pz * 0.15 + seed, time * 0.12) * 0.2 * this.randomness

      // Répulsion douce au passage de la souris
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 7.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.65) * 0.9
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      const vx = (this.velocities[idx3] + turbX + repulseX) * this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + turbY + repulseY) * this.surgeMultiplier

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta * 2.0

      if (this.positions[idx3 + 1] > 8.5) {
        this.resetParticle(i, false)
        continue
      }

      // Rotation de vortex lente
      this.rotations[i] += this.rotVelocities[i] * delta

      // Expansion avec l'âge (x1 au départ -> x2.5 en fin de vie)
      const expansion = 1.0 + progress * (this.expansionRate * 1.5)
      // Évanouissement doux : montée rapide, puis dissipation progressive
      const alphaFalloff = Math.sin(Math.pow(progress, 0.6) * Math.PI)

      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.5, 1.25)
      const scale =
        this.baseScales[i] * expansion * alphaFalloff * depthFactor * this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.z = this.rotations[i]
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
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
    }
  }

  public updateProps(newProps: Partial<SmokeProps>): void {
    if (newProps.smokeColor !== undefined) this.smokeColor.set(newProps.smokeColor)
    if (newProps.tintColor !== undefined) this.tintColor.set(newProps.tintColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = this.intensity
      }
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.expansionRate !== undefined) this.expansionRate = newProps.expansionRate
    if (newProps.dissipationSpeed !== undefined) this.dissipationSpeed = newProps.dissipationSpeed

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.4 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(60 * this.density * mobileFactor))
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
    // Volute soudaine / bouffée de fumée
    this.surgeMultiplier = 2.2
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.7
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

export const SmokeDefinition: IBrickDefinition<SmokeProps> = {
  type: 'smoke',
  category: 'particles',
  create: (id, props, context) => new SmokeInstance(id, props, context),
}

BrickRegistry.register(SmokeDefinition)
