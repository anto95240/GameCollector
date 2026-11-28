/**
 * src/theme-engine/bricks/events/ScreenShakeBrick.ts
 *
 * Brique d'Événement Organique : Tremblement Léger & Secousse Tellurique.
 * Secousse cinématique réaliste basée sur un modèle "trauma" à décroissance
 * quadratique (intensité au carré du choc), pilotée par un bruit continu
 * multi-fréquence non périodique (jamais sinusoïdal), avec légère rotation de
 * roulis et secousse globale de toute la scène (HIGH/MEDIUM via framebuffer,
 * LOW via caméra 3D pour un coût GPU nul).
 */

import * as THREE from 'three'

import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export interface ScreenShakeProps {
  /** Teinte du léger halo d'impact de bordure en mode repli (défaut #94a3b8). */
  shakeColor?: string
  /** Densité et fréquence des harmoniques de vibration (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Rapidité d'oscillation et vivacité de la secousse (0.2 à 3.0, défaut 1.2). */
  speed?: number
  /** Amplitude de recul Z / zoom et sensibilité de perspective (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Amplitude maximale du déplacement en secousse (0.1 à 2.5, défaut 1.0). */
  intensity?: number
  /** Asymétrie directionnelle et répliques sismiques (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Intervalle moyen en secondes entre secousses automatiques (1.0 à 15.0, défaut 4.5). */
  shakeInterval?: number
  /** Taux d'amortissement du trauma de choc (1.0 à 8.0, défaut 3.5). */
  decayRate?: number
  /** Amplitude relative de la légère rotation en roulis (0.0 à 2.0, défaut 1.0). */
  rotationIntensity?: number
  /** Exposant de décroissance du choc (1.0 à 3.0, défaut 2.0 = intensité au carré). */
  traumaPower?: number
}

// Bruit continu 1D lissé par interpolation Hermite (jamais périodique)
function hash1(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return (x - Math.floor(x)) * 2.0 - 1.0
}

function valueNoise1D(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3.0 - 2.0 * f)
  const a = hash1(i + seed * 17.31)
  const b = hash1(i + 1 + seed * 17.31)
  return a + (b - a) * u
}

function multiFreqNoise1D(t: number, seed: number): number {
  // 4 octaves à rapports non-entiers pour éviter toute périodicité visible
  return (
    valueNoise1D(t * 1.0, seed) * 0.52 +
    valueNoise1D(t * 2.37, seed + 11.7) * 0.27 +
    valueNoise1D(t * 5.19, seed + 29.3) * 0.14 +
    valueNoise1D(t * 10.73, seed + 53.9) * 0.07
  )
}

export class ScreenShakeInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'screen_shake'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private camera: THREE.Camera
  private props: ScreenShakeProps
  private shakeColorVec: THREE.Color
  private currentQuality: QualityTier

  private startTime: number | null = null
  private nextShakeTime = 1.35
  private trauma = 0.0
  private shakeSeed = 1.0
  private aftershockTime: number | null = null
  private pendingTrigger = false
  private activeDuration: number | null = null

  // Suivi du décalage Z caméra en mode LOW
  private prevOffsetZ = 0

  constructor(id: string, props: ScreenShakeProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.camera = context.camera
    this.currentQuality = context.quality

    this.shakeColorVec = new THREE.Color(props.shakeColor ?? '#94a3b8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5
    const shakeInterval = props.shakeInterval ?? 4.5
    const decayRate = props.decayRate ?? 3.5

    const geometry = new THREE.PlaneGeometry(2, 2)
    const qualityTier = context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0

    this.material = new THREE.ShaderMaterial({
      uniforms: {
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
        uShakeOffset: { value: new THREE.Vector2(0, 0) },
        uShakeRot: { value: 0.0 },
        uShakeZoom: { value: 1.0 },
        uShakeMagnitude: { value: 0.0 },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: { value: qualityTier },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.995, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec2 uResolution;
        uniform vec3 uPaletteAccent;
        uniform vec3 uShakeColor;
        uniform bool uUseCustomColor;
        uniform float uIntensity;
        uniform vec2 uShakeOffset;
        uniform float uShakeRot;
        uniform float uShakeZoom;
        uniform float uShakeMagnitude;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        void main() {
          float mag = uShakeMagnitude;
          if (mag <= 0.002) {
            discard;
          }

          vec2 uv = vUv;

          if (uHasScreenTex) {
            float aspect = uResolution.x / max(1.0, uResolution.y);
            // Centrage aspect-correct pour une rotation sans déformation géométrique
            vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
            float c = cos(uShakeRot);
            float s = sin(uShakeRot);
            vec2 rotated = vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y);

            // Léger zoom de sécurité + translation pour ne jamais révéler les bords
            vec2 shakenUv = (rotated * uShakeZoom) / vec2(aspect, 1.0) + 0.5 + uShakeOffset;
            shakenUv = clamp(shakenUv, vec2(0.001), vec2(0.999));

            vec4 baseSample = texture2D(uScreenTex, shakenUv);

            // Léger flou cinétique directionnel lors des pics violents en HIGH
            if (uQualityLevel >= 2 && mag > 0.25) {
              vec2 blurStep = uShakeOffset * 0.22;
              vec4 s1 = texture2D(uScreenTex, clamp(shakenUv + blurStep, vec2(0.001), vec2(0.999)));
              vec4 s2 = texture2D(uScreenTex, clamp(shakenUv - blurStep, vec2(0.001), vec2(0.999)));
              baseSample = baseSample * 0.55 + (s1 + s2) * 0.225;
            }

            gl_FragColor = baseSample;
          } else {
            // Palier LOW : micro-halo d'impact discret en bordure sans copie framebuffer
            float dist = length(uv - 0.5);
            float edge = smoothstep(0.42, 0.78, dist) * mag * 0.18 * uIntensity;
            if (edge <= 0.004) discard;
            vec3 baseCol = uUseCustomColor ? uShakeColor : uPaletteAccent;
            gl_FragColor = vec4(baseCol, clamp(edge, 0.0, 0.35));
          }
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.renderOrder = -2

    this.mesh.onBeforeRender = (renderer) => {
      if (!this.material) return
      if (this.currentQuality === 'LOW') {
        this.material.uniforms.uHasScreenTex.value = false
        this.material.blending = THREE.NormalBlending
        return
      }

      renderer.getDrawingBufferSize(this.dbSize)
      const w = Math.floor(this.dbSize.x)
      const h = Math.floor(this.dbSize.y)
      if (w <= 0 || h <= 0) return

      if (!this.frameTex || this.frameTex.image.width !== w || this.frameTex.image.height !== h) {
        if (this.frameTex) this.frameTex.dispose()
        this.frameTex = new THREE.FramebufferTexture(w, h)
        this.frameTex.magFilter = THREE.LinearFilter
        this.frameTex.minFilter = THREE.LinearFilter
        this.frameTex.wrapS = THREE.ClampToEdgeWrapping
        this.frameTex.wrapT = THREE.ClampToEdgeWrapping
      }

      renderer.copyFramebufferToTexture(this.frameTex)
      this.material.uniforms.uScreenTex.value = this.frameTex
      this.material.uniforms.uHasScreenTex.value = true
      this.material.blending = THREE.CustomBlending
      this.material.blendSrc = THREE.OneFactor
      this.material.blendDst = THREE.ZeroFactor
      this.material.blendEquation = THREE.AddEquation
    }

    this.scene.add(this.mesh)
  }

  public init(): void {}

  private triggerImpact(time: number, amount = 0.92): void {
    this.trauma = Math.min(1.0, Math.max(this.trauma, amount))
    this.shakeSeed = Math.random() * 500.0 + 1.0
    const randomness = this.props.randomness ?? 0.5
    if (randomness > 0.3 && Math.random() < 0.65) {
      this.aftershockTime = time + 0.28 + Math.random() * 0.22
    } else {
      this.aftershockTime = null
    }
  }

  public update(delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    const speed = this.props.speed ?? 1.2
    const intensity = this.props.intensity ?? 1.0
    const density = this.props.density ?? 1.0
    const depth = this.props.depth ?? 0.3
    const decayRate = this.props.decayRate ?? 3.5
    const rotIntensity = this.props.rotationIntensity ?? 1.0
    const traumaPower = this.props.traumaPower ?? 2.0
    const interval = Math.max(1.0, this.props.shakeInterval ?? 4.5)

    if (this.startTime === null) {
      this.startTime = time
      this.nextShakeTime = time + Math.min(1.35, interval * 0.35)
    }

    if (this.pendingTrigger) {
      this.pendingTrigger = false
      this.triggerImpact(time, 0.96)
    } else if (this.trauma <= 0.01 && time >= this.nextShakeTime) {
      this.triggerImpact(time, 0.85 + Math.random() * 0.15)
      this.nextShakeTime = time + interval * (0.65 + Math.random() * 0.85)
    }

    // Réplique sismique secondaire irrégulière
    if (this.aftershockTime !== null && time >= this.aftershockTime) {
      this.aftershockTime = null
      this.trauma = Math.min(1.0, Math.max(this.trauma, 0.52 + Math.random() * 0.18))
    }

    // Décroissance amortie du trauma (modulée si une durée manuelle a été imposée)
    const effectiveDecay =
      this.activeDuration !== null
        ? 1.0 / Math.max(0.25, this.activeDuration)
        : decayRate * 0.26 * Math.sqrt(Math.max(0.3, speed))

    const dt = Math.min(0.1, Math.max(0, delta))
    if (this.trauma > 0) {
      this.trauma = Math.max(0.0, this.trauma - dt * effectiveDecay)
      if (this.trauma === 0) {
        this.activeDuration = null
      }
    }

    // Intensité effective au carré du choc : shake = trauma^2
    const shake = Math.pow(this.trauma, traumaPower)

    // Toujours restaurer le décalage Z caméra précédent
    this.camera.position.z -= this.prevOffsetZ
    this.prevOffsetZ = 0

    if (shake > 0.002) {
      // Bruit multi-fréquence non périodique sur axes indépendants
      const noiseTime = time * (16.0 * density * speed)
      const nx = multiFreqNoise1D(noiseTime, this.shakeSeed + 1.3)
      const ny = multiFreqNoise1D(noiseTime, this.shakeSeed + 47.9)
      const nr = multiFreqNoise1D(noiseTime * 0.78, this.shakeSeed + 113.7)

      const maxUvOffset = 0.018 * intensity
      const offX = nx * maxUvOffset * shake
      const offY = ny * maxUvOffset * shake * 0.85
      const rotZ = nr * 0.022 * intensity * rotIntensity * shake
      // Zoom de marge dynamique pour empêcher toute bordure noire sur le framebuffer
      const safeZoom =
        1.0 /
        (1.0 +
          (Math.abs(offX) + Math.abs(offY)) * 1.4 +
          Math.abs(rotZ) * 0.9 +
          depth * 0.02 * shake)

      if (this.currentQuality === 'LOW') {
        // Mode LOW léger : déplacement caméra 3D + bordure optique légère
        const camAmp = 0.14 * intensity * shake
        this.camera.position.x += nx * camAmp
        this.camera.position.y += ny * camAmp * 0.85
        const zOff = depth * 0.08 * shake
        this.camera.position.z += zOff
        this.camera.rotation.z += rotZ
        this.prevOffsetZ = zOff
      }

      this.mesh.visible = true
      this.material.uniforms.uShakeOffset.value.set(offX, offY)
      this.material.uniforms.uShakeRot.value = rotZ
      this.material.uniforms.uShakeZoom.value = safeZoom
      this.material.uniforms.uShakeMagnitude.value = shake
    } else {
      this.mesh.visible = false
      this.material.uniforms.uShakeOffset.value.set(0, 0)
      this.material.uniforms.uShakeRot.value = 0.0
      this.material.uniforms.uShakeZoom.value = 1.0
      this.material.uniforms.uShakeMagnitude.value = 0.0
    }
  }

  public triggerEvent(event?: RareEventTrigger): void {
    if (
      !event ||
      event.type === 'screen_shake' ||
      event.type === 'shockwave' ||
      event.type === 'lightning' ||
      (event.params && event.params.type === 'shake')
    ) {
      this.pendingTrigger = true
      if (event?.durationSeconds) {
        this.activeDuration = event.durationSeconds
      }
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
    this.currentQuality = quality
    if (!this.material) return
    const tierVal = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    this.material.uniforms.uQualityLevel.value = tierVal

    if (quality === 'LOW') {
      this.material.uniforms.uHasScreenTex.value = false
      this.material.uniforms.uScreenTex.value = null
      this.material.blending = THREE.NormalBlending
      if (this.frameTex) {
        this.frameTex.dispose()
        this.frameTex = null
      }
    }
  }

  public dispose(): void {
    if (this.camera) {
      this.camera.position.z -= this.prevOffsetZ
      this.prevOffsetZ = 0
    }
    if (this.frameTex) {
      this.frameTex.dispose()
      this.frameTex = null
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
