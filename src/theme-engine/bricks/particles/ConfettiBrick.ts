/**
 * src/theme-engine/bricks/particles/ConfettiBrick.ts
 *
 * Brique de Particules : Pluie de Confettis Festive & Célébration (Couche 3 : Particles).
 * Confettis multicolores rectangulaires tournoyant vivement sur deux axes
 * (spin & tumble rapide), 3 tailles bien visibles avec halo et biseau spéculaire,
 * dérive festive avec portance aérodynamique oscillante, palette vibrante instantanément
 * joyeuse et étagement de profondeur réaliste (particules lointaines plus petites et moins contrastées).
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
import { getConfettiTexture } from './particleTextures'

export interface ConfettiProps {
  /** Mode de palette ('multi' pour multicolore festif, ou couleur hex spécifique). */
  colorMode?: string
  /** Multiplicateur de densité/nombre de confettis (0.2 à 2.5, défaut: 1.0 -> 160 confettis). */
  density?: number
  /** Vitesse de descente moyenne (0.1 à 2.0, défaut: 0.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Saturation et éclat festif (0.2 à 2.0, défaut: 1.2). */
  intensity?: number
  /** Désynchronisation et asymétrie des trajectoires (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Vitesse de vrille 3D sur les axes X et Y (0.5 à 3.0, défaut: 1.8). */
  spinSpeed?: number
  /** Portance aérodynamique oscillante (0.2 à 2.0, défaut: 1.0). */
  flutterStrength?: number
}

const FESTIVE_PALETTE = [
  '#ff1744', // Rouge éclatant vif
  '#00e5ff', // Cyan électrique
  '#ffea00', // Jaune soleil radieux
  '#00e676', // Vert émeraude festif
  '#d500f9', // Magenta néon
  '#ff6d00', // Orange ambre éclatant
  '#2979ff', // Bleu roi vibrant
  '#ffffff', // Ruban argenté brillant
]

export class ConfettiInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'confetti'

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
  private baseColors: Float32Array

  private colorMode: string
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private spinSpeed: number
  private flutterStrength: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: ConfettiProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.colorMode = props.colorMode ?? 'multi'
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.6
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.2
    this.randomness = props.randomness ?? 0.5
    this.spinSpeed = props.spinSpeed ?? 1.8
    this.flutterStrength = props.flutterStrength ?? 1.0
    this.currentQuality = context.quality ?? 'HIGH'

    this.totalCount = Math.floor(300 * this.density)
    this.activeCount = this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount * 3)
    this.rotVelocities = new Float32Array(this.totalCount * 3)
    this.flutterPhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.baseColors = new Float32Array(this.totalCount * 3)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getConfettiTexture(),
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      opacity: Math.min(1.0, 0.95 * this.intensity),
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 18
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 14 : 8.5 + Math.random() * 2.5
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = (Math.random() - 0.5) * 0.3
    this.velocities[idx3 + 1] = -(0.5 + Math.random() * 0.5) * this.speed
    this.velocities[idx3 + 2] = 0

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    // Rotation 3D vive mais équilibrée pour préserver la face réfléchissante
    this.rotVelocities[idx3] =
      (1.0 + Math.random() * 1.5) * this.spinSpeed * (Math.random() < 0.5 ? 1 : -1)
    this.rotVelocities[idx3 + 1] =
      (0.8 + Math.random() * 1.5) * this.spinSpeed * (Math.random() < 0.5 ? 1 : -1)
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.2 * this.randomness

    this.flutterPhases[i] = Math.random() * Math.PI * 2

    // 3 paliers de taille bien calibrés et nettement visibles sur 1920x927 :
    // ~45% petits confettis festifs d'arrière-plan
    // ~35% confettis moyens (rubans standards)
    // ~20% grands confettis festifs (mise en valeur des reflets métalliques)
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.45) {
      size = 0.65 + Math.random() * 0.25
    } else if (tierRand < 0.8) {
      size = 1.2 + Math.random() * 0.4
    } else {
      size = 1.9 + Math.random() * 0.7
    }
    this.baseScales[i] = size * this.intensity

    // Couleur festive
    if (this.colorMode === 'multi') {
      const colHex = FESTIVE_PALETTE[i % FESTIVE_PALETTE.length]
      this.tempColor.set(colHex)
    } else {
      this.tempColor.set(this.colorMode)
    }

    const cIdx = i * 3
    this.baseColors[cIdx] = this.tempColor.r
    this.baseColors[cIdx + 1] = this.tempColor.g
    this.baseColors[cIdx + 2] = this.tempColor.b
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

      // Portance aérodynamique oscillante
      const flutter = Math.sin(time * 3.5 + this.flutterPhases[i]) * 0.5 * this.flutterStrength

      // Répulsion de la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 6.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.45) * 1.1
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      this.positions[idx3] +=
        (this.velocities[idx3] + flutter + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + repulseY) * delta * 2.0 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -8.5) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 12.0) this.positions[idx3] = -12.0
      if (this.positions[idx3] < -12.0) this.positions[idx3] = 12.0

      // Vrille 3D rapide
      this.rotations[idx3] += this.rotVelocities[idx3] * delta * this.surgeMultiplier
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta * this.surgeMultiplier
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      const pz = this.positions[idx3 + 2]

      // Atténuation réaliste par la profondeur (Z) : taille et opacité/contraste
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.55, 1.35)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.65, 1.0)

      const cIdx = i * 3
      this.tempColor.setRGB(
        this.baseColors[cIdx] * depthOpacity,
        this.baseColors[cIdx + 1] * depthOpacity,
        this.baseColors[cIdx + 2] * depthOpacity
      )
      this.mesh.setColorAt(i, this.tempColor)

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
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
    }
  }

  public updateProps(newProps: Partial<ConfettiProps>): void {
    if (newProps.colorMode !== undefined) {
      this.colorMode = newProps.colorMode
      for (let i = 0; i < this.totalCount; i++) {
        if (this.colorMode === 'multi') {
          this.tempColor.set(FESTIVE_PALETTE[i % FESTIVE_PALETTE.length])
        } else {
          this.tempColor.set(this.colorMode)
        }
        const cIdx = i * 3
        this.baseColors[cIdx] = this.tempColor.r
        this.baseColors[cIdx + 1] = this.tempColor.g
        this.baseColors[cIdx + 2] = this.tempColor.b
      }
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.mesh && this.mesh.material && !Array.isArray(this.mesh.material)) {
        ;(this.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(
          1.0,
          0.95 * this.intensity
        )
      }
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.spinSpeed !== undefined) this.spinSpeed = newProps.spinSpeed
    if (newProps.flutterStrength !== undefined) this.flutterStrength = newProps.flutterStrength

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.totalCount, Math.floor(300 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.totalCount, Math.floor(170 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.totalCount, Math.floor(85 * this.density * mobileRatio))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
    // Explosion de confettis
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

export const ConfettiDefinition: IBrickDefinition<ConfettiProps> = {
  type: 'confetti',
  category: 'particles',
  create: (id, props, context) => new ConfettiInstance(id, props, context),
}

BrickRegistry.register(ConfettiDefinition)
