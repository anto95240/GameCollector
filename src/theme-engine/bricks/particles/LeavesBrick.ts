/**
 * src/theme-engine/bricks/particles/LeavesBrick.ts
 *
 * Brique de Particules : Feuilles Mortes & Tourbillons d'Automne (Couche 3 : Particles).
 * Feuilles automnales tourbillonnant avec modélisation aérodynamique de chute libre
 * (glissade, portance, décrochage et tumbling 3D sur les 3 axes), panachage
 * chromatique riche (roux, or, pourpre, ocre) et rafales interactives.
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
import { getLeafTexture } from './particleTextures'

export interface LeavesProps {
  /** Teinte dominante des feuilles rousses (défaut: '#ea580c'). */
  leafColor?: string
  /** Teinte secondaire pour les feuilles dorées (défaut: '#ca8a04'). */
  altColor?: string
  /** Multiplicateur de densité/nombre de feuilles (0.2 à 2.5, défaut: 1.0 -> 80 feuilles). */
  density?: number
  /** Vitesse moyenne de chute (0.1 à 2.0, défaut: 0.4). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Saturation et éclat général (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Turbulence des rafales de vent (0.0 à 1.0, défaut: 0.55). */
  randomness?: number
  /** Fréquence des oscillations de battement d'aile (0.5 à 3.0, défaut: 1.6). */
  flutterRate?: number
  /** Dérive globale sous le vent horizontal (0.0 à 1.5, défaut: 0.5). */
  windDrift?: number
}

export class LeavesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'leaves'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private flutterPhases: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array

  private leafColor: THREE.Color
  private altColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private flutterRate: number
  private windDrift: number

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
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

    this.totalCount = Math.floor(80 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount * 3)
    this.rotVelocities = new Float32Array(this.totalCount * 3)
    this.flutterPhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getLeafTexture(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const crimson = new THREE.Color('#b91c1c')

    for (let i = 0; i < this.totalCount; i++) {
      this.seeds[i] = Math.random() * 800
      this.resetParticle(i, true)

      // Panachage automnal
      const r = Math.random()
      if (r < 0.45) {
        this.tempColor.copy(this.leafColor)
      } else if (r < 0.8) {
        this.tempColor.copy(this.altColor)
      } else {
        this.tempColor.copy(crimson)
      }
      this.mesh.setColorAt(i, this.tempColor)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 18
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 14 : 8.0 + Math.random() * 2.5
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = this.windDrift * 0.4
    this.velocities[idx3 + 1] = -(0.35 + Math.random() * 0.35) * this.speed
    this.velocities[idx3 + 2] = 0

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    this.rotVelocities[idx3] = (Math.random() - 0.5) * 2.0 * this.randomness
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 2.5 * this.randomness
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.8 * this.randomness

    this.flutterPhases[i] = Math.random() * Math.PI * 2
    this.baseScales[i] = (0.2 + Math.random() * 0.18) * this.intensity
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

      // Battement d'aile & portance oscillante
      const flutter = Math.sin(time * this.flutterRate + this.flutterPhases[i])
      const glideLift = Math.abs(flutter) * 0.25 // Ralentit la chute lors de la glissade
      const seed = this.seeds[i]
      const gust = simplex3D(this.positions[idx3] * 0.15, time * 0.25, seed) * 0.4 * this.randomness

      // Répulsion de la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 7.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.65) * 1.1
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      this.positions[idx3] +=
        (this.velocities[idx3] + flutter * 0.6 + gust + repulseX) *
        delta *
        2.0 *
        this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + glideLift + repulseY) * delta * 2.0 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -8.0) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 12.0) this.positions[idx3] = -12.0
      if (this.positions[idx3] < -12.0) this.positions[idx3] = 12.0

      // Tumbling 3D
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

  public updateProps(newProps: Partial<LeavesProps>): void {
    if (newProps.leafColor !== undefined) this.leafColor.set(newProps.leafColor)
    if (newProps.altColor !== undefined) this.altColor.set(newProps.altColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.flutterRate !== undefined) this.flutterRate = newProps.flutterRate
    if (newProps.windDrift !== undefined) this.windDrift = newProps.windDrift

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(80 * this.density * mobileFactor))
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
    // Rafale de vent automnale
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

export const LeavesDefinition: IBrickDefinition<LeavesProps> = {
  type: 'leaves',
  category: 'particles',
  create: (id, props, context) => new LeavesInstance(id, props, context),
}

BrickRegistry.register(LeavesDefinition)
