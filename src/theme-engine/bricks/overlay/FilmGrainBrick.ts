/**
 * src/theme-engine/bricks/overlay/FilmGrainBrick.ts
 *
 * Brique de style et d'overlay : Grain Argentique Cinéma (Couche 5 : Overlay).
 * Rendu photochimique réaliste de pellicule argentique 35mm / 16mm :
 * - Grain dépendant de la luminance réelle de la scène (pic dans les tons moyens,
 *   atténuation dans les noirs profonds et hautes lumières via FramebufferTexture)
 * - Distribution multi-échelles à taille variable et courbe quasi-gaussienne
 * - Cadence cinématographique stricte à 24 images par seconde (15 ips en LOW)
 * - Poussières et rayures verticales fugaces occasionnelles (HIGH)
 * - Rendu subtil préservant la lisibilité de l'interface
 * - Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Grain Argentique.
 */
export interface FilmGrainProps {
  /** Teinte personnalisée des cristaux de grain. Si non spécifié, utilise blanc pur/argentique. */
  grainColor?: string
  /** Densité spatiale et finesse des cristaux (0.4 à 3.0, défaut 1.2). */
  density?: number
  /** Vitesse de défilement temporel du grain argentique (0.1 à 2.5, défaut 0.8). */
  speed?: number
  /** Profondeur focale et sensibilité à la parallaxe souris (0.0 à 1.0, défaut 0.2). */
  depth?: number
  /** Intensité et contraste du grain argentique (0.02 à 0.45, défaut 0.08). */
  intensity?: number
  /** Facteur d'agrégation d'émulsion et gigue stochastique (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Grain monochrome (true) ou micro-bruit chromatique argentique (false, défaut true). */
  monochrome?: boolean
  /** Taille des amas d'émulsion argentique (0.4 à 2.5, défaut 1.0). */
  clumpSize?: number
  /** Sensibilité du grain à la luminance (plus visible dans les tons moyens, 0.0 à 1.0, défaut 0.75). */
  luminanceSensitivity?: number
  /** Fréquence et présence des poussières et rayures occasionnelles (0.0 à 1.0, défaut 0.35). */
  dustAndScratches?: number
}

export class FilmGrainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'grain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: FilmGrainProps
  private grainColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: FilmGrainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.grainColorVec = new THREE.Color(props.grainColor ?? '#ffffff')

    const density = props.density ?? 1.2
    const speed = props.speed ?? 0.8
    const depth = props.depth ?? 0.2
    const intensity = props.intensity ?? 0.08
    const randomness = props.randomness ?? 0.5
    const monochrome = props.monochrome !== false
    const clumpSize = props.clumpSize ?? 1.0
    const luminanceSensitivity = props.luminanceSensitivity ?? 0.75
    const dustAndScratches = props.dustAndScratches ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uGrainColor: { value: this.grainColorVec },
        uUseCustomColor: { value: Boolean(props.grainColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uMonochrome: { value: monochrome },
        uClumpSize: { value: clumpSize },
        uLuminanceSensitivity: { value: luminanceSensitivity },
        uDustAndScratches: { value: dustAndScratches },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Couche d'overlay au premier plan immédiat (clip space z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uGrainColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform bool uMonochrome;
        uniform float uClumpSize;
        uniform float uLuminanceSensitivity;
        uniform float uDustAndScratches;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}
        ${GLSL_NOISE_2D}

        // Bruit quasi-gaussien (distribution triangulaire centrée en 0)
        float triNoise(vec2 p) {
          return hash12(p) + hash12(p + vec2(37.17, 91.43)) - 1.0;
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          float aspect = res.x / res.y;
          vec2 px = uv * res;

          // Parallaxe subtile de lentille et scroll
          vec2 mouseOffset = uMouse * (uDepth * 15.0);
          px += mouseOffset + vec2(0.0, uScroll * 20.0);

          // Cadence cinématographique réelle à 24 images par seconde (15 ips en LOW)
          // speed = 0.8 (défaut) => exactement 24 ips
          float speedNorm = max(0.0, uSpeed) / 0.8;
          float fps = uQualityLevel == 0 ? 15.0 : 24.0;
          float frameIndex = floor(uTime * speedNorm * fps);
          vec2 frameJitter = hash22(vec2(frameIndex, frameIndex * 1.618033));

          float grainVal = 0.0;
          vec3 rgbGrain = vec3(0.0);

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Grain multi-échelles à taille variable + amas Simplex ===
            // Variation spatiale lente de la taille locale des cristaux d'émulsion
            float scaleVar = 0.68 + 0.64 * (snoise(uv * 11.0 + frameJitter * 0.4) * 0.5 + 0.5);

            // Strate 1 : micro-cristaux fins (1 px)
            vec2 cFine = px * (0.95 * uDensity) + frameJitter * 317.0;
            float fineGrain = triNoise(cFine);

            // Strate 2 : grains moyens à calibre variable selon la zone et clumpSize
            vec2 cMed = floor(px * (0.52 * uDensity / max(0.35, uClumpSize)) * scaleVar) + frameJitter * 193.0;
            float medGrain = triNoise(cMed);

            // Strate 3 : agrégats organiques d'émulsion argentique (clumpiness)
            vec2 clumpCoord = uv * vec2(aspect, 1.0) * (58.0 * uDensity / max(0.35, uClumpSize)) + frameJitter * 13.7;
            float emulsionClump = snoise(clumpCoord) * (uRandomness * 0.42);

            grainVal = fineGrain * 0.48 + medGrain * 0.34 + emulsionClump * 0.32;

            if (!uMonochrome) {
              // Nuages de colorants photochimiques subtils (faible saturation réaliste)
              float rN = triNoise(cFine + vec2(13.1, 7.3)) * 0.45 + triNoise(cMed + vec2(5.2, 3.1)) * 0.32 + emulsionClump * 0.30;
              float gN = triNoise(cFine + vec2(27.4, 19.8)) * 0.45 + triNoise(cMed + vec2(11.7, 8.4)) * 0.32 + emulsionClump * 0.30;
              float bN = triNoise(cFine + vec2(43.7, 31.2)) * 0.45 + triNoise(cMed + vec2(19.3, 14.9)) * 0.32 + emulsionClump * 0.30;
              rgbGrain = mix(vec3(grainVal), vec3(rN, gN, bN), 0.58);
            } else {
              rgbGrain = vec3(grainVal);
            }
          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Grain 2 échelles triangulaire à 24 ips ===
            vec2 cFine = px * (0.85 * uDensity) + frameJitter * 211.0;
            vec2 cMed = floor(px * (0.50 * uDensity / max(0.4, uClumpSize))) + frameJitter * 113.0;
            grainVal = triNoise(cFine) * 0.52 + triNoise(cMed) * 0.32;
            rgbGrain = vec3(grainVal);
          } else {
            // === PALIER LOW : Pseudo-noise rapide à 15 ips (0 copie FBO) ===
            vec2 grainCoord = floor(px * 0.5) * (0.6 * uDensity) + frameJitter * 64.0;
            float n1 = fract(sin(dot(grainCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
            grainVal = n1 * 1.15;
          }

          if (uHasScreenTex && uQualityLevel >= 1) {
            vec4 sceneSample = texture2D(uScreenTex, uv);
            float sceneAlpha = sceneSample.a;
            vec3 sceneCol = sceneAlpha > 0.002 ? sceneSample.rgb / sceneAlpha : vec3(0.0);

            // Luminance perceptuelle : le grain argentique culmine dans les tons moyens
            float luma = dot(sceneCol, vec3(0.299, 0.587, 0.114));
            float midtoneBell = exp(-pow((luma - 0.44) / 0.34, 2.0));
            float lumaCurve = mix(0.22, 1.0, midtoneBell);
            float lumaWeight = mix(1.0, lumaCurve, clamp(uLuminanceSensitivity, 0.0, 1.0));

            vec3 tint = uUseCustomColor ? mix(vec3(1.0), uGrainColor, 0.72) : vec3(1.0);
            vec3 grainDelta = rgbGrain * tint * lumaWeight * (uIntensity * 0.92);

            // Modulation photochimique douce préservant ombres et contrastes
            vec3 outCol = sceneCol + grainDelta * mix(0.85, 1.15, midtoneBell);

            // Poussières et rayures occasionnelles de pellicule (HIGH uniquement)
            float artifactAlpha = 0.0;
            if (uQualityLevel >= 2 && uDustAndScratches > 0.01) {
              // 1. Poussières fugaces (1 à 2 points/micro-poils sur certaines trames à 24 ips)
              float dustGate = hash12(vec2(frameIndex * 0.73, 19.1));
              if (dustGate > 0.52) {
                vec2 dustPos = hash22(vec2(frameIndex * 1.31, 41.7));
                vec2 dVec = (uv - dustPos) * vec2(aspect, 1.0);
                // Micro-poil légèrement incliné ou point de poussière
                float angle = hash12(vec2(frameIndex, 7.9)) * 6.28318;
                vec2 dir = vec2(cos(angle), sin(angle));
                float segLen = mix(0.001, 0.008, hash12(vec2(frameIndex, 93.2)));
                float proj = clamp(dot(dVec, dir), -segLen, segLen);
                float distDust = length(dVec - dir * proj);
                float dustSize = mix(0.0012, 0.0024, hash12(vec2(frameIndex, 55.4)));
                float dustMask = smoothstep(dustSize, dustSize * 0.35, distDust);

                if (dustMask > 0.01) {
                  float isBrightDust = step(0.65, hash12(vec2(frameIndex, 107.3)));
                  float dustStrength = clamp(uDustAndScratches * (0.28 + uIntensity * 1.6), 0.0, 0.55);
                  vec3 dustTarget = isBrightDust > 0.5
                    ? min(vec3(1.0), sceneCol + vec3(0.28))
                    : sceneCol * 0.42;
                  outCol = mix(outCol, dustTarget, dustMask * dustStrength);
                  artifactAlpha = max(artifactAlpha, dustMask * dustStrength);
                }
              }

              // 2. Rayures verticales occasionnelles (fenêtres brèves de ~3 trames)
              float scratchWindow = floor(frameIndex / 3.0);
              float scratchGate = hash12(vec2(scratchWindow, 83.7));
              if (scratchGate > 0.87) {
                float scratchX = hash12(vec2(scratchWindow, 17.3));
                float wobble = snoise(vec2(uv.y * 5.5, scratchWindow)) * 0.0022;
                float distX = abs(uv.x - (scratchX + wobble)) * res.x;
                float scratchMask = smoothstep(1.35, 0.25, distX);

                // Extension verticale partielle
                float yStart = hash12(vec2(scratchWindow, 29.1)) * 0.4;
                float yEnd = 0.6 + hash12(vec2(scratchWindow, 61.3)) * 0.4;
                float yMask = smoothstep(yStart, yStart + 0.08, uv.y) * smoothstep(yEnd, yEnd - 0.08, uv.y);

                float scratchFade = 1.0 - abs(mod(frameIndex, 3.0) - 1.0) * 0.35;
                float scratchVis = scratchMask * yMask * scratchFade * clamp(uDustAndScratches * 0.32, 0.0, 0.45);
                if (scratchVis > 0.005) {
                  float isDarkScratch = step(0.45, hash12(vec2(scratchWindow, 131.9)));
                  vec3 scratchCol = isDarkScratch > 0.5 ? sceneCol * 0.68 : min(vec3(1.0), sceneCol + vec3(0.18));
                  outCol = mix(outCol, scratchCol, scratchVis);
                  artifactAlpha = max(artifactAlpha, scratchVis);
                }
              }
            }

            outCol = clamp(outCol, 0.0, 1.0);
            float outAlpha = clamp(max(sceneAlpha, max(abs(grainVal) * uIntensity * 0.35, artifactAlpha)), 0.0, 1.0);
            gl_FragColor = vec4(outCol * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW (ou repli sans texture) : Overlay léger sans copie framebuffer ===
          float absGrain = abs(grainVal);
          float alpha = clamp(absGrain * (uIntensity * 0.28), 0.0, 0.11);

          if (alpha <= 0.002) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uGrainColor : vec3(1.0);
          vec3 finalRgb = grainVal > 0.0 ? baseColor : baseColor * 0.03;

          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 90 // Couche 5 (Overlay)

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
  public update(): void {}

  public updateProps(newProps: Partial<FilmGrainProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.grainColor !== undefined) {
      this.grainColorVec.set(newProps.grainColor)
      this.material.uniforms.uGrainColor.value = this.grainColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.monochrome !== undefined)
      this.material.uniforms.uMonochrome.value = newProps.monochrome
    if (newProps.clumpSize !== undefined)
      this.material.uniforms.uClumpSize.value = newProps.clumpSize
    if (newProps.luminanceSensitivity !== undefined)
      this.material.uniforms.uLuminanceSensitivity.value = newProps.luminanceSensitivity
    if (newProps.dustAndScratches !== undefined)
      this.material.uniforms.uDustAndScratches.value = newProps.dustAndScratches
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

export const FilmGrainDefinition: IBrickDefinition<FilmGrainProps> = {
  type: 'grain',
  category: 'overlay',
  create: (id, props, context) => new FilmGrainInstance(id, props, context),
}

export const FilmGrainAliasDefinition: IBrickDefinition<FilmGrainProps> = {
  type: 'film_grain',
  category: 'overlay',
  create: (id, props, context) => new FilmGrainInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(FilmGrainDefinition)
BrickRegistry.register(FilmGrainAliasDefinition)
