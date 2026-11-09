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
  /** Teinte dominante des pétales de fleur (défaut: '#f472b6'). */
  petalColor?: string
  /** Teinte accentuée plus vive pour le cœur (défaut: '#fb7185'). */
  accentColor?: string
  /** Multiplicateur de densité/nombre de pétales (0.2 à 2.5, défaut: 1.0 -> 130 pétales). */
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
  private instanceAlphas: Float32Array

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

    this.petalColor = new THREE.Color(props.petalColor ?? '#f472b6')
    this.accentColor = new THREE.Color(props.accentColor ?? '#fb7185')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.45
    this.curlAmount = props.curlAmount ?? 1.0
    this.windSpeed = props.windSpeed ?? 0.4
    this.currentQuality = context.quality ?? 'HIGH'

    this.totalCount = Math.floor(150 * this.density)
    this.activeCount = this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.rotations = new Float32Array(this.totalCount)
    this.rotVelocities = new Float32Array(this.totalCount)
    this.curlPhases = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.seeds = new Float32Array(this.totalCount)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseColors = new Float32Array(this.totalCount * 3)
    this.instanceAlphas = new Float32Array(this.totalCount)
    this.instanceAlphas.fill(1.0)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const alphaAttr = new THREE.InstancedBufferAttribute(this.instanceAlphas, 1)
    alphaAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('instanceAlpha', alphaAttr)

    const material = new THREE.MeshBasicMaterial({
      map: getPetalTexture(),
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      opacity: Math.min(1.0, 0.95 * this.intensity),
      side: THREE.DoubleSide,
    })

    material.customProgramCacheKey = () => 'petals_instance_alpha'
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `attribute float instanceAlpha;\nvarying float vInstanceAlpha;\n${shader.vertexShader}`.replace(
          '#include <color_vertex>',
          `#include <color_vertex>\nvInstanceAlpha = instanceAlpha;`
        )
      shader.fragmentShader = `varying float vInstanceAlpha;\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\ndiffuseColor.a *= vInstanceAlpha;`
      )
    }

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
      // Nuances délicates et naturelles entre rose sakura soyeux et rose corail tendre
      const mixRatio = 0.15 + Math.random() * 0.7
      this.tempColor.copy(this.petalColor).lerp(this.accentColor, mixRatio)
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
      this.mesh?.setColorAt(i, this.tempColor)
    }
    if (this.mesh?.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
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

    this.rotations[i] = Math.random() * Math.PI * 2
    // Rotation lente dans le plan caméra pour préserver l'orientation visible du pétale
    this.rotVelocities[i] = (Math.random() - 0.5) * 0.45 * this.curlAmount

    this.curlPhases[i] = Math.random() * Math.PI * 2
    const maxLifeSec = 12.0 + Math.random() * 8.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // 3 paliers de taille généreux pour garantir une excellente visibilité de la silhouette sakura :
    // ~45% petits pétales délicats de mi-plan
    // ~40% moyens pétales (corps principal du voletement)
    // ~15% grands pétales d'avant-plan avec échancrure sakura parfaitement distincte
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.45) {
      size = 0.85 + Math.random() * 0.3
    } else if (tierRand < 0.85) {
      size = 1.25 + Math.random() * 0.4
    } else {
      size = 1.8 + Math.random() * 0.5
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

      // Rotation principale lente en Z + voletement doux en X et Y (sans jamais se retourner sur la tranche)
      this.rotations[i] += this.rotVelocities[i] * delta
      const pitch = Math.sin(time * 1.5 + this.curlPhases[i]) * 0.32 * this.curlAmount
      const roll = Math.cos(time * 1.2 + this.curlPhases[i] * 1.3) * 0.28 * this.curlAmount

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.65, 1.25)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.65, 1.0)

      // Fondu d'apparition doux et évanouissement progressif en fin de vie
      let lifeFade = 1.0
      if (progress < 0.12) {
        lifeFade = progress / 0.12
      } else if (progress > 0.85) {
        lifeFade = (1.0 - progress) / 0.15
      }

      // Vraie modulation d'opacité GPU par instance (ne noircit jamais le pétale)
      const finalAlpha = Math.max(0.0, Math.min(1.0, lifeFade * depthOpacity))
      this.instanceAlphas[i] = finalAlpha

      const scale =
        this.baseScales[i] * Math.min(1.0, lifeFade + 0.25) * depthFactor * this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.set(pitch, roll, this.rotations[i])
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = this.activeCount; i < this.totalCount; i++) {
      this.instanceAlphas[i] = 0.0
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
    const alphaAttr = this.mesh.geometry.getAttribute(
      'instanceAlpha'
    ) as THREE.InstancedBufferAttribute
    if (alphaAttr) {
      alphaAttr.needsUpdate = true
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
    const mobileRatio = isMobile ? 0.5 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.totalCount, Math.floor(130 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.totalCount, Math.floor(75 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.totalCount, Math.floor(38 * this.density * mobileRatio))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
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
