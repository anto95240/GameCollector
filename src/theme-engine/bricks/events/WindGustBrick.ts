/**
 * src/theme-engine/bricks/events/WindGustBrick.ts
 *
 * Brique d'Événement Organique : Rafale de Vent & Bourrasque Aérienne.
 * Bourrasque rendue visible par les nuages de poussière fine, débris et
 * particules poussés le long d'un front d'onde qui traverse l'écran,
 * accompagnée d'une légère distorsion réfractive (HIGH/MEDIUM) et d'une
 * intensité organique qui monte puis redescend.
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

export interface WindGustProps {
  /** Teinte des poussières et volutes portées par la rafale (défaut #e2e8f0). */
  windColor?: string
  /** Densité globale des particules poussées et volutes (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vélocité du flux d'air de la rafale (0.2 à 3.0, défaut 1.3). */
  speed?: number
  /** Profondeur Z et étagement parallaxe (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Visibilité et contraste des particules et volutes (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Turbulence tourbillonnaire et ondulation (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Angle de direction du vent en radians (-3.14 à 3.14, défaut 0.15). */
  gustAngle?: number
  /** Intervalle moyen en secondes entre rafales (1.0 à 15.0, défaut 4.0). */
  gustInterval?: number
  /** Échelle des vortex et tourbillons d'air (0.3 à 2.0, défaut 1.0). */
  swirlScale?: number
  /** Quantité de poussière et débris poussés par le vent (0.0 à 2.0, défaut 1.0). */
  debrisAmount?: number
  /** Amplitude de la distorsion optique légère au passage de l'onde (0.0 à 0.05, défaut 0.012). */
  distortionStrength?: number
}

export class WindGustInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'wind_gust'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: WindGustProps
  private windColorVec: THREE.Color
  private currentQuality: QualityTier

  private startTime: number | null = null
  private nextGustTime = 1.1
  private isActive = false
  private gustStartTime = 0
  private activeDuration = 1.6
  private pendingManualTrigger = false

  constructor(id: string, props: WindGustProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.windColorVec = new THREE.Color(props.windColor ?? '#e2e8f0')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.3
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.45
    const gustAngle = props.gustAngle ?? 0.15
    const gustInterval = props.gustInterval ?? 4.0
    const swirlScale = props.swirlScale ?? 1.0
    const debrisAmount = props.debrisAmount ?? 1.0
    const distortionStrength = props.distortionStrength ?? 0.012

    const geometry = new THREE.PlaneGeometry(2, 2)
    const qualityTier = context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uWindColor: { value: this.windColorVec },
        uUseCustomColor: { value: Boolean(props.windColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uGustAngle: { value: gustAngle },
        uGustInterval: { value: gustInterval },
        uSwirlScale: { value: swirlScale },
        uDebrisAmount: { value: debrisAmount },
        uDistortionStrength: { value: distortionStrength },
        uGustSeed: { value: 5.2 },
        uGustProgress: { value: 1.0 },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: { value: qualityTier },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.982, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uWindColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uGustAngle;
        uniform float uGustInterval;
        uniform float uSwirlScale;
        uniform float uDebrisAmount;
        uniform float uDistortionStrength;
        uniform float uGustSeed;
        uniform float uGustProgress;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Particules de poussière poussées dans la direction du flux
        float dustLayer(vec2 windCoord, float scaleX, float scaleY, float advect, float seedOffset) {
          vec2 uvGrid = vec2(windCoord.x * scaleX - advect, windCoord.y * scaleY);
          vec2 cell = floor(uvGrid);
          vec2 f = fract(uvGrid);

          vec2 rnd = hash22(cell + vec2(seedOffset, uGustSeed));
          if (rnd.x < 0.42) return 0.0;

          vec2 center = vec2(0.2 + rnd.x * 0.6, 0.2 + rnd.y * 0.6);
          vec2 delta = f - center;
          // Étirement aérodynamique dans le sens du vent
          delta.x *= 0.38;
          delta.y *= 1.65;
          float d = length(delta);
          float size = 0.09 + 0.14 * hash12(cell * 1.7 + seedOffset);
          return smoothstep(size, size * 0.15, d) * (0.45 + 0.55 * rnd.y);
        }

        // Débris / brindilles / feuilles emportées en rotation par les tourbillons
        float debrisLayer(vec2 windCoord, float advect, float t) {
          vec2 uvGrid = vec2(windCoord.x * 3.8 - advect * 0.85, windCoord.y * 5.2);
          vec2 cell = floor(uvGrid);
          vec2 f = fract(uvGrid);

          vec2 rnd = hash22(cell + vec2(17.3, uGustSeed * 1.3));
          if (rnd.x < 0.72) return 0.0;

          float swirlY = sin(t * 4.5 + rnd.y * 6.2831 + windCoord.x * 3.0) * 0.18;
          vec2 center = vec2(0.25 + rnd.x * 0.5, clamp(0.25 + rnd.y * 0.5 + swirlY, 0.15, 0.85));
          vec2 delta = f - center;

          float rot = rnd.x * 6.2831 + t * (4.0 + rnd.y * 5.0) * (rnd.y > 0.5 ? 1.0 : -1.0);
          float c = cos(rot);
          float s = sin(rot);
          vec2 rDelta = vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);

          // Silhouette allongée de brin/feuille
          float ell = length(vec2(rDelta.x * 0.55, rDelta.y * 2.3));
          float size = 0.075 + 0.06 * rnd.y;
          return smoothstep(size, size * 0.25, ell);
        }

        void main() {
          float progress = uGustProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
          p += uMouse * (uDepth * 0.18);

          // Direction du vent + légère inclinaison selon la graine et la souris
          float angleJitter = (hash12(vec2(uGustSeed, 1.7)) - 0.5) * 0.28 * uRandomness;
          float angle = uGustAngle + angleJitter + uMouse.y * 0.14;
          vec2 windDir = vec2(cos(angle), sin(angle));
          vec2 windPerp = vec2(-windDir.y, windDir.x);

          float coordAlong = dot(p, windDir);
          float coordAcross = dot(p, windPerp);

          // Enveloppe globale de la rafale : montée progressive puis descente douce + micro-sursaut
          float rise = smoothstep(0.0, 0.34, progress);
          float fall = pow(1.0 - smoothstep(0.34, 1.0, progress), 1.45);
          float surge = 0.82 + 0.18 * sin(progress * 9.5 + uGustSeed);
          float lifeEnvelope = rise * fall * surge;

          // Front d'onde qui traverse l'écran d'un bord à l'autre avec courbure organique
          float frontCenter = mix(-1.45 * max(1.0, aspect * 0.7), 1.45 * max(1.0, aspect * 0.7), progress);
          float frontWarp = sin(coordAcross * 3.2 + uGustSeed) * 0.14 * (0.4 + uRandomness);
          float distToFront = (coordAlong - frontWarp) - frontCenter;

          // Profil asymétrique du front d'onde : front net devant, traîne diffuse derrière
          float waveWidth = distToFront > 0.0 ? 0.34 : 0.72;
          float waveEnvelope = exp(-pow(distToFront / waveWidth, 2.0));

          float localStrength = waveEnvelope * lifeEnvelope * uIntensity;
          if (localStrength <= 0.004) {
            discard;
          }

          float t = uTime * uSpeed;
          // Turbulence sinueuse de l'air entraînant poussières et volutes
          float flowSwirl = 0.0;
          if (uQualityLevel >= 1) {
            flowSwirl = snoise(vec2(coordAlong * 2.2 * uSwirlScale - t * 2.0, coordAcross * 2.8 * uSwirlScale + uGustSeed));
          } else {
            flowSwirl = sin(coordAlong * 3.5 - t * 2.5 + coordAcross * 2.0);
          }

          vec2 warpedWindCoord = vec2(
            coordAlong,
            coordAcross + flowSwirl * 0.12 * (0.4 + uRandomness)
          );

          // 1. Légère distorsion optique de l'onde qui traverse l'écran (HIGH & MEDIUM)
          vec4 baseScene = vec4(0.0);
          if (uHasScreenTex) {
            float refractAmp = uDistortionStrength * waveEnvelope * lifeEnvelope * uIntensity;
            vec2 refractShift = (windDir * (flowSwirl * 0.7 + 0.3) + windPerp * flowSwirl * 0.5) * refractAmp;
            vec2 distortedUv = clamp(uv - refractShift, vec2(0.001), vec2(0.999));
            vec4 orig = texture2D(uScreenTex, uv);
            vec4 dist = texture2D(uScreenTex, distortedUv);
            baseScene = mix(orig, dist, clamp(waveEnvelope * lifeEnvelope * 1.1, 0.0, 1.0));
          }

          // 2. Poussière fine et particules poussées dans le flux
          float advect = progress * 3.4 * (0.7 + 0.3 * uSpeed);
          float dust = 0.0;
          float debris = 0.0;
          float dens = clamp(uDensity, 0.25, 2.5);

          if (uQualityLevel >= 2) {
            // HIGH : 2 strates de poussière fine + débris tournoyants + volutes FBM légères
            dust += dustLayer(warpedWindCoord, 4.5 * dens, 9.5 * dens, advect * 1.15, 1.1) * 0.75;
            dust += dustLayer(warpedWindCoord, 7.2 * dens, 14.0 * dens, advect * 1.45, 7.9) * 0.55;
            debris += debrisLayer(warpedWindCoord, advect * 0.95, t) * 0.85;
          } else if (uQualityLevel >= 1) {
            // MEDIUM : 1 strate de poussière poussée + débris légers
            dust += dustLayer(warpedWindCoord, 5.2 * dens, 11.0 * dens, advect * 1.25, 1.1) * 0.8;
            debris += debrisLayer(warpedWindCoord, advect * 0.9, t) * 0.65;
          } else {
            // LOW : 1 strate légère sans snoise lourd
            dust += dustLayer(warpedWindCoord, 4.2 * dens, 8.5 * dens, advect * 1.2, 1.1) * 0.75;
          }

          // 3. Volutes d'air / brume légère portée par l'onde (non régulières)
          float mistStreak = 0.0;
          if (uQualityLevel >= 2) {
            float mNoise = fbm2D(vec2(warpedWindCoord.x * 1.6 - advect * 0.9, warpedWindCoord.y * 4.2) * uSwirlScale + uGustSeed * 0.1, 3);
            mistStreak = smoothstep(0.15, 0.72, mNoise) * 0.26;
          } else if (uQualityLevel >= 1) {
            float mNoise = snoise(vec2(warpedWindCoord.x * 1.8 - advect * 0.9, warpedWindCoord.y * 4.0) * uSwirlScale + uGustSeed * 0.1);
            mistStreak = smoothstep(0.12, 0.75, mNoise) * 0.20;
          } else {
            float band = sin(warpedWindCoord.y * 9.0 + flowSwirl * 1.5) * 0.5 + 0.5;
            mistStreak = pow(band, 3.0) * 0.16;
          }

          float particlesAlpha = (dust * 0.58 + debris * 0.68) * uDebrisAmount * localStrength;
          float mistAlpha = mistStreak * localStrength * 0.75;
          float totalOverlayAlpha = clamp(particlesAlpha + mistAlpha, 0.0, 0.72);

          vec3 baseWindCol = uUseCustomColor ? uWindColor : mix(uPaletteAccent, vec3(0.92, 0.95, 1.0), 0.65);
          vec3 debrisCol = mix(baseWindCol, vec3(0.72, 0.68, 0.60), 0.35);
          vec3 overlayCol = mix(baseWindCol, debrisCol, clamp(debris * 1.2, 0.0, 0.7));

          if (uHasScreenTex) {
            vec3 outRgb = baseScene.rgb * (1.0 - totalOverlayAlpha) + overlayCol * totalOverlayAlpha;
            float outA = clamp(max(baseScene.a, totalOverlayAlpha), 0.0, 1.0);
            gl_FragColor = vec4(outRgb, outA);
          } else {
            if (totalOverlayAlpha <= 0.004) {
              discard;
            }
            gl_FragColor = vec4(overlayCol, totalOverlayAlpha);
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
    this.mesh.renderOrder = -7

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

  private startGust(now: number, seed?: number): void {
    const speed = Math.max(0.3, this.props.speed ?? 1.3)
    const randomness = this.props.randomness ?? 0.45
    const speedJitter = 1.0 + (Math.random() - 0.5) * 0.35 * randomness
    this.isActive = true
    this.gustStartTime = now
    this.activeDuration = Math.max(0.75, 1.65 / speed / Math.max(0.6, speedJitter))

    if (this.material) {
      this.material.uniforms.uGustSeed.value = seed ?? Math.random() * 777.0 + 1.0
    }
  }

  public update(_delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    if (this.startTime === null) {
      this.startTime = time
      const interval = Math.max(1.0, this.props.gustInterval ?? 4.0)
      this.nextGustTime = time + Math.min(1.15, interval * 0.35)
    }

    if (this.pendingManualTrigger) {
      this.pendingManualTrigger = false
      this.startGust(time)
    } else if (!this.isActive && time >= this.nextGustTime) {
      this.startGust(time)
    }

    let progress = 1.0
    if (this.isActive) {
      const elapsed = time - this.gustStartTime
      if (elapsed >= this.activeDuration) {
        this.isActive = false
        const interval = Math.max(1.0, this.props.gustInterval ?? 4.0)
        this.nextGustTime = time + interval * (0.7 + Math.random() * 0.85)
      } else {
        progress = elapsed / this.activeDuration
      }
    }

    this.mesh.visible = progress < 1.0
    this.material.uniforms.uGustProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'wind_gust') {
      this.pendingManualTrigger = true
    }
  }

  public updateProps(newProps: Partial<WindGustProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.windColor !== undefined) {
      this.windColorVec.set(newProps.windColor)
      this.material.uniforms.uWindColor.value = this.windColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.gustAngle !== undefined)
      this.material.uniforms.uGustAngle.value = newProps.gustAngle
    if (newProps.gustInterval !== undefined)
      this.material.uniforms.uGustInterval.value = newProps.gustInterval
    if (newProps.swirlScale !== undefined)
      this.material.uniforms.uSwirlScale.value = newProps.swirlScale
    if (newProps.debrisAmount !== undefined)
      this.material.uniforms.uDebrisAmount.value = newProps.debrisAmount
    if (newProps.distortionStrength !== undefined)
      this.material.uniforms.uDistortionStrength.value = newProps.distortionStrength
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

export const WindGustDefinition: IBrickDefinition<WindGustProps> = {
  type: 'wind_gust',
  category: 'events',
  create: (id, props, context) => new WindGustInstance(id, props, context),
}

BrickRegistry.register(WindGustDefinition)
