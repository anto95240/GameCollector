/**
 * src/theme-engine/bricks/particles/EmbersBrick.ts
 *
 * Brique de Particules : Braises Incandescentes (Couche 3 : Particles).
 * Particules de braises ascendantes s'élevant d'un foyer ardent avec convection
 * thermique turbulente (bruit Simplex 3D), micro-scintillement non-linéaire,
 * refroidissement progressif (du jaune/blanc au rouge sombre), dérive sous le vent,
 * et réaction interactive à la souris (répulsion thermique).
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
import { getEmberTexture } from './particleTextures'

export interface EmbersProps {
  /** Teinte dominante des braises chaudes (défaut: '#f97316'). */
  emberColor?: string
  /** Teinte du cœur incandescent ultra-chaud (défaut: '#fef08a'). */
  hotColor?: string
  /** Multiplicateur de densité/nombre de braises (0.2 à 2.5, défaut: 1.0 -> 180 braises). */
  density?: number
  /** Vitesse d'ascension convective (0.1 à 2.0, défaut: 0.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.4). */
  depth?: number
  /** Radiance et taille de lueur des braises (0.2 à 2.5, défaut: 1.2). */
  intensity?: number
  /** Amplitude des turbulences convectives et asymétrie (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Vitesse de refroidissement des braises au cours de leur vie (0.5 à 2.0, défaut: 1.0). */
  coolingRate?: number
}

export class EmbersInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'embers'

  private mesh: THREE.InstancedMesh | null = null
  private scene: THREE.Scene
  private totalCount: number
  private activeCount: number

  // Buffers pré-alloués (zéro GC en boucle)
  private positions: Float32Array
  private velocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private baseSeeds: Float32Array

  // Propriétés de simulation
  private emberColor: THREE.Color
  private hotColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private coolingRate: number

  // Objets temporaires réutilisés
  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: EmbersProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.emberColor = new THREE.Color(props.emberColor ?? '#f97316')
    this.hotColor = new THREE.Color(props.hotColor ?? '#fef08a')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.6
    this.depthFactor = props.depth ?? 0.4
    this.intensity = props.intensity ?? 1.2
    this.randomness = props.randomness ?? 0.5
    this.coolingRate = props.coolingRate ?? 1.0

    this.totalCount = Math.floor(180 * this.density)
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)
    this.baseSeeds = new Float32Array(this.totalCount)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: getEmberTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < this.totalCount; i++) {
      this.baseSeeds[i] = Math.random() * 1000
      this.resetParticle(i, true)
    }

    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    // Émission depuis le bas de l'écran avec étalement conique
    this.positions[idx3] = (Math.random() - 0.5) * 16
    this.positions[idx3 + 1] = -7.5 + Math.random() * 3.0
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    // Vélocité : ascension Y rapide, dérive X douce
    this.velocities[idx3] = (Math.random() - 0.5) * 0.2 * this.randomness
    this.velocities[idx3 + 1] = (0.8 + Math.random() * 0.8) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.1

    const maxLifeSec = (3.5 + Math.random() * 3.5) / this.coolingRate
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0
    this.baseScales[i] = (0.12 + Math.random() * 0.22) * this.intensity
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
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      // Turbulence convective par Simplex 3D
      const turbScale = 0.25
      const seed = this.baseSeeds[i]
      const noiseX = simplex3D(px * turbScale, py * turbScale + seed, time * 0.4)
      const noiseY = simplex3D(py * turbScale, pz * turbScale + seed, time * 0.3)

      // Répulsion interactive au passage de la souris
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 8.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.8) * 1.2
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      // Mise à jour de la position
      const vx =
        (this.velocities[idx3] + noiseX * this.randomness * 0.8 + repulseX) * this.surgeMultiplier
      const vy =
        (this.velocities[idx3 + 1] + noiseY * this.randomness * 0.4 + repulseY) *
        this.surgeMultiplier
      const vz = this.velocities[idx3 + 2]

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += vz * delta * 2.0

      if (this.positions[idx3 + 1] > 8.0) {
        this.resetParticle(i, false)
        continue
      }

      // Refroidissement thermique : blanc-jaune -> orange incandescent -> rouge sombre
      const heat = Math.max(0, 1.0 - progress * this.coolingRate)
      this.tempColor.copy(this.emberColor).lerp(this.hotColor, heat * heat)

      // Scintillement organique
      const flicker = 0.85 + 0.15 * Math.sin(time * 12.0 + seed)
      this.tempColor.multiplyScalar(heat * flicker)
      this.mesh.setColorAt(i, this.tempColor)

      // Échelle : rétrécissement en fin de vie avec atténuation de profondeur
      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.4, 1.25)
      const scale =
        this.baseScales[i] * Math.sin(progress * Math.PI) * depthFactor * this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.scale.set(scale, scale, scale)
      // Légère rotation avec la dérive
      this.dummy.rotation.z = Math.sin(time * 2.0 + seed) * 0.5
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    // Masquer les instances inactives
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

  public updateProps(newProps: Partial<EmbersProps>): void {
    if (newProps.emberColor !== undefined) this.emberColor.set(newProps.emberColor)
    if (newProps.hotColor !== undefined) this.hotColor.set(newProps.hotColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.coolingRate !== undefined) this.coolingRate = newProps.coolingRate

    if (newProps.density !== undefined) {
      this.density = newProps.density
      const isMobile = window.innerWidth < 768
      const mobileFactor = isMobile ? 0.35 : 1.0
      this.activeCount = Math.min(this.totalCount, Math.floor(180 * this.density * mobileFactor))
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
    this.surgeMultiplier = 2.4
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

export const EmbersDefinition: IBrickDefinition<EmbersProps> = {
  type: 'embers',
  category: 'particles',
  create: (id, props, context) => new EmbersInstance(id, props, context),
}

BrickRegistry.register(EmbersDefinition)
