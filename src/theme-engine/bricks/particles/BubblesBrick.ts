/**
 * src/theme-engine/bricks/particles/BubblesBrick.ts
 *
 * Brique de Particules : Bulles Aquatiques & Éclatement (Couche 3 : Particles).
 * Sphères sous-marines translucides avec reflets irisés spéculaires,
 * ascension oscillante en zig-zag sinueux, expansion graduelle due à la baisse
 * de pression hydrostatique, éclatement en surface et évitement de la souris.
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
import { getBubbleTexture } from './particleTextures'

export interface BubblesProps {
  /** Teinte du corps de la bulle (défaut: '#38bdf8'). */
  bubbleColor?: string
  /** Multiplicateur de densité/nombre de bulles (0.2 à 2.5, défaut: 1.0 -> 90 bulles). */
  density?: number
  /** Vitesse d'ascension verticale (0.1 à 2.0, défaut: 0.5). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Netteté et brillance du reflet spéculaire (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Variabilité des rayons et asymétrie (0.0 à 1.0, défaut: 0.4). */
  randomness?: number
  /** Amplitude du balancement sinusoïdal latéral (0.1 à 1.5, défaut: 0.4). */
  wobbleAmount?: number
  /** Taux de dilatation pendant l'ascension (0.5 à 2.0, défaut: 1.25). */
  expansionRate?: number
}

export class BubblesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'bubbles'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private initialX: Float32Array
  private velocities: Float32Array
  private wobbleFrequencies: Float32Array
  private wobblePhases: Float32Array
  private baseScales: Float32Array

  private bubbleColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private wobbleAmount: number
  private expansionRate: number

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: BubblesProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.bubbleColor = new THREE.Color(props.bubbleColor ?? '#38bdf8')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.5
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.4
    this.wobbleAmount = props.wobbleAmount ?? 0.4
    this.expansionRate = props.expansionRate ?? 1.25

    this.totalCount = Math.floor(90 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.initialX = new Float32Array(this.totalCount)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.wobbleFrequencies = new Float32Array(this.totalCount)
    this.wobblePhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getBubbleTexture(),
      color: this.bubbleColor,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      side: THREE.DoubleSide,
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
    const startX = (Math.random() - 0.5) * 16
    this.initialX[i] = startX
    this.positions[idx3] = startX
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 14 : -7.5 + Math.random() * 2.0
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    const sizeMult = 0.8 + Math.random() * 0.5
    this.velocities[idx3] = 0
    this.velocities[idx3 + 1] = (0.6 + Math.random() * 0.5) * this.speed
    this.velocities[idx3 + 2] = 0

    this.wobbleFrequencies[i] = (1.5 + Math.random() * 1.5) * (1.0 + this.randomness)
    this.wobblePhases[i] = Math.random() * Math.PI * 2
    this.baseScales[i] = (0.16 + Math.random() * 0.22) * sizeMult * this.intensity
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

      // Balancement sinusoïdal latéral
      const wobble =
        Math.sin(time * this.wobbleFrequencies[i] + this.wobblePhases[i]) * this.wobbleAmount

      // Répulsion interactive au passage de la souris
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

      this.positions[idx3] += (wobble * 0.4 + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + repulseY) * delta * 2.0 * this.surgeMultiplier

      // Éclatement au sommet (surface de l'eau)
      if (this.positions[idx3 + 1] > 7.5) {
        this.resetParticle(i, false)
        continue
      }

      // Dilatation hydrostatique en s'élevant (-7.5 -> +7.5)
      const heightNorm = THREE.MathUtils.clamp((this.positions[idx3 + 1] + 7.5) / 15.0, 0, 1)
      const expansion = 1.0 + heightNorm * (this.expansionRate - 1.0)

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.45, 1.25)
      const scale = this.baseScales[i] * expansion * depthFactor * this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.scale.set(scale, scale, scale)
      // Légère oscillation d'angle
      this.dummy.rotation.z = wobble * 0.5
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

  public updateProps(newProps: Partial<BubblesProps>): void {
    if (newProps.bubbleColor !== undefined) {
      this.bubbleColor.set(newProps.bubbleColor)
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).color.copy(this.bubbleColor)
      }
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.wobbleAmount !== undefined) this.wobbleAmount = newProps.wobbleAmount
    if (newProps.expansionRate !== undefined) this.expansionRate = newProps.expansionRate

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(90 * this.density * mobileFactor))
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
    // Éruption de bulles / geyser
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

export const BubblesDefinition: IBrickDefinition<BubblesProps> = {
  type: 'bubbles',
  category: 'particles',
  create: (id, props, context) => new BubblesInstance(id, props, context),
}

BrickRegistry.register(BubblesDefinition)
