/**
 * src/theme-engine/bricks/particles/SparksBrick.ts
 *
 * Brique de Particules : Étincelles & Gerbes Balistiques (Couche 3 : Particles).
 * Projections balistiques ultra-vives jaillissant par salves avec forte vélocité
 * initiale, trajectoires en cloche sous gravité parabolique, étirement directionnel
 * orienté selon le vecteur vitesse et extinction thermique fulgurante.
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
import { getSparkTexture } from './particleTextures'

export interface SparksProps {
  /** Teinte du panache d'étincelles (défaut: '#fef08a'). */
  sparkColor?: string
  /** Teinte du cœur incandescent blanc-chaud (défaut: '#ffffff'). */
  coreColor?: string
  /** Multiplicateur de densité/nombre d'étincelles (0.2 à 2.5, défaut: 1.0 -> 150 étincelles). */
  density?: number
  /** Vitesse d'éjection initiale (0.2 à 2.5, défaut: 1.2). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.4). */
  depth?: number
  /** Radiance et éclat lumineux (0.2 à 2.5, défaut: 1.4). */
  intensity?: number
  /** Dispersion angulaire du cône de jaillissement (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Force de gravité courbant la trajectoire (0.2 à 2.5, défaut: 1.2). */
  gravity?: number
  /** Cadence d'émission des salves d'étincelles (0.5 à 3.0, défaut: 1.5). */
  burstInterval?: number
}

export class SparksInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'sparks'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array

  private sparkColor: THREE.Color
  private coreColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private gravity: number
  private burstInterval: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: SparksProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.sparkColor = new THREE.Color(props.sparkColor ?? '#fef08a')
    this.coreColor = new THREE.Color(props.coreColor ?? '#ffffff')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 1.2
    this.depthFactor = props.depth ?? 0.4
    this.intensity = props.intensity ?? 1.4
    this.randomness = props.randomness ?? 0.5
    this.gravity = props.gravity ?? 1.2
    this.burstInterval = props.burstInterval ?? 1.5

    this.totalCount = Math.floor(150 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getSparkTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.resetParticle(i, true)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    // Origine d'émission : répartie en bas ou autour d'un foyer
    this.positions[idx3] = (Math.random() - 0.5) * 10
    this.positions[idx3 + 1] = -5.0 + (Math.random() - 0.5) * 2.0
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    // Éjection angulaire en cône ascendant
    const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7 * this.randomness
    const launchSpeed = (2.2 + Math.random() * 2.5) * this.speed

    this.velocities[idx3] = Math.cos(angle) * launchSpeed
    this.velocities[idx3 + 1] = Math.sin(angle) * launchSpeed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.5

    const maxLifeSec = (0.7 + Math.random() * 0.9) / this.burstInterval
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0
    this.baseScales[i] = (0.12 + Math.random() * 0.16) * this.intensity

    // Couleur très chaude
    this.tempColor.copy(this.sparkColor).lerp(this.coreColor, Math.random() * 0.5)
    this.mesh?.setColorAt(i, this.tempColor)
  }

  public init(): void {}

  public update(delta: number, _time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 2.0)
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

      // Gravité parabolique
      this.velocities[idx3 + 1] -= this.gravity * 9.8 * delta * 0.5

      // Répulsion interactive au passage rapide de la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 5.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.23) * 1.5
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      const vx = (this.velocities[idx3] + repulseX) * this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + repulseY) * this.surgeMultiplier

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta * 2.0

      const progress = this.life[i] / this.maxLife[i]
      // Éclair immédiat puis décroissance linéaire rapide
      const fade = Math.max(0, 1.0 - progress)

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.45, 1.25)
      const scale = this.baseScales[i] * fade * depthFactor * this.surgeMultiplier

      // Alignement du stretch dans la direction du mouvement
      const moveAngle = Math.atan2(vy, vx) - Math.PI / 2
      const speedMagnitude = Math.sqrt(vx * vx + vy * vy)
      const stretchY = scale * (1.0 + Math.min(speedMagnitude * 0.25, 2.0))
      const stretchX = scale * 0.7

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.z = moveAngle
      this.dummy.scale.set(stretchX, stretchY, 1)
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

  public updateProps(newProps: Partial<SparksProps>): void {
    if (newProps.sparkColor !== undefined) this.sparkColor.set(newProps.sparkColor)
    if (newProps.coreColor !== undefined) this.coreColor.set(newProps.coreColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.gravity !== undefined) this.gravity = newProps.gravity
    if (newProps.burstInterval !== undefined) this.burstInterval = newProps.burstInterval

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(150 * this.density * mobileFactor))
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
    // Explosion d'étincelles
    this.surgeMultiplier = 2.5
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 2.0
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

export const SparksDefinition: IBrickDefinition<SparksProps> = {
  type: 'sparks',
  category: 'particles',
  create: (id, props, context) => new SparksInstance(id, props, context),
}

BrickRegistry.register(SparksDefinition)
