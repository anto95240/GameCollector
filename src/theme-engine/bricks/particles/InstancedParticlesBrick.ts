/**
 * src/theme-engine/bricks/particles/InstancedParticlesBrick.ts
 *
 * Système de particules ultra-performant basé sur THREE.InstancedMesh (Couche 3 : Particles).
 * Comprend :
 * - Rendu en un seul draw call GPU.
 * - Forces physiques et dérive directionnelle.
 * - Turbulence organique par bruit Simplex 3D.
 * - Gestion de cycle de vie (respawn, fade in, fade out).
 * - Profondeur de champ (atténuation et variation d'échelle avec l'axe Z).
 * - Réactivité à la souris (force de répulsion douce).
 * - Réponse aux événements rares (accélération ou sur-brillance).
 * - Zéro allocation Garbage Collector par frame.
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

export interface InstancedParticlesProps {
  count?: number                 // Nombre nominal de particules
  speedY?: number                // Vitesse verticale (négatif = monte, positif = descend)
  speedX?: number                // Vitesse horizontale de dérive
  turbulenceStrength?: number    // Intensité de la turbulence par bruit (ex: 0.5)
  turbulenceScale?: number       // Échelle spatiale du bruit
  depthRange?: [number, number]  // [minZ, maxZ] (ex: [-15, 2])
  sizeRange?: [number, number]   // [minSize, maxSize]
  mouseRepulsion?: number        // Force de répulsion du pointeur
  shape?: 'circle' | 'diamond'   // Forme géométrique
  colorMode?: 'primary' | 'secondary' | 'accent' | 'mixed'
}

class InstancedParticlesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'instanced_particles'

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

  // Propriétés de simulation
  private speedY: number
  private speedX: number
  private turbStrength: number
  private turbScale: number
  private minZ: number
  private maxZ: number
  private minSize: number
  private maxSize: number
  private mouseRepulsion: number
  private colorMode: string

  // Objets temporaires réutilisés pour les matrices
  private dummy = new THREE.Object3D()
  private matrix = new THREE.Matrix4()
  private tempColor = new THREE.Color()

  // Surtension temporaire lors d'événements rares
  private surgeMultiplier = 1.0

  constructor(id: string, props: InstancedParticlesProps, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.totalCount = props.count ?? 180
    // Facteur d'échelle mobile et qualité
    const isMobile = window.innerWidth < 768
    this.activeCount = isMobile ? Math.floor(this.totalCount * 0.35) : this.totalCount

    this.speedY = props.speedY ?? -0.4
    this.speedX = props.speedX ?? 0.05
    this.turbStrength = props.turbulenceStrength ?? 0.4
    this.turbScale = props.turbulenceScale ?? 0.2
    this.minZ = props.depthRange ? props.depthRange[0] : -12
    this.maxZ = props.depthRange ? props.depthRange[1] : 2
    this.minSize = props.sizeRange ? props.sizeRange[0] : 0.08
    this.maxSize = props.sizeRange ? props.sizeRange[1] : 0.25
    this.mouseRepulsion = props.mouseRepulsion ?? 0.8
    this.colorMode = props.colorMode ?? 'mixed'

    // Allouer les buffers
    this.positions = new Float32Array(this.totalCount * 3)
    this.velocities = new Float32Array(this.totalCount * 3)
    this.life = new Float32Array(this.totalCount)
    this.maxLife = new Float32Array(this.totalCount)
    this.baseScales = new Float32Array(this.totalCount)

    // Géométrie d'une particule
    const geometry =
      props.shape === 'diamond'
        ? new THREE.OctahedronGeometry(1.0, 0)
        : new THREE.CircleGeometry(1.0, 16)

    // Matériau optimisé avec vertex colors
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    // Initialiser les particules
    this.initParticles(context)
    this.scene.add(this.mesh)
  }

  private initParticles(context: BrickContext): void {
    if (!this.mesh) return

    const primCol = context.sharedUniforms.uPalettePrimary.value
    const secCol = context.sharedUniforms.uPaletteSecondary.value
    const accCol = context.sharedUniforms.uPaletteAccent.value

    for (let i = 0; i < this.totalCount; i++) {
      this.resetParticle(i, true)

      // Couleur de la particule
      if (this.colorMode === 'accent' || (this.colorMode === 'mixed' && Math.random() < 0.25)) {
        this.tempColor.copy(accCol)
      } else if (this.colorMode === 'secondary' || (this.colorMode === 'mixed' && Math.random() < 0.5)) {
        this.tempColor.copy(secCol)
      } else {
        this.tempColor.copy(primCol)
      }

      this.mesh.setColorAt(i, this.tempColor)
    }

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
    }
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    // Position aléatoire sur la zone visible étendue
    this.positions[idx3] = (Math.random() - 0.5) * 20
    this.positions[idx3 + 1] = (Math.random() - 0.5) * 14
    this.positions[idx3 + 2] = this.minZ + Math.random() * (this.maxZ - this.minZ)

    // Vitesses avec légère variabilité
    this.velocities[idx3] = this.speedX + (Math.random() - 0.5) * 0.1
    this.velocities[idx3 + 1] = this.speedY + (Math.random() - 0.5) * 0.15
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.05

    // Durée de vie entre 4 et 10 secondes
    const maxLifeSec = 4.0 + Math.random() * 6.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // Taille de base
    this.baseScales[i] = this.minSize + Math.random() * (this.maxSize - this.minSize)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    // Amortissement du surge événementiel
    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.5)
    }

    // Coordonnées de la souris projetées dans la scène
    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3

      // Avancement de la durée de vie
      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      // Progression du cycle de vie [0, 1]
      const lifeProgress = this.life[i] / this.maxLife[i]
      // Courbe d'apparition et disparition douce (sinus)
      const alphaScale = Math.sin(lifeProgress * Math.PI)

      // Calcul de turbulence Simplex Noise 3D
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      const noiseX = simplex3D(px * this.turbScale, py * this.turbScale, time * 0.3)
      const noiseY = simplex3D(py * this.turbScale, pz * this.turbScale, time * 0.25 + 5.0)

      // Force de répulsion du pointeur
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 9.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 3.0) * this.mouseRepulsion
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      // Mise à jour de la position
      const vx = (this.velocities[idx3] + noiseX * this.turbStrength + repulseX) * this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + noiseY * this.turbStrength + repulseY) * this.surgeMultiplier
      const vz = this.velocities[idx3 + 2]

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += vz * delta * 2.0

      // Re-bouclage aux frontières d'écran
      if (this.positions[idx3 + 1] > 8.0) this.positions[idx3 + 1] = -8.0
      if (this.positions[idx3 + 1] < -8.0) this.positions[idx3 + 1] = 8.0
      if (this.positions[idx3] > 12.0) this.positions[idx3] = -12.0
      if (this.positions[idx3] < -12.0) this.positions[idx3] = 12.0

      // Calcul de la taille avec atténuation par la profondeur (Z)
      const depthFactor = THREE.MathUtils.mapLinear(this.positions[idx3 + 2], this.minZ, this.maxZ, 0.4, 1.3)
      const currentScale = this.baseScales[i] * alphaScale * depthFactor * this.surgeMultiplier

      // Mise à jour de la matrice d'instance
      this.dummy.position.set(this.positions[idx3], this.positions[idx3 + 1], this.positions[idx3 + 2])
      this.dummy.scale.set(currentScale, currentScale, currentScale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    // Masquer les particules inactives (au-delà du palier actif)
    for (let i = this.activeCount; i < this.totalCount; i++) {
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
  }

  public onQualityChange(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.floor(this.totalCount * mobileRatio)
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.floor(this.totalCount * 0.5 * mobileRatio)
    } else {
      this.activeCount = Math.floor(this.totalCount * 0.25 * mobileRatio)
    }
  }

  public triggerEvent(_event: RareEventTrigger): void {
    // Amplification de vitesse / éclat temporaire lors d'événements rares
    this.surgeMultiplier = 2.2
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.8
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((m) => m.dispose())
      } else if (this.mesh.material) {
        this.mesh.material.dispose()
      }
      this.mesh = null
    }
  }
}

export const InstancedParticlesDefinition: IBrickDefinition<InstancedParticlesProps> = {
  type: 'instanced_particles',
  category: 'particles',
  create: (id, props, context) => new InstancedParticlesInstance(id, props, context),
}

// Enregistrement automatique
BrickRegistry.register(InstancedParticlesDefinition)
