/**
 * src/theme-engine/bricks/events/ScreenShakeBrick.ts
 *
 * Brique d'Événement Organique : Tremblement Léger & Secousse Tellurique.
 * Secousse cinématique amortie (oscillateur harmonique exponentiel) agissant sur
 * la caméra Three.js (translations X, Y, recul Z, roulis rotZ), doublée d'un
 * voile de vibration optique avec répliques sismiques stochastiques (aftershocks).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export interface ScreenShakeProps {
  /** Teinte du voile tellurique ou flash d'impact (défaut #94a3b8). */
  shakeColor?: string
  /** Densité et fréquence des harmoniques de vibration (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Rapidité d'oscillation et vivacité de la secousse (0.2 à 3.0, défaut 1.2). */
  speed?: number
  /** Amplitude de recul Z et sensibilité de perspective (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Amplitude maximale du déplacement en secousse (0.1 à 2.5, défaut 1.0). */
  intensity?: number
  /** Asymétrie directionnelle et irrégularité Simplex (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Intervalle moyen en secondes entre secousses (1.0 à 15.0, défaut 4.5). */
  shakeInterval?: number
  /** Taux d'amortissement exponentiel de l'onde (1.0 à 8.0, défaut 3.5). */
  decayRate?: number
}

export class ScreenShakeInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'screen_shake'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private camera: THREE.Camera
  private props: ScreenShakeProps
  private shakeColorVec: THREE.Color

  private lastShakeTime = 0
  private manualTriggerTime = 0
  private currentProgress = 1.0

  // Sauvegarde des décalages précédents pour nettoyer proprement la caméra
  private prevOffsetX = 0
  private prevOffsetY = 0
  private prevOffsetZ = 0
  private prevRotZ = 0

  constructor(id: string, props: ScreenShakeProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.camera = context.camera

    this.shakeColorVec = new THREE.Color(props.shakeColor ?? '#94a3b8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5
    const shakeInterval = props.shakeInterval ?? 4.5
    const decayRate = props.decayRate ?? 3.5

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uShakeColor: { value: this.shakeColorVec },
        uUseCustomColor: { value: Boolean(props.shakeColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uShakeInterval: { value: shakeInterval },
        uDecayRate: { value: decayRate },
        uShakeProgress: { value: 1.0 }, // 0.0 (impact) à 1.0 (calme)
        uShakeMagnitude: { value: 0.0 },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.995, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uPaletteAccent;
        uniform vec3 uShakeColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uIntensity;
        uniform float uShakeMagnitude;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          float mag = uShakeMagnitude;
          if (mag <= 0.005) {
            discard;
          }

          // Voile de vibration cinématique de bordure
          vec2 centerDist = uv - vec2(0.5);
          float dist = length(centerDist);

          // Vignettage de choc optique
          float edgeShock = smoothstep(0.35, 0.75, dist) * mag * 0.8;

          // Micro-aberration sur les bords lors du pic de secousse
          float blurRing = 0.0;
          if (uQualityLevel >= 1) {
            float n = snoise(uv * 18.0 + uTime * 25.0) * 0.15;
            blurRing = edgeShock * (1.0 + n);
          } else {
            blurRing = edgeShock;
          }

          float alpha = clamp(blurRing * uIntensity, 0.0, 0.75);
          if (alpha <= 0.005) {
            discard;
          }

          vec3 baseCol = uUseCustomColor ? uShakeColor : uPaletteAccent;
          gl_FragColor = vec4(baseCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -2
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    const interval = this.props.shakeInterval ?? 4.5
    const speed = this.props.speed ?? 1.2
    const intensity = this.props.intensity ?? 1.0
    const randomness = this.props.randomness ?? 0.5
    const decayRate = this.props.decayRate ?? 3.5
    const duration = 1.3 / Math.max(0.3, speed)

    // Calcul de la progression de la secousse
    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < duration) {
      progress = timeSinceManual / duration
    } else {
      const cycleTime = time % (interval * 1.35)
      if (cycleTime < duration) {
        progress = cycleTime / duration
        if (Math.abs(time - this.lastShakeTime) > interval * 0.5) {
          this.lastShakeTime = time
        }
      }
    }

    this.currentProgress = progress

    // Annuler le décalage de la frame précédente sur la caméra
    this.camera.position.x -= this.prevOffsetX
    this.camera.position.y -= this.prevOffsetY
    this.camera.position.z -= this.prevOffsetZ
    this.camera.rotation.z -= this.prevRotZ

    let magnitude = 0.0

    if (progress < 1.0) {
      // Formule d'oscillateur harmonique amorti avec 2 répliques sismiques
      // t local en secondes
      const t = progress * duration
      const decay = Math.exp(-t * decayRate)

      // Fréquence d'oscillation rapide
      const freq = 28.0 * (this.props.density ?? 1.0) * speed

      // 1. Choc principal
      const shock1 = Math.sin(t * freq) * decay

      // 2. Réplique sismique secondaire (aftershock à t ~ 0.4s)
      let aftershock = 0.0
      if (t > 0.35) {
        const t2 = t - 0.35
        aftershock = Math.sin(t2 * freq * 0.8) * Math.exp(-t2 * (decayRate * 1.2)) * 0.45
      }

      magnitude = Math.abs(shock1) + Math.abs(aftershock)
      const displacement = (shock1 + aftershock) * intensity * 0.08

      // Calcul des composantes X, Y, Z, rotZ
      const angleDir = 0.4 + randomness * Math.sin(time * 12.3)
      const offX = Math.cos(angleDir) * displacement
      const offY = Math.sin(angleDir) * displacement * 0.8
      const offZ = (this.props.depth ?? 0.3) * displacement * 0.5
      const rotZ = displacement * 0.015 * (randomness > 0.3 ? 1.0 : 0.0)

      this.camera.position.x += offX
      this.camera.position.y += offY
      this.camera.position.z += offZ
      this.camera.rotation.z += rotZ

      this.prevOffsetX = offX
      this.prevOffsetY = offY
      this.prevOffsetZ = offZ
      this.prevRotZ = rotZ
    } else {
      this.prevOffsetX = 0
      this.prevOffsetY = 0
      this.prevOffsetZ = 0
      this.prevRotZ = 0
    }

    if (this.material) {
      this.material.uniforms.uShakeProgress.value = progress
      this.material.uniforms.uShakeMagnitude.value = magnitude * intensity
    }
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (
      event.type === 'shockwave' ||
      event.type === 'lightning' ||
      (event.params && event.params.type === 'shake')
    ) {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
    }
  }

  public updateProps(newProps: Partial<ScreenShakeProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.shakeColor !== undefined) {
      this.shakeColorVec.set(newProps.shakeColor)
      this.material.uniforms.uShakeColor.value = this.shakeColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.shakeInterval !== undefined)
      this.material.uniforms.uShakeInterval.value = newProps.shakeInterval
    if (newProps.decayRate !== undefined)
      this.material.uniforms.uDecayRate.value = newProps.decayRate
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    const tierVal = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    this.material.uniforms.uQualityLevel.value = tierVal
  }

  public dispose(): void {
    // Nettoyer la caméra
    if (this.camera) {
      this.camera.position.x -= this.prevOffsetX
      this.camera.position.y -= this.prevOffsetY
      this.camera.position.z -= this.prevOffsetZ
      this.camera.rotation.z -= this.prevRotZ
      this.prevOffsetX = 0
      this.prevOffsetY = 0
      this.prevOffsetZ = 0
      this.prevRotZ = 0
    }

    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) this.material.dispose()
      this.mesh = null
      this.material = null
    }
  }
}

export const ScreenShakeDefinition: IBrickDefinition<ScreenShakeProps> = {
  type: 'screen_shake',
  category: 'events',
  create: (id, props, context) => new ScreenShakeInstance(id, props, context),
}

BrickRegistry.register(ScreenShakeDefinition)
