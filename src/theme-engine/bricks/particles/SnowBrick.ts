/**
 * src/theme-engine/bricks/particles/SnowBrick.ts
 *
 * Brique de Particules : Flocons de Neige & Tempête Hivernale (Couche 3 : Particles).
 * Chute de flocons de tailles variées avec profondeur de champ réelle (premier plan
 * en flou bokeh doux, plan médian net avec cristaux hexagonaux sur les gros flocons,
 * arrière-plan fin et discret), turbulence de type curl (tourbillons cohérents),
 * dérive sous le vent avec rafales et scintillement cristallin.
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

export interface SnowProps {
  /** Teinte dominante des flocons de neige (défaut: '#f8fafc'). */
  snowColor?: string
  /** Multiplicateur de densité/nombre de flocons (0.2 à 2.5, défaut: 1.0 -> 340 flocons). */
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
  /** Intensité du scintillement cristallin spéculaire (0.0 à 1.5, défaut: 0.45). */
  sparkleIntensity?: number
  /** Détail des cristaux hexagonaux sur les gros flocons nets (0.0 à 1.0, défaut: 0.7). */
  crystalDetail?: number
}

export class SnowInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'snow'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private swayAmplitudes: Float32Array
  private swayPhases: Float32Array
  private rotAngles: Float32Array
  private rotSpeeds: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private depthPlanes: Uint8Array // 0 = far, 1 = mid crisp, 2 = near foreground bokeh
  private crystalWeights: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, seed, dofBlur, crystalAmount]

  private snowColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private windStrength: number
  private swayFrequency: number
  private sparkleIntensity: number
  private crystalDetail: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
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
    this.sparkleIntensity = props.sparkleIntensity ?? 0.45
    this.crystalDetail = props.crystalDetail ?? 0.7
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(360, Math.floor(340 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(340 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.swayAmplitudes = new Float32Array(this.capacity)
    this.swayPhases = new Float32Array(this.capacity)
    this.rotAngles = new Float32Array(this.capacity)
    this.rotSpeeds = new Float32Array(this.capacity)
    this.life = new Float32Array(this.capacity)
    this.maxLife = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.depthPlanes = new Uint8Array(this.capacity)
    this.crystalWeights = new Float32Array(this.capacity)
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
        uCrystalDetail: { value: this.crystalDetail },
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
        uniform float uCrystalDetail;
        uniform int uQualityLevel;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float alpha = vData.x;
          float seed = vData.y;
          float dofBlur = vData.z;
          float crystalAmount = vData.w * uCrystalDetail;

          if (alpha <= 0.004) discard;

          float r = length(p);
          if (r > 1.0) discard;

          float shapeAlpha = 0.0;

          if (dofBlur > 0.45) {
            // Disque bokeh doux de premier plan hors-focus
            float softEdge = 1.0 - smoothstep(0.45, 0.98, r);
            float bokehRing = smoothstep(0.38, 0.72, r) * (1.0 - smoothstep(0.75, 0.98, r));
            shapeAlpha = mix(softEdge * 0.65, softEdge * 0.52 + bokehRing * 0.25, dofBlur);
          } else {
            // Noyau floconneux doux
            float edgeSoftness = mix(0.28, 0.68, dofBlur);
            float softDisc = exp(-r * r * mix(5.2, 2.8, dofBlur)) * (1.0 - smoothstep(0.75, 1.0, r));
            shapeAlpha = softDisc;

            // Cristaux hexagonaux et dendrites pour les gros flocons nets (HIGH & MEDIUM)
            if (uQualityLevel >= 1 && crystalAmount > 0.15) {
              float angle = atan(p.y, p.x);
              // Symétrie hexagonale à 6 branches
              float hex = abs(cos(angle * 3.0));
              float mainArm = pow(hex, 7.0) * (1.0 - smoothstep(0.15, 0.92, r));

              // Ramifications secondaires sur HIGH
              float branch = 0.0;
              if (uQualityLevel >= 2) {
                float sectorAngle = mod(angle + 3.14159265 / 6.0, 3.14159265 / 3.0) - 3.14159265 / 6.0;
                float proj = r * cos(sectorAngle);
                float perp = abs(r * sin(sectorAngle));
                float barbCoord = abs(perp - (proj - 0.34) * 0.68);
                float barb = (1.0 - smoothstep(0.02, 0.09, barbCoord)) * step(0.28, proj) * (1.0 - smoothstep(0.68, 0.88, r));
                float hexPlate = 1.0 - smoothstep(0.22 - edgeSoftness * 0.1, 0.36, max(abs(p.x) * 0.866 + abs(p.y) * 0.5, abs(p.y)));
                branch = (barb * 0.55 + hexPlate * 0.45) * (0.7 + 0.3 * sin(seed * 4.0));
              }

              float crystalShape = clamp(mainArm * 0.8 + branch + exp(-r * r * 14.0) * 0.6, 0.0, 1.0);
              shapeAlpha = mix(softDisc, crystalShape, crystalAmount);
            }
          }

          if (shapeAlpha <= 0.005) discard;
          gl_FragColor = vec4(vColor, clamp(shapeAlpha * alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 21
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 13 : 6.0 + Math.random() * 2.0

    // 3 plans de profondeur distincts :
    // ~45% arrière-plan lointain (petits, lents, discrets)
    // ~40% plan médian net (flocons moyens et grands cristaux)
    // ~15% premier plan très proche (flou bokeh large et translucide)
    const planeRand = Math.random()
    let plane = 1
    let size = 0.16
    let mass = 1.0
    let crystal = 0.0

    if (planeRand < 0.45) {
      plane = 0
      this.positions[idx3 + 2] = -14 * this.depthFactor + Math.random() * (5 * this.depthFactor)
      size = 0.09 + Math.random() * 0.07
      mass = 0.65 + Math.random() * 0.25
      crystal = 0.0
    } else if (planeRand < 0.85) {
      plane = 1
      this.positions[idx3 + 2] = -7 * this.depthFactor + Math.random() * (4.5 * this.depthFactor)
      const isLargeCrystal = Math.random() > 0.58
      size = isLargeCrystal ? 0.24 + Math.random() * 0.11 : 0.14 + Math.random() * 0.08
      mass = isLargeCrystal ? 1.15 + Math.random() * 0.25 : 0.9 + Math.random() * 0.2
      crystal = isLargeCrystal ? 0.65 + Math.random() * 0.35 : 0.0
    } else {
      plane = 2
      this.positions[idx3 + 2] = -1.2 * this.depthFactor + Math.random() * (2.6 * this.depthFactor)
      size = 0.38 + Math.random() * 0.26
      mass = 1.3 + Math.random() * 0.35
      crystal = 0.0 // Premier plan hors-focus -> bokeh doux sans dendrites nettes
    }

    this.depthPlanes[i] = plane
    this.baseScales[i] = size
    this.crystalWeights[i] = crystal

    this.velocities[idx3] = this.windStrength * (0.28 + 0.15 * mass)
    this.velocities[idx3 + 1] = -(0.35 + mass * 0.32) * this.speed
    this.velocities[idx3 + 2] = 0

    this.swayAmplitudes[i] = (0.15 + Math.random() * 0.45) * (0.3 + this.randomness)
    this.swayPhases[i] = Math.random() * Math.PI * 2
    this.rotAngles[i] = Math.random() * Math.PI * 2
    this.rotSpeeds[i] = (Math.random() - 0.5) * 0.85

    const maxLifeSec = 14.0 + Math.random() * 9.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.5)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    // Rafales de vent progressives
    const windGust =
      this.windStrength * (0.38 + 0.22 * Math.sin(time * 0.35) + 0.12 * Math.sin(time * 0.91))

    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'
    const eps = 0.15

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]
      const phase = this.swayPhases[i]

      // Turbulence de type curl (tourbillons cohérents sans divergence) sur HIGH
      let curlX = 0
      let curlY = 0
      if (isHigh) {
        const s = 0.22
        const t = time * 0.18
        const n1 = simplex3D(px * s, (py + eps) * s, t)
        const n2 = simplex3D(px * s, (py - eps) * s, t)
        const n3 = simplex3D((px + eps) * s, py * s, t)
        const n4 = simplex3D((px - eps) * s, py * s, t)
        const dPsiDy = (n1 - n2) / (2.0 * eps)
        const dPsiDx = (n3 - n4) / (2.0 * eps)
        curlX = dPsiDy * 0.35 * this.randomness
        curlY = -dPsiDx * 0.2 * this.randomness
      } else if (!isLow) {
        const n = simplex3D(px * 0.2, py * 0.2, time * 0.18)
        curlX = n * 0.3 * this.randomness
        curlY = Math.cos(time * 0.9 + phase) * 0.08 * this.randomness
      }

      const sway = Math.sin(time * this.swayFrequency + phase) * this.swayAmplitudes[i]

      let repulseX = 0
      let repulseY = 0
      if (!isLow) {
        const dx = px - mouseWorldX
        const dy = py - mouseWorldY
        const distSq = dx * dx + dy * dy
        if (distSq < 6.0 && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const force = (1.0 - dist / 2.45) * 0.8
          repulseX = (dx / dist) * force
          repulseY = (dy / dist) * force
        }
      }

      const plane = this.depthPlanes[i]
      const planeParallax = plane === 2 ? 1.35 : plane === 1 ? 1.0 : 0.7

      this.positions[idx3] +=
        (windGust * planeParallax + sway + curlX + repulseX) * delta * 2.0 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + curlY + repulseY) * delta * 2.0 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -6.8) {
        this.resetParticle(i, false)
        continue
      }
      if (this.positions[idx3] > 12.5) this.positions[idx3] = -12.5
      if (this.positions[idx3] < -12.5) this.positions[idx3] = 12.5

      this.rotAngles[i] += this.rotSpeeds[i] * delta

      const lifeProgress = this.life[i] / this.maxLife[i]
      let lifeFade = 1.0
      if (lifeProgress < 0.12) {
        lifeFade = lifeProgress / 0.12
      } else if (lifeProgress > 0.85) {
        lifeFade = (1.0 - lifeProgress) / 0.15
      }

      // Profondeur de champ (bokeh au premier plan, net au plan médian, brumeux au loin)
      let dofBlur = 0.12
      let planeAlpha = 0.85
      if (plane === 0) {
        dofBlur = 0.35
        planeAlpha = 0.45
      } else if (plane === 2) {
        dofBlur = 0.82
        planeAlpha = 0.36
      }

      // Scintillement cristallin bref (glint spéculaire sur cristaux en rotation)
      const sparklePulse = Math.pow(Math.max(0, Math.sin(time * 2.6 + phase * 5.3)), 16.0)
      const sparkleBoost = 1.0 + sparklePulse * this.sparkleIntensity * (plane === 1 ? 1.3 : 0.4)

      const finalAlpha = Math.min(
        1.0,
        planeAlpha * lifeFade * Math.min(1.4, 0.55 + 0.45 * this.intensity)
      )

      this.instanceColors[idx3] = Math.min(1.8, this.snowColor.r * sparkleBoost)
      this.instanceColors[idx3 + 1] = Math.min(1.8, this.snowColor.g * sparkleBoost)
      this.instanceColors[idx3 + 2] = Math.min(1.8, this.snowColor.b * sparkleBoost)

      this.instanceData[idx4] = finalAlpha
      this.instanceData[idx4 + 1] = phase
      this.instanceData[idx4 + 2] = dofBlur
      this.instanceData[idx4 + 3] = this.crystalWeights[i]

      const depthScale = THREE.MathUtils.mapLinear(pz, -14 * this.depthFactor, 2.5, 0.72, 1.35)
      const scale =
        this.baseScales[i] *
        Math.min(1.4, 0.55 + 0.45 * this.intensity) *
        depthScale *
        this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.set(0, 0, this.rotAngles[i])
      this.dummy.scale.set(scale, scale, scale)
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

  public updateProps(newProps: Partial<SnowProps>): void {
    if (newProps.snowColor !== undefined) {
      this.snowColor.set(newProps.snowColor)
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.windStrength !== undefined) this.windStrength = newProps.windStrength
    if (newProps.swayFrequency !== undefined) this.swayFrequency = newProps.swayFrequency
    if (newProps.sparkleIntensity !== undefined) this.sparkleIntensity = newProps.sparkleIntensity
    if (newProps.crystalDetail !== undefined) {
      this.crystalDetail = newProps.crystalDetail
      if (this.material) {
        this.material.uniforms.uCrystalDetail.value = this.crystalDetail
      }
    }

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(340 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(180 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(90 * this.density * mobileRatio))
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
      this.material = null
    }
  }
}

export const SnowDefinition: IBrickDefinition<SnowProps> = {
  type: 'snow',
  category: 'particles',
  create: (id, props, context) => new SnowInstance(id, props, context),
}

BrickRegistry.register(SnowDefinition)
