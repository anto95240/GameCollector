/**
 * src/theme-engine/bricks/events/ShockwaveBrick.ts
 *
 * Brique d'Événement Organique : Onde de Choc & Distorsion Explosive.
 * Onde de surpression en expansion qui ralentit progressivement (Sedov-Taylor),
 * déformant réellement l'image par réfraction + dispersion RVB (HIGH/MEDIUM),
 * avec front brillant asymétrique et traîne de dépression, flash initial,
 * poussière et débris projetés radialement.
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
  /** Densité d'ondes secondaires et particules projetées (0.3 à 2.5, défaut 1.0). */
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
  /** Puissance de déformation réfractive de l'image sous l'onde (0.0 à 0.15, défaut 0.065). */
  refractionStrength?: number
  /** Quantité de poussière et débris projetés depuis l'épicentre (0.0 à 2.0, défaut 1.0). */
  debrisAmount?: number
  /** Intensité du flash initial à l'épicentre (0.0 à 2.0, défaut 1.0). */
  flashIntensity?: number
}

export class ShockwaveInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'shockwave'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: ShockwaveProps
  private ringColorVec: THREE.Color
  private currentQuality: QualityTier

  private startTime: number | null = null
  private nextWaveTime = 1.25
  private isActive = false
  private waveStartTime = 0
  private activeDuration = 1.1
  private pendingManualTrigger = false
  private manualEpicenter: THREE.Vector2 | null = null

  constructor(id: string, props: ShockwaveProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

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
    const refractionStrength = props.refractionStrength ?? 0.065
    const debrisAmount = props.debrisAmount ?? 1.0
    const flashIntensity = props.flashIntensity ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)
    const qualityTier = context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0

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
        uRefractionStrength: { value: refractionStrength },
        uDebrisAmount: { value: debrisAmount },
        uFlashIntensity: { value: flashIntensity },
        uWaveProgress: { value: 1.0 },
        uWaveSeed: { value: 3.7 },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: { value: qualityTier },
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
        uniform float uRefractionStrength;
        uniform float uDebrisAmount;
        uniform float uFlashIntensity;
        uniform float uWaveProgress;
        uniform float uWaveSeed;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          float progress = uWaveProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
          p += uMouse * (uDepth * 0.15);

          vec2 center = uEpicenter * vec2(aspect * 0.45, 0.45);
          vec2 toCenter = p - center;
          float dist = length(toCenter);
          vec2 radialDir = dist > 0.0001 ? toCenter / dist : vec2(1.0, 0.0);
          float angle = atan(toCenter.y, toCenter.x);

          // Expansion qui ralentit nettement (loi décélérée type blast wave)
          float maxRadius = 1.15 * max(1.0, aspect * 0.72);
          float currentRadius = (1.0 - pow(1.0 - progress, 2.7)) * maxRadius;

          // Légère perturbation angulaire organique du front
          float angularNoise = 0.0;
          if (uQualityLevel >= 1) {
            angularNoise = snoise(vec2(cos(angle) * 2.5, sin(angle) * 2.5) + uWaveSeed * 0.37) * (0.032 * uRandomness);
          }
          float adjustedDist = dist + angularNoise * smoothstep(0.0, 0.2, currentRadius);

          // Profil asymétrique de Friedlander : front avant très raide + traîne intérieure étirée
          float signedDelta = adjustedDist - currentRadius;
          float frontSharpness = 0.012 + progress * 0.018;
          float trailWidth = 0.055 + progress * 0.14;

          // Front brillant avant
          float frontEdge = smoothstep(frontSharpness, -0.002, signedDelta);
          float crestPeak = exp(-pow(max(0.0, signedDelta) / (frontSharpness * 0.7), 2.0)) *
                            exp(-max(0.0, -signedDelta) / (frontSharpness * 2.2));
          // Traîne décroissante derrière le front
          float wakeTrail = (signedDelta < 0.0)
            ? frontEdge * exp(signedDelta / trailWidth)
            : 0.0;

          // Onde secondaire de dépression / rebond
          float echoWave = 0.0;
          if (uQualityLevel >= 1 && uDensity > 0.5 && currentRadius > 0.14) {
            float echoR = currentRadius * 0.68;
            float echoD = abs(adjustedDist - echoR);
            echoWave = exp(-pow(echoD / (frontSharpness * 1.9), 2.0)) * 0.35 * (1.0 - progress);
          }

          float lifeFade = (1.0 - pow(progress, 1.35)) * smoothstep(0.0, 0.025, progress);

          // 1. Flash initial intense à l'épicentre (0 -> ~180 ms)
          float flashDecay = exp(-progress * 14.0);
          float centerFlash = exp(-dist * (4.5 + progress * 6.0)) * flashDecay * 1.45 * uFlashIntensity;
          float flashScreenBloom = exp(-dist * 1.6) * flashDecay * 0.35 * uFlashIntensity;

          // 2. Réfraction réelle de l'image sous l'anneau + dispersion RVB (HIGH & MEDIUM)
          vec4 sceneSample = vec4(0.0);
          float hasRefraction = 0.0;
          if (uHasScreenTex) {
            // Déformation positive sur le front (compression) et légère aspiration dans la traîne
            float frontPush = crestPeak * 1.0 - wakeTrail * 0.35;
            float refractAmp = uRefractionStrength * frontPush * lifeFade * uIntensity;
            hasRefraction = clamp(abs(frontPush) * 2.0, 0.0, 1.0);

            vec2 aspectFix = vec2(1.0 / aspect, 1.0);
            vec2 baseOffset = radialDir * refractAmp * aspectFix;

            if (uQualityLevel >= 2 && uChromaticAberration > 0.0005) {
              float chroma = uChromaticAberration * (1.2 * crestPeak + 0.4 * wakeTrail) * lifeFade * uIntensity;
              vec2 uvR = clamp(uv - baseOffset - radialDir * chroma * aspectFix, vec2(0.001), vec2(0.999));
              vec2 uvG = clamp(uv - baseOffset, vec2(0.001), vec2(0.999));
              vec2 uvB = clamp(uv - baseOffset + radialDir * chroma * aspectFix, vec2(0.001), vec2(0.999));

              float r = texture2D(uScreenTex, uvR).r;
              float g = texture2D(uScreenTex, uvG).g;
              vec4 bSample = texture2D(uScreenTex, uvB);
              sceneSample = vec4(r, g, bSample.b, bSample.a);
            } else {
              vec2 refractedUv = clamp(uv - baseOffset, vec2(0.001), vec2(0.999));
              sceneSample = texture2D(uScreenTex, refractedUv);
            }
          }

          // 3. Poussière et débris projetés radialement depuis l'épicentre (HIGH & MEDIUM)
          float dustWake = 0.0;
          float debrisSparks = 0.0;
          if (uQualityLevel >= 1 && uDebrisAmount > 0.02) {
            // Anneau de poussière turbulente dans la traîne du front
            if (signedDelta < 0.0 && signedDelta > -trailWidth * 2.2) {
              float dustN = snoise(vec2(angle * 7.0, dist * 16.0 - progress * 8.0) + uWaveSeed);
              dustWake = wakeTrail * smoothstep(-0.1, 0.75, dustN) * 0.42 * uDebrisAmount;
            }

            // Éclats / débris projetés radialement
            float sectorScale = 14.0 * clamp(uDensity, 0.5, 2.0);
            vec2 polarCoord = vec2(angle * sectorScale / 6.28318, dist * 10.0 - progress * 7.5);
            vec2 pCell = floor(polarCoord);
            vec2 pFrac = fract(polarCoord);
            vec2 pRnd = hash22(pCell + vec2(uWaveSeed, 9.1));
            if (pRnd.x > 0.68 && dist < currentRadius && dist > 0.04) {
              vec2 dPos = pFrac - vec2(0.2 + pRnd.y * 0.6, 0.2 + pRnd.x * 0.6);
              // Étirement radial des débris
              dPos.y *= 0.38;
              float dLen = length(dPos);
              float radialMask = smoothstep(currentRadius, currentRadius * 0.35, dist) * (1.0 - progress * 0.7);
              debrisSparks = smoothstep(0.16, 0.03, dLen) * radialMask * 0.85 * uDebrisAmount;
            }
          }

          // 4. Assemblage lumineux : crête fine lumineuse + traîne douce + flash + poussière/débris
          vec3 baseColor = uUseCustomColor ? uRingColor : uPaletteAccent;
          vec3 crestColor = mix(baseColor, vec3(1.0), 0.72);
          vec3 flashColor = mix(vec3(1.0, 0.97, 0.92), baseColor, 0.22);
          vec3 dustColor = mix(baseColor, vec3(0.75, 0.78, 0.82), 0.65);

          float glowStrength = (crestPeak * 0.95 + wakeTrail * 0.34 + echoWave * 0.4) * lifeFade * uIntensity;
          float flashTotal = (centerFlash + flashScreenBloom) * uIntensity;
          float debrisAlpha = clamp((dustWake + debrisSparks * 0.8) * lifeFade * uIntensity, 0.0, 0.75);

          vec3 addLight = crestColor * (crestPeak * 0.95 * lifeFade * uIntensity) +
                          baseColor * ((wakeTrail * 0.34 + echoWave * 0.4) * lifeFade * uIntensity) +
                          flashColor * flashTotal +
                          mix(dustColor, vec3(1.0, 0.85, 0.65), clamp(debrisSparks, 0.0, 1.0)) * debrisAlpha;

          if (uHasScreenTex) {
            // Mix doux de poussière opaque puis ajout additif du front brillant & flash
            vec3 outRgb = sceneSample.rgb * (1.0 - dustWake * lifeFade * 0.4) + addLight;
            float outA = clamp(max(sceneSample.a, clamp(glowStrength + flashTotal + debrisAlpha, 0.0, 1.0)), 0.0, 1.0);
            gl_FragColor = vec4(outRgb, outA);
          } else {
            float alpha = clamp(glowStrength + flashTotal + debrisAlpha, 0.0, 0.94);
            if (alpha <= 0.004) {
              discard;
            }
            gl_FragColor = vec4(addLight / max(0.25, alpha), alpha);
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
    this.mesh.renderOrder = -6

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

  private startWave(now: number): void {
    const speed = Math.max(0.3, this.props.speed ?? 1.2)
    this.isActive = true
    this.waveStartTime = now
    this.activeDuration = 1.15 / speed

    if (this.material) {
      this.material.uniforms.uWaveSeed.value = Math.random() * 666.0 + 1.0
      if (this.manualEpicenter) {
        this.material.uniforms.uEpicenter.value.copy(this.manualEpicenter)
        this.manualEpicenter = null
      } else {
        const defX = this.props.epicenterX ?? 0.0
        const defY = this.props.epicenterY ?? 0.0
        const rand = this.props.randomness ?? 0.35
        const jX = (Math.random() - 0.5) * 0.45 * rand
        const jY = (Math.random() - 0.5) * 0.35 * rand
        this.material.uniforms.uEpicenter.value.set(defX + jX, defY + jY)
      }
    }
  }

  public update(_delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    if (this.startTime === null) {
      this.startTime = time
      const interval = Math.max(1.0, this.props.waveInterval ?? 3.5)
      this.nextWaveTime = time + Math.min(1.25, interval * 0.38)
    }

    if (this.pendingManualTrigger) {
      this.pendingManualTrigger = false
      this.startWave(time)
    } else if (!this.isActive && time >= this.nextWaveTime) {
      this.startWave(time)
    }

    let progress = 1.0
    if (this.isActive) {
      const elapsed = time - this.waveStartTime
      if (elapsed >= this.activeDuration) {
        this.isActive = false
        const interval = Math.max(1.0, this.props.waveInterval ?? 3.5)
        this.nextWaveTime = time + interval * (0.7 + Math.random() * 0.85)
      } else {
        progress = elapsed / this.activeDuration
      }
    }

    this.mesh.visible = progress < 1.0
    this.material.uniforms.uWaveProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'shockwave' || event.type === 'aurora_surge') {
      this.pendingManualTrigger = true
      if (event.params?.x !== undefined && event.params?.y !== undefined) {
        this.manualEpicenter = new THREE.Vector2(Number(event.params.x), Number(event.params.y))
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
    if (newProps.refractionStrength !== undefined)
      this.material.uniforms.uRefractionStrength.value = newProps.refractionStrength
    if (newProps.debrisAmount !== undefined)
      this.material.uniforms.uDebrisAmount.value = newProps.debrisAmount
    if (newProps.flashIntensity !== undefined)
      this.material.uniforms.uFlashIntensity.value = newProps.flashIntensity
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

export const ShockwaveDefinition: IBrickDefinition<ShockwaveProps> = {
  type: 'shockwave',
  category: 'events',
  create: (id, props, context) => new ShockwaveInstance(id, props, context),
}

BrickRegistry.register(ShockwaveDefinition)
