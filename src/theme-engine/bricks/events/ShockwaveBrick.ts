/**
 * src/theme-engine/bricks/events/ShockwaveBrick.ts
 *
 * Brique d'Événement Organique : Onde de Choc & Distorsion Explosive.
 * Onde de surpression annulaire en expansion radiale rapide depuis un épicentre,
 * avec compression optique, anneaux secondaires concentriques, aberration
 * chromatique spectrale RVB et dissipation non-linéaire.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export interface ShockwaveProps {
  /** Teinte de la crête luminescente de l'onde de choc (défaut #38bdf8). */
  ringColor?: string
  /** Densité et nombre d'ondes secondaires concentriques (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'expansion explosive radiale (0.2 à 3.0, défaut 1.2). */
  speed?: number
  /** Profondeur Z et réactivité à la parallaxe (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Radiance et puissance de distorsion de l'onde (0.2 à 2.5, défaut 1.2). */
  intensity?: number
  /** Asymétrie et turbulence de la circonférence (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Position horizontale X de l'épicentre (-1.0 à 1.0, défaut 0.0). */
  epicenterX?: number
  /** Position verticale Y de l'épicentre (-1.0 à 1.0, défaut 0.0). */
  epicenterY?: number
  /** Intervalle moyen en secondes entre ondes de choc (1.0 à 15.0, défaut 3.5). */
  waveInterval?: number
  /** Dispersion prismatique spectrale RVB (0.0 à 0.05, défaut 0.02). */
  chromaticAberration?: number
}

export class ShockwaveInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'shockwave'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ShockwaveProps
  private ringColorVec: THREE.Color

  private lastWaveTime = 0
  private manualTriggerTime = 0
  private manualEpicenter = new THREE.Vector2(0, 0)

  constructor(id: string, props: ShockwaveProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.ringColorVec = new THREE.Color(props.ringColor ?? '#38bdf8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.35
    const epicenterX = props.epicenterX ?? 0.0
    const epicenterY = props.epicenterY ?? 0.0
    const waveInterval = props.waveInterval ?? 3.5
    const chromaticAberration = props.chromaticAberration ?? 0.02

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uRingColor: { value: this.ringColorVec },
        uUseCustomColor: { value: Boolean(props.ringColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uEpicenter: { value: new THREE.Vector2(epicenterX, epicenterY) },
        uWaveInterval: { value: waveInterval },
        uChromaticAberration: { value: chromaticAberration },
        uWaveProgress: { value: 0.0 }, // 0.0 (détonation) à 1.0 (dissipation)
        uWaveSeed: { value: 1.0 },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.983, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uRingColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform vec2 uEpicenter;
        uniform float uWaveInterval;
        uniform float uChromaticAberration;
        uniform float uWaveProgress;
        uniform float uWaveSeed;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          p += uMouse * (uDepth * 0.15);

          float progress = uWaveProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          // Centre de l'épicentre
          vec2 center = uEpicenter * vec2(aspect * 0.5, 0.5);

          // Rayon courant d'expansion (décélération non-linéaire type blast wave)
          float currentRadius = pow(progress, 0.6) * 1.35;

          // Vecteur depuis l'épicentre
          vec2 toCenter = p - center;
          float dist = length(toCenter);
          float angle = atan(toCenter.y, toCenter.x);

          // Perturbation angulaire Simplex pour éviter un cercle mécanique
          float circleJitter = 0.0;
          if (uQualityLevel >= 1) {
            circleJitter = snoise(vec2(angle * 3.0, uWaveSeed)) * (0.04 * uRandomness);
          }

          float adjustedDist = dist + circleJitter;

          // Épaisseur du front d'onde (s'élargit en s'éloignant)
          float waveThickness = 0.015 + progress * 0.045;

          // Distance relative au front d'onde
          float deltaRing = abs(adjustedDist - currentRadius);

          // 1. Profil de luminosité de l'anneau principal
          float ringLight = exp(-pow(deltaRing / waveThickness, 2.0));

          // 2. Ondes secondaires concentriques (échos de compression)
          float echoRings = 0.0;
          if (uQualityLevel >= 1 && uDensity > 0.6) {
            float echoDist = adjustedDist - (currentRadius - waveThickness * 2.5);
            if (echoDist > 0.0 && adjustedDist < currentRadius) {
              echoRings = exp(-pow(echoDist / (waveThickness * 1.5), 2.0)) * 0.45;
            }
          }

          // 3. Dispersion chromatique RVB (PALIER HIGH)
          vec3 chromLight = vec3(ringLight);
          if (uQualityLevel >= 2 && uChromaticAberration > 0.001) {
            float rDist = abs(dist + circleJitter - (currentRadius - uChromaticAberration));
            float bDist = abs(dist + circleJitter - (currentRadius + uChromaticAberration));
            chromLight.r = exp(-pow(rDist / waveThickness, 2.0));
            chromLight.b = exp(-pow(bDist / waveThickness, 2.0));
          }

          // Halo d'énergie résiduelle au cœur de l'explosion
          float centerFlash = exp(-dist * 6.0) * exp(-progress * 8.0) * 0.7;

          // Atténuation temporelle de l'onde de choc (dissipation rapide)
          float lifeFade = (1.0 - progress) * smoothstep(0.0, 0.04, progress);

          float totalAlpha = (ringLight * 1.2 + echoRings + centerFlash) * lifeFade * uIntensity;
          totalAlpha = clamp(totalAlpha, 0.0, 0.95);

          if (totalAlpha <= 0.005) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uRingColor : uPaletteAccent;
          vec3 finalRgb = baseColor * chromLight + vec3(0.15) * centerFlash;

          gl_FragColor = vec4(finalRgb, totalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -6
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    if (!this.material) return

    const interval = this.props.waveInterval ?? 3.5
    const speed = this.props.speed ?? 1.2
    const duration = 1.1 / Math.max(0.3, speed)

    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < duration) {
      progress = timeSinceManual / duration
    } else {
      const cycleTime = time % (interval * 1.3)
      if (cycleTime < duration) {
        progress = cycleTime / duration
        if (Math.abs(time - this.lastWaveTime) > interval * 0.5) {
          this.lastWaveTime = time
          this.material.uniforms.uWaveSeed.value = Math.sin(time * 17.1) * 2345.0
          // Épicentre autonome avec légère dérive
          const defX = this.props.epicenterX ?? 0.0
          const defY = this.props.epicenterY ?? 0.0
          const jX = (Math.sin(time * 3.7) - 0.5) * 0.3 * (this.props.randomness ?? 0.35)
          const jY = (Math.cos(time * 4.1) - 0.5) * 0.3 * (this.props.randomness ?? 0.35)
          this.material.uniforms.uEpicenter.value.set(defX + jX, defY + jY)
        }
      }
    }

    this.material.uniforms.uWaveProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'shockwave' || event.type === 'aurora_surge') {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
      if (this.material) {
        this.material.uniforms.uWaveSeed.value = Math.random() * 666.0
        if (event.params?.x !== undefined && event.params?.y !== undefined) {
          this.manualEpicenter.set(Number(event.params.x), Number(event.params.y))
          this.material.uniforms.uEpicenter.value.copy(this.manualEpicenter)
        }
      }
    }
  }

  public updateProps(newProps: Partial<ShockwaveProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.ringColor !== undefined) {
      this.ringColorVec.set(newProps.ringColor)
      this.material.uniforms.uRingColor.value = this.ringColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.epicenterX !== undefined || newProps.epicenterY !== undefined) {
      this.material.uniforms.uEpicenter.value.set(
        newProps.epicenterX ?? this.props.epicenterX ?? 0.0,
        newProps.epicenterY ?? this.props.epicenterY ?? 0.0
      )
    }
    if (newProps.waveInterval !== undefined)
      this.material.uniforms.uWaveInterval.value = newProps.waveInterval
    if (newProps.chromaticAberration !== undefined)
      this.material.uniforms.uChromaticAberration.value = newProps.chromaticAberration
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    const tierVal = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    this.material.uniforms.uQualityLevel.value = tierVal
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) this.material.dispose()
      this.mesh = null
      this.material = null
    }
  }
}

export const ShockwaveDefinition: IBrickDefinition<ShockwaveProps> = {
  type: 'shockwave',
  category: 'events',
  create: (id, props, context) => new ShockwaveInstance(id, props, context),
}

BrickRegistry.register(ShockwaveDefinition)
