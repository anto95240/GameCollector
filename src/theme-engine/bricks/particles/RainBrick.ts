/**
 * src/theme-engine/bricks/particles/RainBrick.ts
 *
 * Brique de Particules : Pluie Battante & Averse Cinématique (Couche 3 : Particles).
 * Traînées avec flou de mouvement orientées dynamiquement selon le vent réel et les rafales,
 * gouttes de tailles variées réparties sur 3 plans de profondeur (brume lointaine, plan médian,
 * premier plan rapide), rafales d'intensité périodiques et micro-éclaboussures au sol (HIGH/MEDIUM).
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

export interface RainProps {
  /** Teinte des gouttes de pluie (défaut: '#93c5fd'). */
  rainColor?: string
  /** Multiplicateur de densité/nombre de gouttes (0.2 à 2.5, défaut: 1.0 -> 280 gouttes). */
  density?: number
  /** Vitesse de chute de l'averse (0.2 à 3.0, défaut: 1.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Opacité et éclat lumineux des gouttes (0.2 à 2.0, défaut: 0.9). */
  intensity?: number
  /** Dispersion de longueur et vitesse (0.0 à 1.0, défaut: 0.35). */
  randomness?: number
  /** Angle d'inclinaison sous le vent en radians (-0.8 à 0.8, défaut: 0.18). */
  windAngle?: number
  /** Facteur d'étirement en longueur des traits de pluie (0.4 à 2.5, défaut: 1.2). */
  streakLength?: number
  /** Intensité des éclaboussures au sol (0.0 à 1.5, défaut: 0.85). */
  splashIntensity?: number
  /** Amplitude des rafales d'intensité et de vent (0.0 à 1.5, défaut: 0.6). */
  gustStrength?: number
}

const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(25)) // Caméra 50° FOV

export class RainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'rain'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private splashMesh: THREE.InstancedMesh | null = null
  private splashMaterial: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene

  private capacity: number
  private activeCount: number
  private splashCapacity = 100
  private activeSplashLimit = 90
  private splashCursor = 0

  private positions: Float32Array
  private dropSpeeds: Float32Array
  private lengths: Float32Array
  private widths: Float32Array
  private depthPlanes: Uint8Array // 0 = far, 1 = mid, 2 = fore
  private impactYs: Float32Array
  private seeds: Float32Array
  private instanceData: Float32Array // [alpha, blur, spec, seed]

  // Buffers éclaboussures
  private splashPos: Float32Array
  private splashLife: Float32Array
  private splashMaxLife: Float32Array
  private splashScales: Float32Array
  private splashData: Float32Array // [progress, alpha, seed, unused]

  private rainColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private windAngle: number
  private streakLength: number
  private splashIntensity: number
  private gustStrength: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: RainProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.rainColor = new THREE.Color(props.rainColor ?? '#93c5fd')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 1.6
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 0.9
    this.randomness = props.randomness ?? 0.35
    this.windAngle = props.windAngle ?? 0.18
    this.streakLength = props.streakLength ?? 1.2
    this.splashIntensity = props.splashIntensity ?? 0.85
    this.gustStrength = props.gustStrength ?? 0.6
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(320, Math.floor(280 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.dropSpeeds = new Float32Array(this.capacity)
    this.lengths = new Float32Array(this.capacity)
    this.widths = new Float32Array(this.capacity)
    this.depthPlanes = new Uint8Array(this.capacity)
    this.impactYs = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.instanceData = new Float32Array(this.capacity * 4)

    this.splashPos = new Float32Array(this.splashCapacity * 3)
    this.splashLife = new Float32Array(this.splashCapacity)
    this.splashMaxLife = new Float32Array(this.splashCapacity)
    this.splashScales = new Float32Array(this.splashCapacity)
    this.splashData = new Float32Array(this.splashCapacity * 4)
    this.splashLife.fill(999)

    // 1. Maillage des traînées de pluie avec flou de mouvement
    const geometry = new THREE.PlaneGeometry(1, 1)
    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.rainColor },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          float alpha = vData.x;
          float blur = vData.y;
          float spec = vData.z;

          if (alpha <= 0.004) discard;

          // Profil transversal gaussien (flou de mouvement latéral + cœur net)
          float dx = abs(vUv.x - 0.5) * 2.0;
          float widthSharpness = mix(4.8, 2.0, blur);
          float crossMask = exp(-dx * dx * widthSharpness) * (1.0 - smoothstep(0.65, 1.0, dx));

          // Enveloppe longitudinale : queue fine qui s'estompe en haut (vUv.y -> 1), tête dense en bas (vUv.y -> 0.14)
          float headFade = smoothstep(0.0, 0.16, vUv.y);
          float tailFade = pow(max(0.0, 1.0 - vUv.y), 1.35);
          float longitudinal = headFade * (0.28 + 0.72 * tailFade);

          // Micro-reflet spéculaire près de la tête de goutte
          float glint = exp(-pow((vUv.y - 0.16) * 5.0, 2.0)) * exp(-dx * dx * 8.0) * spec;
          vec3 col = mix(uColor, vec3(0.95, 0.98, 1.0), clamp(glint * 0.85, 0.0, 0.85));

          float outAlpha = clamp(crossMask * longitudinal * alpha + glint * alpha * 0.35, 0.0, 1.0);
          if (outAlpha <= 0.004) discard;
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

    // 2. Maillage des éclaboussures au sol (couronne d'impact + micro-gouttelettes)
    const splashGeo = new THREE.PlaneGeometry(1, 1)
    const splashAttr = new THREE.InstancedBufferAttribute(this.splashData, 4)
    splashAttr.setUsage(THREE.DynamicDrawUsage)
    splashGeo.setAttribute('aSplash', splashAttr)

    this.splashMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.rainColor },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSplash;
        varying vec2 vUv;
        varying vec4 vSplash;

        void main() {
          vUv = uv;
          vSplash = aSplash;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec4 vSplash;

        void main() {
          float p = vSplash.x;
          float alpha = vSplash.y;
          float seed = vSplash.z;

          if (alpha <= 0.004 || p >= 1.0) discard;

          vec2 uv = (vUv - 0.5) * 2.0;

          // Anneau elliptique plat au sol qui s'élargit
          vec2 ringUv = vec2(uv.x, (uv.y + 0.35) * 2.4);
          float rRing = length(ringUv);
          float ringRadius = mix(0.12, 0.88, p);
          float ringWidth = mix(0.14, 0.05, p);
          float ring = exp(-pow((rRing - ringRadius) / ringWidth, 2.0));

          // Couronne de micro-gouttelettes rebondissantes au-dessus du point d'impact
          float arcLift = sin(p * 3.14159265) * 0.52;
          vec2 d1 = uv - vec2(-0.22 - p * 0.25, -0.25 + arcLift);
          vec2 d2 = uv - vec2(0.24 + p * 0.22, -0.22 + arcLift * 0.9);
          vec2 d3 = uv - vec2(sin(seed * 7.0) * 0.14, -0.18 + arcLift * 1.15);
          float droplets = exp(-dot(d1, d1) * 42.0) + exp(-dot(d2, d2) * 42.0) + exp(-dot(d3, d3) * 48.0);

          float mask = clamp(ring * 0.85 + droplets * 0.75, 0.0, 1.0);
          float fade = (1.0 - p) * (1.0 - p);
          float outAlpha = mask * fade * alpha;
          if (outAlpha <= 0.004) discard;

          vec3 col = mix(uColor, vec3(0.95, 0.98, 1.0), 0.45);
          gl_FragColor = vec4(col, clamp(outAlpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.splashMesh = new THREE.InstancedMesh(splashGeo, this.splashMaterial, this.splashCapacity)
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.splashMesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      this.seeds[i] = Math.random() * 100
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
    this.scene.add(this.splashMesh)
  }

  private getHalfHeightAtZ(z: number): number {
    return Math.max(1.5, (5.0 - z) * TAN_HALF_FOV)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3

    // 3 plans de profondeur : 0 = fond brumeux, 1 = médian, 2 = premier plan net/rapide
    const planeRand = Math.random()
    let plane = 1
    let z = -6 * this.depthFactor
    let sizeScale = 1.0
    let speedScale = 1.0

    if (planeRand < 0.42) {
      plane = 0
      z = -12 * this.depthFactor + Math.random() * (4 * this.depthFactor)
      sizeScale = 0.65
      speedScale = 0.68
    } else if (planeRand < 0.8) {
      plane = 1
      z = -6.5 * this.depthFactor + Math.random() * (3.5 * this.depthFactor)
      sizeScale = 1.0
      speedScale = 1.0
    } else {
      plane = 2
      z = -2.2 * this.depthFactor + Math.random() * (2.6 * this.depthFactor)
      sizeScale = 1.35
      speedScale = 1.32
    }

    this.depthPlanes[i] = plane
    const halfH = this.getHalfHeightAtZ(z)
    const halfW = halfH * 1.9

    this.positions[idx3] = (Math.random() - 0.5) * halfW * 2.4
    this.positions[idx3 + 1] = randomY
      ? (Math.random() - 0.5) * halfH * 2.2
      : halfH + 0.8 + Math.random() * 2.2
    this.positions[idx3 + 2] = z

    // Sol perspectif visible en bas de l'écran pour les éclaboussures
    this.impactYs[i] = -halfH * (0.76 + Math.random() * 0.2)

    this.dropSpeeds[i] =
      (3.4 + Math.random() * 2.2 * (0.3 + this.randomness)) * this.speed * speedScale
    this.lengths[i] =
      (0.55 + Math.random() * 0.65 * (0.4 + this.randomness)) * this.streakLength * sizeScale
    this.widths[i] = (0.022 + Math.random() * 0.024) * sizeScale
  }

  private spawnSplash(x: number, y: number, z: number, plane: number): void {
    if (this.activeSplashLimit <= 0 || this.splashIntensity <= 0.02) return
    const sIdx = this.splashCursor
    this.splashCursor = (this.splashCursor + 1) % this.activeSplashLimit

    const idx3 = sIdx * 3
    this.splashPos[idx3] = x
    this.splashPos[idx3 + 1] = y
    this.splashPos[idx3 + 2] = z
    this.splashLife[sIdx] = 0
    this.splashMaxLife[sIdx] = 0.24 + Math.random() * 0.16
    this.splashScales[sIdx] = (plane === 2 ? 0.34 : 0.22) * (0.65 + 0.35 * this.splashIntensity)
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 2.0)
    }

    const isLow = this.currentQuality === 'LOW'

    // Rafales d'intensité et de vent (modulation non-linéaire en vagues)
    const gustBase = 0.5 + 0.5 * Math.sin(time * 0.58)
    const gustDetail = isLow ? 0.0 : 0.32 * Math.sin(time * 1.47 + 0.9)
    const globalGust = THREE.MathUtils.clamp(gustBase + gustDetail, 0.0, 1.2)
    const gustTilt = this.gustStrength * 0.22 * (globalGust - 0.35)
    const dynamicWind = this.windAngle + interaction.mouseX * 0.12 + gustTilt
    const sinW = Math.sin(dynamicWind)
    const cosW = Math.cos(dynamicWind)

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const plane = this.depthPlanes[i]
      const pz = this.positions[idx3 + 2]

      // Rafale locale balayant latéralement la scène
      const localSquall = isLow
        ? 1.0
        : 1.0 +
          this.gustStrength *
            0.35 *
            Math.max(0, Math.sin(time * 0.85 - this.positions[idx3] * 0.22))

      const dropSpd = this.dropSpeeds[i] * localSquall * this.surgeMultiplier
      const vx = sinW * dropSpd
      const vy = -cosW * dropSpd

      const prevY = this.positions[idx3 + 1]
      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0

      const impactY = this.impactYs[i]
      // Éclaboussure quand une goutte médiane ou proche touche la bande de sol
      if (plane >= 1 && prevY >= impactY && this.positions[idx3 + 1] < impactY) {
        if (!isLow && Math.random() < 0.55) {
          this.spawnSplash(this.positions[idx3], impactY, pz, plane)
        }
        this.resetParticle(i, false)
        continue
      }

      const halfH = this.getHalfHeightAtZ(pz)
      if (this.positions[idx3 + 1] < -halfH - 1.2) {
        this.resetParticle(i, false)
        continue
      }

      const wrapW = halfH * 2.3
      if (this.positions[idx3] > wrapW) this.positions[idx3] = -wrapW
      if (this.positions[idx3] < -wrapW) this.positions[idx3] = wrapW

      // Opacité et flou selon le plan de profondeur + rafale
      let planeAlpha = 0.55
      let blur = 0.35
      let spec = 0.45
      if (plane === 0) {
        planeAlpha = 0.26
        blur = 0.65
        spec = 0.15
      } else if (plane === 2) {
        planeAlpha = 0.85
        blur = 0.22
        spec = 0.85
      }

      const gustAlpha = 0.78 + 0.35 * (localSquall - 1.0)
      const finalAlpha = Math.min(0.98, planeAlpha * this.intensity * gustAlpha)

      this.instanceData[idx4] = finalAlpha
      this.instanceData[idx4 + 1] = blur
      this.instanceData[idx4 + 2] = spec
      this.instanceData[idx4 + 3] = this.seeds[i]

      const length = this.lengths[i] * (0.88 + 0.2 * localSquall) * this.surgeMultiplier
      const width = this.widths[i]

      this.dummy.position.set(this.positions[idx3], this.positions[idx3 + 1], pz)
      this.dummy.rotation.set(0, 0, -dynamicWind)
      this.dummy.scale.set(width, length, 1)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.count = this.activeCount
    this.mesh.instanceMatrix.needsUpdate = true
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    dataAttr.needsUpdate = true

    // Mise à jour des éclaboussures au sol (HIGH & MEDIUM uniquement)
    if (this.splashMesh) {
      if (this.activeSplashLimit <= 0 || this.splashIntensity <= 0.02) {
        this.splashMesh.visible = false
      } else {
        this.splashMesh.visible = true
        let activeSplashes = 0
        for (let s = 0; s < this.activeSplashLimit; s++) {
          const life = this.splashLife[s]
          const maxLife = this.splashMaxLife[s]
          if (life >= maxLife || maxLife <= 0) continue

          this.splashLife[s] += delta
          const progress = this.splashLife[s] / maxLife
          if (progress >= 1.0) continue

          const s3 = s * 3
          const s4 = activeSplashes * 4
          this.splashData[s4] = progress
          this.splashData[s4 + 1] = Math.min(1.0, 0.72 * this.intensity * this.splashIntensity)
          this.splashData[s4 + 2] = s * 13.7
          this.splashData[s4 + 3] = 0

          const sc = this.splashScales[s] * (0.7 + 0.55 * progress)
          this.dummy.position.set(
            this.splashPos[s3],
            this.splashPos[s3 + 1],
            this.splashPos[s3 + 2]
          )
          this.dummy.rotation.set(0, 0, 0)
          this.dummy.scale.set(sc * 1.4, sc * 0.9, 1)
          this.dummy.updateMatrix()
          this.splashMesh.setMatrixAt(activeSplashes, this.dummy.matrix)
          activeSplashes++
        }

        this.splashMesh.count = activeSplashes
        if (activeSplashes > 0) {
          this.splashMesh.instanceMatrix.needsUpdate = true
          const splashAttr = this.splashMesh.geometry.getAttribute(
            'aSplash'
          ) as THREE.InstancedBufferAttribute
          splashAttr.needsUpdate = true
        }
      }
    }
  }

  public updateProps(newProps: Partial<RainProps>): void {
    if (newProps.rainColor !== undefined) {
      this.rainColor.set(newProps.rainColor)
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.windAngle !== undefined) this.windAngle = newProps.windAngle
    if (newProps.streakLength !== undefined) this.streakLength = newProps.streakLength
    if (newProps.splashIntensity !== undefined) this.splashIntensity = newProps.splashIntensity
    if (newProps.gustStrength !== undefined) this.gustStrength = newProps.gustStrength

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density * mobileRatio))
      this.activeSplashLimit = isMobile ? 45 : 90
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(155 * this.density * mobileRatio))
      this.activeSplashLimit = isMobile ? 25 : 45
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(70 * this.density * mobileRatio))
      this.activeSplashLimit = 0
    }

    if (this.mesh) {
      this.mesh.count = this.activeCount
    }
    if (this.splashMesh) {
      this.splashMesh.visible = this.activeSplashLimit > 0
      if (this.activeSplashLimit === 0) {
        this.splashMesh.count = 0
      }
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
    this.surgeMultiplier = 2.0
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.6
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
    if (this.splashMesh) {
      this.scene.remove(this.splashMesh)
      if (this.splashMesh.geometry) this.splashMesh.geometry.dispose()
      if (this.splashMesh.material) {
        if (Array.isArray(this.splashMesh.material)) {
          this.splashMesh.material.forEach((m) => m.dispose())
        } else {
          this.splashMesh.material.dispose()
        }
      }
      this.splashMesh = null
      this.splashMaterial = null
    }
  }
}

export const RainDefinition: IBrickDefinition<RainProps> = {
  type: 'rain',
  category: 'particles',
  create: (id, props, context) => new RainInstance(id, props, context),
}

BrickRegistry.register(RainDefinition)
