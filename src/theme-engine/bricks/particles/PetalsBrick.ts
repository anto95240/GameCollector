/**
 * src/theme-engine/bricks/particles/PetalsBrick.ts
 *
 * Brique de Particules : Pétales de Cerisier en Fleur / Sakura (Couche 3 : Particles).
 * Pétales fins, élancés et translucides avec encoche sakura délicate,
 * chute lente et aérienne sur trajectoire en spirale 3D douce, rotation 3D lente
 * sur les trois axes et éclat soyeux rétro-éclairé selon l'inclinaison.
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

export interface PetalsProps {
  /** Teinte dominante des pétales de fleur (défaut: '#f472b6'). */
  petalColor?: string
  /** Teinte accentuée plus vive pour la base (défaut: '#fb7185'). */
  accentColor?: string
  /** Multiplicateur de densité/nombre de pétales (0.2 à 2.5, défaut: 1.0 -> 130 pétales). */
  density?: number
  /** Vitesse de descente lente (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Douceur et éclat général (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Variabilité des tournoiements (0.0 à 1.0, défaut: 0.45). */
  randomness?: number
  /** Amplitude de vrille et rotation 3D (0.2 à 2.0, défaut: 1.0). */
  curlAmount?: number
  /** Vitesse de dérive latérale sous la brise (0.0 à 1.5, défaut: 0.4). */
  windSpeed?: number
  /** Translucidité soyeuse des pétales (0.2 à 1.0, défaut: 0.75). */
  translucency?: number
}

export class PetalsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'petals'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array // ancres [x, y, z]
  private velocities: Float32Array
  private rotations: Float32Array // [rx, ry, rz]
  private rotVelocities: Float32Array // [vrx, vry, vrz]
  private spiralPhases: Float32Array
  private spiralFreqs: Float32Array
  private spiralRadii: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseColors: Float32Array // [petalR, petalG, petalB]
  private accentColors: Float32Array // [accR, accG, accB]
  private instanceColors: Float32Array
  private instanceAccentColors: Float32Array
  private instanceData: Float32Array // [alpha, lightDot, seed, depthSoftness]

  private petalColor: THREE.Color
  private accentColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private curlAmount: number
  private windSpeed: number
  private translucency: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private pearlColor = new THREE.Color('#fff1f2')
  private lightDir = new THREE.Vector3(0.35, 0.85, 0.5).normalize()
  private petalNormal = new THREE.Vector3()
  private euler = new THREE.Euler()
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
    this.translucency = THREE.MathUtils.clamp(props.translucency ?? 0.75, 0.2, 1.0)
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(160, Math.floor(130 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(130 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.rotations = new Float32Array(this.capacity * 3)
    this.rotVelocities = new Float32Array(this.capacity * 3)
    this.spiralPhases = new Float32Array(this.capacity)
    this.spiralFreqs = new Float32Array(this.capacity)
    this.spiralRadii = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.life = new Float32Array(this.capacity)
    this.maxLife = new Float32Array(this.capacity)
    this.baseColors = new Float32Array(this.capacity * 3)
    this.accentColors = new Float32Array(this.capacity * 3)
    this.instanceColors = new Float32Array(this.capacity * 3)
    this.instanceAccentColors = new Float32Array(this.capacity * 3)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const colorAttr = new THREE.InstancedBufferAttribute(this.instanceColors, 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aColor', colorAttr)

    const accentAttr = new THREE.InstancedBufferAttribute(this.instanceAccentColors, 3)
    accentAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aAccent', accentAttr)

    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: this.intensity },
        uTranslucency: { value: this.translucency },
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec3 aAccent;
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vAccent;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vColor = aColor;
          vAccent = aAccent;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        uniform float uTranslucency;
        uniform int uQualityLevel;

        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vAccent;
        varying vec4 vData;

        void main() {
          float alpha = vData.x;
          if (alpha <= 0.004) discard;

          float lightDot = vData.y;
          float seed = vData.z;
          float softness = vData.w;

          vec2 p = (vUv - 0.5) * 2.0;

          // Silhouette fine et élancée de pétale de cerisier (base effilée, pointe échancrée)
          float t = clamp((p.y + 0.86) / 1.72, 0.0, 1.0);
          if (p.y < -0.86 || p.y > 0.86) discard;

          // Profil élancé (demi-largeur max ~0.39 pour une hauteur de 1.72)
          float curveOffset = 0.045 * sin(t * 3.14159 + seed);
          float halfW = pow(sin(t * 3.14159), 0.72) * (0.26 + 0.16 * t);

          // Encoche sakura délicate au sommet (t > 0.78)
          float tipNotch = smoothstep(0.76, 1.0, t) * exp(-abs(p.x - curveOffset) * 14.0) * 0.24;
          float topCap = p.y - (0.86 - tipNotch);
          if (topCap > 0.04) discard;

          float distX = abs(p.x - curveOffset) - halfW;
          float feather = mix(0.032, 0.09, softness);
          float edgeX = 1.0 - smoothstep(-feather, feather, distX);
          float edgeTop = 1.0 - smoothstep(-feather * 0.8, feather, topCap);
          float edgeBot = smoothstep(0.0, 0.06, t);
          float petalMask = edgeX * edgeTop * edgeBot;

          if (petalMask <= 0.005) discard;

          // Dégradé soyeux : cœur coloré à la base -> rose nacré presque translucide au bord
          vec3 col = mix(vAccent, vColor, smoothstep(0.05, 0.55, t));
          col = mix(col, vec3(1.0, 0.95, 0.97), smoothstep(0.45, 0.96, t) * 0.44);

          // Micro-nervures délicates sur HIGH
          if (uQualityLevel >= 2) {
            float vein = exp(-abs(p.x - curveOffset) * 42.0) * (1.0 - t * 0.5);
            float sideVein = exp(-abs(abs(p.x - curveOffset) - t * 0.14) * 48.0) * 0.55;
            col = mix(col, vec3(1.0, 0.96, 0.98), max(vein, sideVein) * 0.18);
          }

          // Translucidité et éclat nacré selon l'inclinaison 3D face à la lumière
          float sheen = mix(0.76, 1.18, clamp(0.5 + 0.5 * lightDot, 0.0, 1.0));
          float edgeScatter = (1.0 - abs(lightDot)) * 0.24 * uTranslucency;
          col = col * sheen * clamp(0.7 + 0.3 * uIntensity, 0.3, 1.7) + vec3(1.0, 0.92, 0.96) * edgeScatter;

          // Opacité fine et translucide (plus fine au sommet et sous forte translucidité)
          float laminaAlpha = mix(0.86, 0.52, uTranslucency) * mix(1.0, 0.78, t * 0.55);
          float outAlpha = clamp(petalMask * laminaAlpha * alpha, 0.0, 1.0);

          gl_FragColor = vec4(col, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    this.updateBaseColors()

    for (let i = 0; i < this.capacity; i++) {
      this.seeds[i] = Math.random() * 600
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private updateBaseColors(): void {
    for (let i = 0; i < this.capacity; i++) {
      const mixRatio = Math.random() * 0.55
      this.tempColor.copy(this.petalColor).lerp(this.pearlColor, mixRatio * 0.45)
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b

      this.tempColor.copy(this.accentColor).lerp(this.petalColor, Math.random() * 0.35)
      this.accentColors[cIdx] = this.tempColor.r
      this.accentColors[cIdx + 1] = this.tempColor.g
      this.accentColors[cIdx + 2] = this.tempColor.b
    }
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 19.0
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 13.5 : 7.0 + Math.random() * 2.0
    this.positions[idx3 + 2] = -11 * this.depthFactor + Math.random() * (4.5 * this.depthFactor)

    // Chute plus lente et douce
    this.velocities[idx3] = this.windSpeed * (0.28 + Math.random() * 0.14)
    this.velocities[idx3 + 1] = -(0.18 + Math.random() * 0.18) * this.speed
    this.velocities[idx3 + 2] = 0

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    // Rotation 3D lente sur les trois axes
    this.rotVelocities[idx3] = (Math.random() - 0.5) * 0.65 * this.curlAmount
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 0.85 * this.curlAmount
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 0.5 * this.curlAmount

    this.spiralPhases[i] = Math.random() * Math.PI * 2
    this.spiralFreqs[i] = (0.7 + Math.random() * 0.75) * (0.75 + this.curlAmount * 0.35)
    this.spiralRadii[i] = (0.28 + Math.random() * 0.45) * (0.65 + this.curlAmount * 0.4)

    const maxLifeSec = 16.0 + Math.random() * 10.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // Pétales fins et délicats (bien plus petits que les anciens cœurs géants)
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.5) {
      size = 0.13 + Math.random() * 0.07
    } else if (tierRand < 0.85) {
      size = 0.21 + Math.random() * 0.09
    } else {
      size = 0.31 + Math.random() * 0.09
    }
    this.baseScales[i] = size
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.4)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0
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
      const seed = this.seeds[i]
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]

      const helicalNoise = isLow ? 0 : simplex3D(px * 0.16, py * 0.16, time * 0.2 + seed)

      const spiralAngle = time * this.spiralFreqs[i] + this.spiralPhases[i] + helicalNoise * 1.1
      const spiralX = Math.cos(spiralAngle) * this.spiralRadii[i]
      const spiralZ = Math.sin(spiralAngle) * this.spiralRadii[i] * 0.75

      const breeze = isHigh
        ? simplex3D(px * 0.14, time * 0.18, seed + 10.0) * 0.32 * this.randomness
        : 0

      // Répulsion douce à la souris
      const dx = px + spiralX - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0
      if (distSq < 5.5 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.35) * 0.95
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      // Portance en spirale douce : ralentit légèrement la descente lors des virages de spirale
      const glideLift = Math.abs(Math.sin(spiralAngle)) * 0.08 * this.speed

      this.positions[idx3] +=
        (this.velocities[idx3] + breeze + repulseX) * delta * 1.4 * this.surgeMultiplier
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + glideLift + repulseY) * delta * 1.4 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -7.4) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 11.5) this.positions[idx3] = -11.5
      if (this.positions[idx3] < -11.5) this.positions[idx3] = 11.5

      // Rotation 3D lente et fluide couplée à l'angle de spirale
      this.rotations[idx3] += this.rotVelocities[idx3] * delta * this.surgeMultiplier
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta * this.surgeMultiplier
      this.rotations[idx3 + 2] +=
        (this.rotVelocities[idx3 + 2] + Math.cos(spiralAngle) * 0.25) * delta

      const renderX = this.positions[idx3] + spiralX
      const renderZ = pz + spiralZ

      this.euler.set(this.rotations[idx3], this.rotations[idx3 + 1], this.rotations[idx3 + 2])
      this.petalNormal.set(0, 0, 1).applyEuler(this.euler)
      const lightDot = this.petalNormal.dot(this.lightDir)

      const depthFactor = THREE.MathUtils.mapLinear(renderZ, -12 * this.depthFactor, 2, 0.58, 1.28)
      const depthOpacity = THREE.MathUtils.mapLinear(renderZ, -12 * this.depthFactor, 2, 0.55, 1.0)
      const depthSoftness = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(renderZ, -12 * this.depthFactor, 2, 0.4, 0.0),
        0,
        0.5
      )

      let lifeFade = 1.0
      if (progress < 0.12) {
        lifeFade = progress / 0.12
      } else if (progress > 0.84) {
        lifeFade = (1.0 - progress) / 0.16
      }

      this.instanceColors[idx3] = this.baseColors[idx3] * depthOpacity
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1] * depthOpacity
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2] * depthOpacity

      this.instanceAccentColors[idx3] = this.accentColors[idx3] * depthOpacity
      this.instanceAccentColors[idx3 + 1] = this.accentColors[idx3 + 1] * depthOpacity
      this.instanceAccentColors[idx3 + 2] = this.accentColors[idx3 + 2] * depthOpacity

      this.instanceData[idx4] = Math.max(0, Math.min(1, lifeFade * depthOpacity))
      this.instanceData[idx4 + 1] = lightDot
      this.instanceData[idx4 + 2] = seed
      this.instanceData[idx4 + 3] = depthSoftness

      const scale = this.baseScales[i] * Math.min(1.0, lifeFade + 0.3) * depthFactor
      this.dummy.position.set(renderX, this.positions[idx3 + 1], renderZ)
      this.dummy.rotation.set(
        this.rotations[idx3],
        this.rotations[idx3 + 1],
        this.rotations[idx3 + 2]
      )
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = this.activeCount; i < this.capacity; i++) {
      this.instanceData[i * 4] = 0
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
    const colorAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute
    if (colorAttr) colorAttr.needsUpdate = true
    const accentAttr = this.mesh.geometry.getAttribute('aAccent') as THREE.InstancedBufferAttribute
    if (accentAttr) accentAttr.needsUpdate = true
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    if (dataAttr) dataAttr.needsUpdate = true
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

    if (newProps.speed !== undefined) {
      const ratio = this.speed > 0.001 ? newProps.speed / this.speed : 1.0
      this.speed = newProps.speed
      for (let i = 0; i < this.capacity; i++) {
        this.velocities[i * 3 + 1] *= ratio
      }
    }
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.material) this.material.uniforms.uIntensity.value = this.intensity
    }
    if (newProps.translucency !== undefined) {
      this.translucency = THREE.MathUtils.clamp(newProps.translucency, 0.2, 1.0)
      if (this.material) this.material.uniforms.uTranslucency.value = this.translucency
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
      this.activeCount = Math.min(this.capacity, Math.floor(130 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(75 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(38 * this.density * mobileRatio))
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
    this.surgeMultiplier = 1.7
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) {
        this.material.dispose()
        this.material = null
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
