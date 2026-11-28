/**
 * src/theme-engine/bricks/particles/EmbersBrick.ts
 *
 * Brique de Particules : Braises Incandescentes (Couche 3 : Particles).
 * Braises chaudes avec convection thermique turbulente (Simplex 3D), flottabilité
 * configurable (`buoyancy` : montée par convection par défaut ou retombée lente de cendres
 * incandescentes), refroidissement chromatique continu (blanc-jaune -> orange -> rouge -> éteint),
 * scintillement individuel multi-fréquence non-linéaire, dérive sous le vent avec rafales
 * et rendu ShaderMaterial GPU sans allocation par frame.
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

export interface EmbersProps {
  /** Teinte dominante des braises chaudes (défaut: '#f97316'). */
  emberColor?: string
  /** Teinte du cœur incandescent ultra-chaud (défaut: '#fef08a'). */
  hotColor?: string
  /** Multiplicateur de densité/nombre de braises (0.2 à 2.5, défaut: 1.0 -> 360 braises). */
  density?: number
  /** Vitesse de déplacement convectif (0.1 à 2.0, défaut: 0.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.4). */
  depth?: number
  /** Radiance et taille de lueur des braises (0.2 à 2.5, défaut: 1.2). */
  intensity?: number
  /** Amplitude des turbulences convectives et asymétrie (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Vitesse de refroidissement des braises au cours de leur vie (0.5 à 2.0, défaut: 1.0). */
  coolingRate?: number
  /** Flottabilité verticale (-1.0 à 1.0, défaut: 1.0 = montée par convection ; < 0 = retombée lente). */
  buoyancy?: number
  /** Dérive horizontale sous l'effet du vent (-1.5 à 1.5, défaut: 0.25). */
  windDrift?: number
}

export class EmbersInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'embers'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  // Buffers pré-alloués (zéro GC en boucle)
  private positions: Float32Array
  private velocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private baseSeeds: Float32Array
  private flickerRates: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, heat, seed, stretch]

  // Propriétés de simulation
  private emberColor: THREE.Color
  private hotColor: THREE.Color
  private midRedColor: THREE.Color = new THREE.Color('#dc2626')
  private coolCharcoalColor: THREE.Color = new THREE.Color('#450a0a')
  private extinguishedColor: THREE.Color = new THREE.Color('#0c0303')
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private coolingRate: number
  private buoyancy: number
  private windDrift: number
  private currentQuality: QualityTier

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
    this.buoyancy = THREE.MathUtils.clamp(props.buoyancy ?? 1.0, -1.0, 1.0)
    this.windDrift = props.windDrift ?? 0.25
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(400, Math.floor(360 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(360 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.life = new Float32Array(this.capacity)
    this.maxLife = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.baseSeeds = new Float32Array(this.capacity)
    this.flickerRates = new Float32Array(this.capacity)
    this.instanceColors = new Float32Array(this.capacity * 3)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const colorAttr = new THREE.InstancedBufferAttribute(this.instanceColors, 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aColor', colorAttr)

    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vColor = aColor;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform int uQualityLevel;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float alpha = vData.x;
          float heat = vData.y;
          float seed = vData.z;

          if (alpha <= 0.004) discard;

          // Légère asymétrie organique de tison irrégulier sur HIGH/MEDIUM
          float dist = length(p);
          if (uQualityLevel >= 1) {
            float angle = atan(p.y, p.x);
            float wobble = 1.0 + 0.14 * sin(angle * 2.0 + seed * 5.0) + 0.08 * cos(angle * 3.0 - seed * 3.0 + uTime * 2.0);
            dist *= wobble;
          }

          if (dist > 1.0) discard;

          // Cœur incandescent compact proportionnel à la chaleur restante
          float coreRadius = mix(0.14, 0.34, heat);
          float core = smoothstep(coreRadius, 0.0, dist);
          float mantle = smoothstep(0.58, 0.04, dist) * 0.72;
          float halo = exp(-dist * dist * 5.2) * (0.45 + 0.45 * heat);

          float intensityMask = core * 1.15 + mantle * (0.45 + 0.55 * heat) + halo;
          vec3 hotCenter = mix(vColor, vec3(1.0, 0.98, 0.88), core * heat * 0.78);

          float outAlpha = clamp(intensityMask * alpha, 0.0, 1.0);
          gl_FragColor = vec4(hotCenter * intensityMask * alpha, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      this.baseSeeds[i] = Math.random() * 1000
      this.flickerRates[i] = 7.0 + Math.random() * 14.0
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    const rising = this.buoyancy >= 0

    this.positions[idx3] = (Math.random() - 0.5) * 18
    if (randomAge) {
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 14
    } else if (rising) {
      this.positions[idx3 + 1] = -7.2 + Math.random() * 2.2
    } else {
      this.positions[idx3 + 1] = 6.2 + Math.random() * 2.0
    }
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4.5 * this.depthFactor)

    // Vélocité de base selon la flottabilité
    const absBuoy = Math.abs(this.buoyancy)
    const verticalBase = rising
      ? (0.45 + Math.random() * 0.65) * this.speed * (0.15 + 0.85 * absBuoy)
      : -(0.28 + Math.random() * 0.42) * this.speed * (0.2 + 0.8 * absBuoy)

    this.velocities[idx3] = (Math.random() - 0.5) * 0.28 * this.randomness
    this.velocities[idx3 + 1] = verticalBase
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.07

    const maxLifeSec = (4.8 + Math.random() * 4.5) / Math.max(0.4, this.coolingRate)
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // 3 paliers calibrés : étincelles fines, braises moyennes, tisons visibles
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.52) {
      size = 0.14 + Math.random() * 0.09
    } else if (tierRand < 0.86) {
      size = 0.25 + Math.random() * 0.14
    } else {
      size = 0.42 + Math.random() * 0.22
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

    // Vent non-linéaire avec rafales douces
    const windGust =
      this.windDrift * (0.75 + 0.4 * Math.sin(time * 0.47) + 0.25 * Math.sin(time * 1.19 + 1.3))

    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const progress = this.life[i] / this.maxLife[i]
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]
      const seed = this.baseSeeds[i]

      let noiseX = 0
      let noiseY = 0
      if (isHigh) {
        const turbScale = 0.28
        noiseX = simplex3D(px * turbScale, py * turbScale + seed, time * 0.42)
        noiseY = simplex3D(py * turbScale, pz * turbScale + seed + 17.0, time * 0.34)
      } else if (!isLow) {
        const turbScale = 0.24
        noiseX = simplex3D(px * turbScale + seed, py * turbScale, time * 0.36)
        noiseY = Math.sin(time * 1.4 + seed) * 0.45
      } else {
        noiseX = Math.sin(time * 1.6 + seed + py * 0.3) * 0.65
        noiseY = Math.cos(time * 1.2 + seed) * 0.35
      }

      // Répulsion interactive au passage de la souris
      let repulseX = 0
      let repulseY = 0
      if (!isLow) {
        const dx = px - mouseWorldX
        const dy = py - mouseWorldY
        const distSq = dx * dx + dy * dy
        if (distSq < 8.0 && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const force = (1.0 - dist / 2.83) * 1.25
          repulseX = (dx / dist) * force
          repulseY = (dy / dist) * force
        }
      }

      // Adaptation dynamique à la direction de buoyancy si modifiée en direct
      const rising = this.buoyancy >= 0
      const targetSign = rising ? 1 : -1
      if (Math.sign(this.velocities[idx3 + 1]) !== targetSign && Math.abs(this.buoyancy) > 0.05) {
        this.velocities[idx3 + 1] = -this.velocities[idx3 + 1]
      }

      const vx =
        (this.velocities[idx3] + windGust + noiseX * this.randomness * 0.9 + repulseX) *
        this.surgeMultiplier
      const vy =
        (this.velocities[idx3 + 1] * Math.max(0.15, Math.abs(this.buoyancy)) +
          noiseY * this.randomness * 0.45 +
          repulseY) *
        this.surgeMultiplier
      const vz = this.velocities[idx3 + 2]

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += vz * delta * 2.0

      if (this.positions[idx3 + 1] > 8.5 || this.positions[idx3 + 1] < -8.5) {
        this.resetParticle(i, false)
        continue
      }
      if (this.positions[idx3] > 13.0) this.positions[idx3] = -13.0
      if (this.positions[idx3] < -13.0) this.positions[idx3] = 13.0

      // Refroidissement continu : blanc-jaune -> orange -> rouge -> rouge sombre -> éteint
      const heat = Math.max(0.0, 1.0 - Math.pow(progress, 0.9) * (0.78 + 0.35 * this.coolingRate))
      if (heat > 0.68) {
        const t = (heat - 0.68) / 0.32
        this.tempColor.copy(this.emberColor).lerp(this.hotColor, t * t)
      } else if (heat > 0.35) {
        const t = (heat - 0.35) / 0.33
        this.tempColor.copy(this.midRedColor).lerp(this.emberColor, t)
      } else if (heat > 0.12) {
        const t = (heat - 0.12) / 0.23
        this.tempColor.copy(this.coolCharcoalColor).lerp(this.midRedColor, t)
      } else {
        const t = heat / 0.12
        this.tempColor.copy(this.extinguishedColor).lerp(this.coolCharcoalColor, t)
      }

      // Scintillement individuel irrégulier (respiration + crépitement d'oxygène)
      const fRate = this.flickerRates[i]
      const breath = 0.68 + 0.32 * Math.sin(time * (1.8 + (seed % 2.7)) + seed)
      const crackle = Math.pow(Math.max(0, Math.sin(time * fRate + seed * 3.7)), 5.0)
      const flicker = Math.min(1.35, breath + crackle * 0.55)

      let lifeFade = 1.0
      if (progress < 0.08) {
        lifeFade = progress / 0.08
      } else if (progress > 0.78) {
        lifeFade = (1.0 - progress) / 0.22
      }

      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.55, 1.25)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.5, 1.0)

      // Extinction progressive quand la braise refroidit complètement
      const thermalGlow = 0.18 + 0.82 * Math.pow(heat, 0.65)
      const finalAlpha = Math.min(
        1.2,
        thermalGlow * flicker * lifeFade * depthOpacity * Math.min(1.4, this.intensity * 0.9)
      )

      this.instanceColors[idx3] = this.tempColor.r
      this.instanceColors[idx3 + 1] = this.tempColor.g
      this.instanceColors[idx3 + 2] = this.tempColor.b

      this.instanceData[idx4] = finalAlpha
      this.instanceData[idx4 + 1] = heat
      this.instanceData[idx4 + 2] = seed
      this.instanceData[idx4 + 3] = 1.0

      const speedMag = Math.sqrt(vx * vx + vy * vy)
      const stretch = 1.0 + Math.min(0.65, speedMag * 0.22)
      const scale =
        this.baseScales[i] *
        depthFactor *
        (0.55 + 0.45 * heat) *
        Math.min(1.0, lifeFade * 1.4) *
        this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.scale.set(scale / Math.sqrt(stretch), scale * stretch, scale)
      this.dummy.rotation.set(0, 0, Math.atan2(-vx, vy))
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.count = this.activeCount
    this.mesh.instanceMatrix.needsUpdate = true
    const colorAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    colorAttr.needsUpdate = true
    dataAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<EmbersProps>): void {
    if (newProps.emberColor !== undefined) this.emberColor.set(newProps.emberColor)
    if (newProps.hotColor !== undefined) this.hotColor.set(newProps.hotColor)
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.coolingRate !== undefined) this.coolingRate = newProps.coolingRate
    if (newProps.buoyancy !== undefined) {
      this.buoyancy = THREE.MathUtils.clamp(newProps.buoyancy, -1.0, 1.0)
    }
    if (newProps.windDrift !== undefined) this.windDrift = newProps.windDrift

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.5 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(360 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(210 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(100 * this.density * mobileRatio))
    }

    if (this.mesh) {
      this.mesh.count = this.activeCount
    }
    if (this.material) {
      this.material.uniforms.uQualityLevel.value =
        quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
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
      this.material = null
    }
  }
}

export const EmbersDefinition: IBrickDefinition<EmbersProps> = {
  type: 'embers',
  category: 'particles',
  create: (id, props, context) => new EmbersInstance(id, props, context),
}

BrickRegistry.register(EmbersDefinition)
