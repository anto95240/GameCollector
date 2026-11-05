/**
 * src/theme-engine/bricks/particles/SnowBrick.ts
 *
 * Brique de Particules : Flocons de Neige & Tempête Hivernale (Couche 3 : Particles).
 * Chute de flocons doux et cristallins avec oscillations pendulaires déphasées (sway),
 * 3 tailles bien visibles avec halo lumineux, masse hétérogène (gros flocons plus rapides),
 * étagement de profondeur réaliste (bokeh, particules lointaines plus petites et moins opaques)
 * et réaction interactive au passage du curseur.
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
import { getSnowTexture } from './particleTextures'

export interface SnowProps {
  /** Teinte dominante des flocons de neige (défaut: '#f8fafc'). */
  snowColor?: string
  /** Multiplicateur de densité/nombre de flocons (0.2 à 2.5, défaut: 1.0 -> 220 flocons). */
  density?: number
  /** Vitesse moyenne de chute verticale (0.1 à 2.0, défaut: 0.45). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.6). */
  depth?: number
  /** Échelle générale et luminosité des flocons (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Turbulence aléatoire et dispersion de masse (0.0 à 1.0, défaut: 0.45). */
  randomness?: number
  /** Force et angle de dérive sous le vent latéral (0.0 à 1.5, défaut: 0.25). */
  windStrength?: number
  /** Fréquence d'oscillation pendulaire gauche-droite (0.5 à 3.0, défaut: 1.5). */
  swayFrequency?: number
}

export class SnowInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'snow'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  private positions: Float32Array
  private initialX: Float32Array
  private velocities: Float32Array
  private swayAmplitudes: Float32Array
  private swayPhases: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private baseColors: Float32Array

  private snowColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private windStrength: number
  private swayFrequency: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: SnowProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.snowColor = new THREE.Color(props.snowColor ?? '#f8fafc')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.45
    this.depthFactor = props.depth ?? 0.6
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.45
    this.windStrength = props.windStrength ?? 0.25
    this.swayFrequency = props.swayFrequency ?? 1.5
    this.currentQuality = context.quality ?? 'HIGH'

    this.totalCount = Math.floor(220 * this.density)
    this.activeCount = this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.initialX = new Float32Array(this.totalCount)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.swayAmplitudes = new Float32Array(this.totalCount)
    this.swayPhases = new Float32Array(this.totalCount)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.baseColors = new Float32Array(this.totalCount * 3)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getSnowTexture(),
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

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    const startX = (Math.random() - 0.5) * 20
    this.initialX[i] = startX
    this.positions[idx3] = startX
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 12 : 5.8 + Math.random() * 1.8
    this.positions[idx3 + 2] = -14 * this.depthFactor + Math.random() * (5 * this.depthFactor)

    // 3 paliers de taille bien calibrés :
    // ~50% petites (fines, profondeur Z)
    // ~35% moyennes (corps principal de la chute)
    // ~15% grandes (premier plan majestueux / bokeh floconneux)
    const tierRand = Math.random()
    let size = 0
    let mass = 1.0
    if (tierRand < 0.5) {
      size = 0.28 + Math.random() * 0.1
      mass = 0.7 + Math.random() * 0.25
    } else if (tierRand < 0.85) {
      size = 0.5 + Math.random() * 0.18
      mass = 1.0 + Math.random() * 0.3
    } else {
      size = 0.85 + Math.random() * 0.32
      mass = 1.35 + Math.random() * 0.35
    }
    this.baseScales[i] = size * this.intensity

    this.velocities[idx3] = this.windStrength * 0.4
    this.velocities[idx3 + 1] = -(0.45 + mass * 0.35) * this.speed
    this.velocities[idx3 + 2] = 0

    this.swayAmplitudes[i] = (0.2 + Math.random() * 0.5) * this.randomness
    this.swayPhases[i] = Math.random() * Math.PI * 2

    const maxLifeSec = 14.0 + Math.random() * 8.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    const cIdx = i * 3
    this.baseColors[cIdx] = this.snowColor.r
    this.baseColors[cIdx + 1] = this.snowColor.g
    this.baseColors[cIdx + 2] = this.snowColor.b
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

      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      // Balancement sinusoïdal doux déphasé
      const sway = Math.sin(time * this.swayFrequency + this.swayPhases[i]) * this.swayAmplitudes[i]
      const noise = simplex3D(px * 0.2, py * 0.2, time * 0.2) * 0.15 * this.randomness

      // Répulsion interactive au passage du curseur
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 6.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.45) * 0.8
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      this.positions[idx3] +=
        (this.velocities[idx3] + sway + noise + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + repulseY) * delta * 2.0 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -6.8) {
        this.resetParticle(i, false)
        continue
      }

      // Rebouclage latéral si dérive trop loin sous le vent
      if (this.positions[idx3] > 12.0) this.positions[idx3] = -12.0
      if (this.positions[idx3] < -12.0) this.positions[idx3] = 12.0

      // Atténuation réaliste par la profondeur (Z) : taille et opacité/contraste
      const depthFactor = THREE.MathUtils.mapLinear(pz, -14 * this.depthFactor, 2, 0.5, 1.25)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -14 * this.depthFactor, 2, 0.4, 1.0)

      const lifeProgress = this.life[i] / this.maxLife[i]
      let lifeFade = 1.0
      if (lifeProgress < 0.12) {
        lifeFade = lifeProgress / 0.12
      } else if (lifeProgress > 0.85) {
        lifeFade = (1.0 - lifeProgress) / 0.15
      }

      const finalAlpha = Math.max(0.1, Math.min(1.0, lifeFade * depthOpacity))
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

  public updateProps(newProps: Partial<SnowProps>): void {
    if (newProps.snowColor !== undefined) {
      this.snowColor.set(newProps.snowColor)
      for (let i = 0; i < this.totalCount; i++) {
        const cIdx = i * 3
        this.baseColors[cIdx] = this.snowColor.r
        this.baseColors[cIdx + 1] = this.snowColor.g
        this.baseColors[cIdx + 2] = this.snowColor.b
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
    if (newProps.windStrength !== undefined) this.windStrength = newProps.windStrength
    if (newProps.swayFrequency !== undefined) this.swayFrequency = newProps.swayFrequency

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.totalCount, Math.floor(220 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.totalCount, Math.floor(120 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.totalCount, Math.floor(55 * this.density * mobileRatio))
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
    // Bourrasque de neige
    this.surgeMultiplier = 2.2
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

export const SnowDefinition: IBrickDefinition<SnowProps> = {
  type: 'snow',
  category: 'particles',
  create: (id, props, context) => new SnowInstance(id, props, context),
}

BrickRegistry.register(SnowDefinition)
