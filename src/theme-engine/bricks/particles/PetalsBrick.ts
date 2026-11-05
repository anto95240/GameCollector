/**
 * src/theme-engine/bricks/particles/PetalsBrick.ts
 *
 * Brique de Particules : Pétales de Cerisier en Fleur / Sakura (Couche 3 : Particles).
 * Voletement soyeux et aérien de pétales délicats avec rotation 3D douce en spirale,
 * ondulation sinueuse sous la brise printanière, courbure organique galbée,
 * 3 tiers de tailles bien visibles avec dégradé rose sakura nacré et liseré distinctif.
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
  private life: Float32Array
  private maxLife: Float32Array
  private baseColors: Float32Array

  private petalColor: THREE.Color
  private accentColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private curlAmount: number
  private windSpeed: number
  private currentQuality: QualityTier

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
    this.currentQuality = context.quality ?? 'HIGH'

    this.totalCount = Math.floor(130 * this.density)
    this.activeCount = this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount * 3)
    this.rotVelocities = new Float32Array(this.totalCount * 3)
    this.curlPhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseColors = new Float32Array(this.totalCount * 3)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getPetalTexture(),
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      opacity: Math.min(1.0, 0.95 * this.intensity),
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    this.updateBaseColors()

    for (let i = 0; i < this.totalCount; i++) {
      this.seeds[i] = Math.random() * 600
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private updateBaseColors(): void {
    for (let i = 0; i < this.totalCount; i++) {
      // Nuances délicates entre rose tendre et rose fuchsia nacré
      const mixRatio = 0.2 + Math.random() * 0.65
      this.tempColor.copy(this.petalColor).lerp(this.accentColor, mixRatio)
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
    }
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 18
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 14 : 7.8 + Math.random() * 2.2
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = this.windSpeed * 0.35 + (Math.random() - 0.5) * 0.1
    this.velocities[idx3 + 1] = -(0.35 + Math.random() * 0.35) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.05

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    // Rotation douce et progressive pour que la silhouette de pétale reste identifiable
    this.rotVelocities[idx3] = (Math.random() - 0.5) * 1.1 * this.curlAmount
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 1.5 * this.curlAmount
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 0.8 * this.curlAmount

    this.curlPhases[i] = Math.random() * Math.PI * 2
    const maxLifeSec = 12.0 + Math.random() * 8.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // 3 paliers de taille bien calibrés pour garantir la lisibilité de la forme de pétale :
    // ~50% petits (pétales d'arrière-plan vaporeux)
    // ~35% moyens (corps principal du voletement)
    // ~15% grands (beaux pétales de premier plan avec échancrure sakura nette)
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.5) {
      size = 0.38 + Math.random() * 0.12
    } else if (tierRand < 0.85) {
      size = 0.58 + Math.random() * 0.18
    } else {
      size = 0.88 + Math.random() * 0.25
    }
    this.baseScales[i] = size * this.intensity
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

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const progress = this.life[i] / this.maxLife[i]
      const seed = this.seeds[i]

      // Modulation non-linéaire de la fréquence hélicoïdale via bruit Simplex
      const helicalNoise = simplex3D(
        this.positions[idx3] * 0.18,
        this.positions[idx3 + 1] * 0.18,
        time * 0.25 + seed
      )
      const spiral =
        Math.sin(time * 1.8 + this.curlPhases[i] + helicalNoise * 1.8) *
        (0.35 + helicalNoise * 0.12 * this.randomness)
      const breeze =
        simplex3D(this.positions[idx3] * 0.15, time * 0.2, seed + 10.0) * 0.3 * this.randomness

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

      // Rotation 3D douce
      this.rotations[idx3] += this.rotVelocities[idx3] * delta
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.55, 1.25)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.45, 1.0)

      // Fondu d'apparition doux et extinction sur les derniers 15 %
      let lifeFade = 1.0
      if (progress < 0.1) {
        lifeFade = progress / 0.1
      } else if (progress > 0.85) {
        lifeFade = (1.0 - progress) / 0.15
      }

      // Application de l'opacité par teinte VRAM
      const finalAlpha = Math.max(0.12, Math.min(1.0, lifeFade * depthOpacity))
      const cIdx = i * 3
      this.tempColor.setRGB(
        this.baseColors[cIdx] * finalAlpha,
        this.baseColors[cIdx + 1] * finalAlpha,
        this.baseColors[cIdx + 2] * finalAlpha
      )
      this.mesh.setColorAt(i, this.tempColor)

      const scale =
        this.baseScales[i] * Math.min(1.0, lifeFade + 0.3) * depthFactor * this.surgeMultiplier

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

  public updateProps(newProps: Partial<PetalsProps>): void {
    let colorsChanged = false
    if (newProps.petalColor !== undefined) {
      this.petalColor.set(newProps.petalColor)
      colorsChanged = true
    }
    if (newProps.accentColor !== undefined) {
      this.accentColor.set(newProps.accentColor)
      colorsChanged = true
    }
    if (colorsChanged) {
      this.updateBaseColors()
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
    if (newProps.curlAmount !== undefined) this.curlAmount = newProps.curlAmount
    if (newProps.windSpeed !== undefined) this.windSpeed = newProps.windSpeed

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.totalCount, Math.floor(120 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.totalCount, Math.floor(65 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.totalCount, Math.floor(32 * this.density * mobileRatio))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
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
