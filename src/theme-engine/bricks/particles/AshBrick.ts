/**
 * src/theme-engine/bricks/particles/AshBrick.ts
 *
 * Brique de Particules : Cendres Volcaniques & Suie (Couche 3 : Particles).
 * Résidus calcinés en flottaison lente, tournoiements et chutes erratiques
 * portées par des micro-courants d'air ascendants, avec rotation 3D asymétrique,
 * contraste feutré et profondeur atmosphérique.
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
import { getAshTexture } from './particleTextures'

export interface AshProps {
  /** Teinte dominante des flocons de cendre (défaut: '#64748b'). */
  ashColor?: string
  /** Teinte secondaire pour les particules de suie foncée (défaut: '#1e293b'). */
  darkColor?: string
  /** Multiplicateur de densité/nombre de particules (0.2 à 2.5, défaut: 1.0 -> 160 particules). */
  density?: number
  /** Vitesse moyenne de descente (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Opacité et contraste général des cendres (0.2 à 2.0, défaut: 0.85). */
  intensity?: number
  /** Turbulence et basculements aléatoires (0.0 à 1.0, défaut: 0.6). */
  randomness?: number
  /** Dérive horizontale globale du vent (0.0 à 1.0, défaut: 0.25). */
  drift?: number
}

export class AshInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'ash'

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
  private baseSeeds: Float32Array

  private ashColor: THREE.Color
  private darkColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private drift: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: AshProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.ashColor = new THREE.Color(props.ashColor ?? '#64748b')
    this.darkColor = new THREE.Color(props.darkColor ?? '#1e293b')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 0.85
    this.randomness = props.randomness ?? 0.6
    this.drift = props.drift ?? 0.25

    this.totalCount = Math.floor(160 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount * 3)
    this.rotVelocities = new Float32Array(this.totalCount * 3)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.baseSeeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getAshTexture(),
      transparent: true,
      depthWrite: false,
      opacity: this.intensity,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.baseSeeds[i] = Math.random() * 500
      this.resetParticle(i, true)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 18
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 14 : 7.5 + Math.random() * 2.0
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = this.drift * 0.3 + (Math.random() - 0.5) * 0.15
    this.velocities[idx3 + 1] = -(0.3 + Math.random() * 0.4) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.05

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    this.rotVelocities[idx3] = (Math.random() - 0.5) * 1.5 * this.randomness
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 1.8 * this.randomness
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.2 * this.randomness

    const maxLifeSec = 6.0 + Math.random() * 5.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0
    this.baseScales[i] = (0.1 + Math.random() * 0.22) * this.intensity

    // Couleur panachée (suie foncée ou cendre claire)
    const ratio = Math.random()
    this.tempColor.copy(this.ashColor).lerp(this.darkColor, ratio)
    if (this.mesh) {
      this.mesh.setColorAt(i, this.tempColor)
    }
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

      // Turbulence et courants d'air ascendants
      const seed = this.baseSeeds[i]
      const turb = simplex3D(px * 0.2, py * 0.2 + seed, time * 0.25)
      const updraft = Math.max(0, simplex3D(px * 0.15, time * 0.2, pz * 0.15)) * 0.35

      // Répulsion du vent de souris
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

      const vx =
        (this.velocities[idx3] + turb * this.randomness * 0.4 + repulseX) * this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + updraft + repulseY) * this.surgeMultiplier
      const vz = this.velocities[idx3 + 2]

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += vz * delta * 2.0

      if (this.positions[idx3 + 1] < -8.0) {
        this.resetParticle(i, false)
        continue
      }

      // Rotation 3D (tumbling) simulant un flocon léger
      this.rotations[idx3] += this.rotVelocities[idx3] * delta
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.45, 1.2)
      const alphaScale = Math.sin(progress * Math.PI)
      const scale = this.baseScales[i] * alphaScale * depthFactor * this.surgeMultiplier

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
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
    }
  }

  public updateProps(newProps: Partial<AshProps>): void {
    if (newProps.ashColor !== undefined) this.ashColor.set(newProps.ashColor)
    if (newProps.darkColor !== undefined) this.darkColor.set(newProps.darkColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = this.intensity
      }
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.drift !== undefined) this.drift = newProps.drift

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(160 * this.density * mobileFactor))
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

export const AshDefinition: IBrickDefinition<AshProps> = {
  type: 'ash',
  category: 'particles',
  create: (id, props, context) => new AshInstance(id, props, context),
}

BrickRegistry.register(AshDefinition)
