/**
 * src/theme-engine/bricks/atmosphere/LensFlareBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere / Effet Optique).
 * Éblouissement optique cinématique de lentille de caméra (Lens Flare anamorphique),
 * comprenant coeur spéculaire, aigrettes de diffraction (starburst), halo spectral,
 * trait anamorphique horizontal étiré, et disques fantômes alignés sur l'axe optique
 * pivotant en direct avec le déplacement de la souris.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Lens Flare.
 */
export interface LensFlareProps {
  /** Teinte dominante de l'éblouissement optique (défaut #fde047 ou uPalettePrimary). */
  flareColor?: string
  /** Teinte secondaire / éclat anamorphique cinéma (défaut #06b6d4 ou uPaletteAccent). */
  accentColor?: string
  /** Échelle et épaisseur des artefacts et fantômes (0.3 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse de micro-scintillement des aigrettes (0.0 à 1.0, défaut 0.2). */
  speed?: number
  /** Sensibilité du pivotement de l'axe optique à la souris (0.0 à 1.0, défaut 0.5). */
  depth?: number
  /** Brillance et radiance globale de l'éblouissement (0.2 à 2.5, défaut 1.3). */
  intensity?: number
  /** Asymétrie et turbulence des aigrettes de diffraction (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Position horizontale X de la source de lumière (-1.0 à 1.0, défaut 0.4). */
  sourceX?: number
  /** Position verticale Y de la source de lumière (-1.0 à 1.0, défaut 0.5). */
  sourceY?: number
  /** Longueur de l'éclat anamorphique horizontal (0.2 à 2.5, défaut 1.2). */
  streakLength?: number
  /** Intensité de la dispersion chromatique RVB sur les fantômes et l'anneau (0.0 à 1.5, défaut 0.65). */
  chromaticDispersion?: number
  /** Facteur d'anamorphose des reflets fantômes (0.25 à 1.0, défaut 0.65 ; < 1.0 = bokeh ovale cinéma). */
  anamorphicRatio?: number
  /** Nombre de lamelles du diaphragme pour le bokeh polygonal et les aigrettes (5 à 8, défaut 6). */
  apertureBlades?: number
}

export class LensFlareInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'lens_flare'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: LensFlareProps
  private flareColorVec: THREE.Color
  private accentColorVec: THREE.Color

  constructor(id: string, props: LensFlareProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.flareColorVec = new THREE.Color(props.flareColor ?? '#fde047')
    this.accentColorVec = new THREE.Color(props.accentColor ?? '#06b6d4')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.5
    const intensity = props.intensity ?? 1.3
    const randomness = props.randomness ?? 0.35
    const sourceX = props.sourceX ?? 0.4
    const sourceY = props.sourceY ?? 0.5
    const streakLength = props.streakLength ?? 1.2
    const chromaticDispersion = props.chromaticDispersion ?? 0.65
    const anamorphicRatio = props.anamorphicRatio ?? 0.65
    const apertureBlades = Math.min(8, Math.max(5, Math.round(props.apertureBlades ?? 6)))

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uFlareColor: { value: this.flareColorVec },
        uAccentColor: { value: this.accentColorVec },
        uUseCustomColors: {
          value: Boolean(props.flareColor || props.accentColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSourceX: { value: sourceX },
        uSourceY: { value: sourceY },
        uStreakLength: { value: streakLength },
        uChromaticDispersion: { value: chromaticDispersion },
        uAnamorphicRatio: { value: anamorphicRatio },
        uApertureBlades: { value: apertureBlades },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.970, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uFlareColor;
        uniform vec3 uAccentColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSourceX;
        uniform float uSourceY;
        uniform float uStreakLength;
        uniform float uChromaticDispersion;
        uniform float uAnamorphicRatio;
        uniform float uApertureBlades;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // SDF d'un polygone régulier à N lamelles d'ouverture (bokeh hexagonal / diaphragme)
        float polygonDist(vec2 q, float r, float blades, float rot) {
          float ca = cos(rot);
          float sa = sin(rot);
          q = vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y);
          float a = atan(q.y, q.x) + 3.14159265;
          float sector = 6.28318530 / blades;
          float d = cos(floor(0.5 + a / sector) * sector - a) * length(q);
          return d - r;
        }

        // Profil d'un bokeh d'ouverture avec bords doux et anneau caustique optionnel
        float irisBokehScalar(vec2 q, float radius, float blades, float squeeze, float ringMix, float rot) {
          q.x /= max(0.28, squeeze);
          float d = polygonDist(q, radius, blades, rot);
          float soft = max(0.004, radius * 0.22);
          float fill = 1.0 - smoothstep(-soft, soft, d);
          float rim = exp(-abs(d) / max(0.003, radius * 0.14)) * 0.78;
          return mix(fill * 0.72 + rim * 0.34, rim * 1.15 + fill * 0.14, ringMix);
        }

        // Reflet fantôme aligné sur l'axe optique avec dispersion chromatique RVB
        vec3 evalGhostRGB(
          vec2 p,
          vec2 sourcePos,
          vec2 opticalAxis,
          vec2 axisDir,
          float tAxis,
          float radius,
          float blades,
          float squeeze,
          float ringMix,
          float disp,
          float rot
        ) {
          vec2 center = sourcePos + opticalAxis * tAxis;
          // Rejet rapide hors du disque englobant
          float maxR = radius * (1.45 / max(0.28, squeeze)) + 0.04;
          if (length(p - center) > maxR) return vec3(0.0);

          if (disp <= 0.01) {
            float v = irisBokehScalar(p - center, radius, blades, squeeze, ringMix, rot);
            return vec3(v);
          }

          vec2 shift = axisDir * (disp * (0.007 + 0.013 * abs(tAxis - 1.0)));
          float rVal = irisBokehScalar(p - (center + shift), radius * (1.0 + disp * 0.04), blades, squeeze, ringMix, rot);
          float gVal = irisBokehScalar(p - center, radius, blades, squeeze, ringMix, rot);
          float bVal = irisBokehScalar(p - (center - shift), radius * (1.0 - disp * 0.04), blades, squeeze, ringMix, rot);
          return vec3(rVal, gVal, bVal);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Position de la source lumineuse avec parallaxe dynamique souris et scroll
          vec2 sourcePos = vec2(uSourceX * aspect * 0.5, uSourceY * 0.5);
          sourcePos += uMouse * (uDepth * 0.25);
          sourcePos.y -= uScroll * (uDepth * 0.10);

          // Atténuation et réponse optique selon la position de la source à l'écran
          float halfW = max(0.1, aspect * 0.5);
          vec2 normSource = vec2(sourcePos.x / halfW, sourcePos.y / 0.5);
          float ecc = length(normSource);

          // Visibilité directe (chute douce quand la source sort du champ de la lentille)
          float directVis = 1.0 - smoothstep(0.92, 1.58, ecc);
          // Réflexions internes hors axe : plus faibles au centre exact, amplifiées vers les bords avant coupure
          float offAxisGain = (0.48 + 0.52 * smoothstep(0.0, 0.35, ecc))
            * (1.0 + 0.32 * smoothstep(0.25, 0.88, ecc))
            * (1.0 - smoothstep(1.12, 1.78, ecc));
          float streakGain = (0.85 + 0.28 * smoothstep(0.15, 0.85, ecc))
            * (1.0 - smoothstep(1.02, 1.65, ecc));

          vec2 toSource = p - sourcePos;
          float distToSource = length(toSource);
          float scale = max(0.25, uDensity);

          // Axe optique passant par le centre de l'objectif (0, 0)
          vec2 opticalAxis = -sourcePos;
          float axisLen = length(opticalAxis);
          vec2 axisDir = axisLen > 0.0001 ? (opticalAxis / axisLen) : vec2(1.0, 0.0);

          vec3 baseFlare = uUseCustomColors ? uFlareColor : uPalettePrimary;
          vec3 streakTint = uUseCustomColors ? uAccentColor : uPaletteAccent;

          // 1. Cœur spéculaire & bloom atmosphérique
          float coreBloom = exp(-distToSource * 7.8 / scale) * 1.35;
          float wideBloom = exp(-distToSource * 2.3 / scale) * 0.42;
          float superCore = exp(-distToSource * 24.0 / sqrt(scale)) * 1.65;
          float bloom = (coreBloom + wideBloom) * directVis;

          // 2. Traînée anamorphique horizontale multi-échelle
          float dY = abs(toSource.y);
          float dX = abs(toSource.x);
          float streakLen = max(0.15, uStreakLength);
          float streakCore = exp(-dY / max(0.0012, 0.0042 * scale)) * exp(-dX * 1.15 / streakLen);
          float streakGlow = exp(-dY / max(0.003, 0.024 * scale)) * exp(-dX * 0.72 / streakLen) * 0.55;

          vec3 streakColor = streakTint * (streakCore * 1.45 + streakGlow);
          if (uQualityLevel >= 1) {
            // Légère dispersion chromatique verticale sur les lèvres de la traînée anamorphique
            float dispY = 0.0035 * uChromaticDispersion * scale;
            float sR = exp(-abs(toSource.y - dispY) / max(0.002, 0.011 * scale)) * exp(-dX * 0.95 / streakLen);
            float sB = exp(-abs(toSource.y + dispY) / max(0.002, 0.011 * scale)) * exp(-dX * 0.95 / streakLen);
            streakColor += vec3(sR * 0.35, 0.0, sB * 0.45) * streakTint * 0.9;
          }
          if (uQualityLevel >= 2 && uRandomness > 0.01) {
            // Micro-perles optiques d'interférence horizontale le long de la traînée
            float beading = 1.0 + snoise(vec2(toSource.x * 16.0, t * 0.35)) * (0.22 * uRandomness);
            streakColor *= max(0.55, beading);
          }
          streakColor *= streakGain;

          vec3 finalColor = baseFlare * bloom
            + vec3(1.0, 0.98, 0.94) * (superCore * directVis)
            + streakColor;

          // 3. Aigrettes de diffraction du diaphragme (Starburst à N lamelles, sans rotation mécanique)
          if (uQualityLevel >= 1 && directVis > 0.005) {
            float blades = clamp(uApertureBlades, 5.0, 8.0);
            float freq = mod(blades, 2.0) < 0.5 ? blades * 0.5 : blades;
            float bladeTilt = 0.24 + uMouse.x * uDepth * 0.06;
            float angle = atan(toSource.y, toSource.x) + bladeTilt;
            float spike = pow(abs(cos(angle * freq)), 32.0);
            float shimmer = 1.0;
            if (uQualityLevel >= 2) {
              shimmer = 1.0 + snoise(vec2(angle * 3.5, t * 1.4)) * (uRandomness * 0.28);
            }
            float starburst = spike * exp(-distToSource * 3.8 / scale) * shimmer * 0.92 * directVis;
            vec3 spikeTint = mix(baseFlare, vec3(1.0, 0.97, 0.9), 0.35);
            finalColor += spikeTint * starburst;
          }

          // 4. Anneau de diffraction spectral avec dispersion chromatique RVB
          if (uQualityLevel >= 1 && offAxisGain > 0.005) {
            float ringRadius = 0.36 * scale;
            float dispR = 0.032 * uChromaticDispersion * ringRadius;
            float azMod = 1.0;
            if (uQualityLevel >= 2) {
              float aRing = atan(toSource.y, toSource.x);
              azMod = 0.72 + 0.28 * snoise(vec2(cos(aRing) * 2.2, sin(aRing) * 2.2 + t * 0.25));
            }
            float ringR = exp(-abs(distToSource - (ringRadius + dispR)) * 26.0);
            float ringG = exp(-abs(distToSource - ringRadius) * 26.0);
            float ringB = exp(-abs(distToSource - (ringRadius - dispR)) * 26.0);
            vec3 spectralRing = vec3(ringR * 1.05, ringG * 0.95, ringB * 1.15) * mix(streakTint, vec3(0.85, 0.92, 1.0), 0.45);
            finalColor += spectralRing * (0.36 * azMod * offAxisGain);
          }

          // 5. Reflets fantômes polygonaux (bokeh hexagonal d'ouverture) sur l'axe optique
          if (uQualityLevel >= 1 && offAxisGain > 0.005) {
            float blades = clamp(uApertureBlades, 5.0, 8.0);
            float squeeze = clamp(uAnamorphicRatio, 0.28, 1.0);
            float disp = clamp(uChromaticDispersion, 0.0, 1.5);
            float irisRot = 0.24 + uMouse.x * uDepth * 0.05;
            vec3 ghostAccum = vec3(0.0);

            if (uQualityLevel >= 2) {
              // HIGH : 6 reflets fantômes variés (iris pleins et anneaux caustiques)
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 0.34, 0.075 * scale, blades, squeeze, 0.15, disp * 0.7, irisRot)
                * mix(baseFlare, streakTint, 0.45) * 0.38;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 0.62, 0.135 * scale, blades, squeeze, 0.72, disp, irisRot)
                * streakTint * 0.34;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 0.88, 0.048 * scale, blades, squeeze, 0.05, disp * 0.6, irisRot)
                * mix(baseFlare, vec3(1.0, 0.95, 0.85), 0.35) * 0.52;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 1.24, 0.175 * scale, blades, squeeze, 0.85, disp * 1.15, irisRot)
                * mix(streakTint, vec3(0.55, 0.85, 1.0), 0.35) * 0.28;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 1.56, 0.095 * scale, blades, squeeze, 0.35, disp * 0.9, irisRot)
                * mix(streakTint, baseFlare, 0.3) * 0.36;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 1.92, 0.23 * scale, blades, squeeze, 0.90, disp * 1.25, irisRot)
                * streakTint * 0.22;
            } else {
              // MEDIUM : 3 reflets fantômes polygonaux avec dispersion chromatique
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 0.52, 0.11 * scale, blades, squeeze, 0.35, disp * 0.8, irisRot)
                * mix(baseFlare, streakTint, 0.6) * 0.36;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 1.18, 0.15 * scale, blades, squeeze, 0.75, disp, irisRot)
                * streakTint * 0.30;
              ghostAccum += evalGhostRGB(p, sourcePos, opticalAxis, axisDir, 1.68, 0.07 * scale, blades, squeeze, 0.15, disp * 0.7, irisRot)
                * mix(baseFlare, vec3(1.0, 0.95, 0.85), 0.3) * 0.38;
            }

            finalColor += ghostAccum * offAxisGain;
          }

          finalColor *= uIntensity;

          // Compression douce HDR pour préserver les teintes chromatiques sans écrêtage brutal
          finalColor = finalColor / (1.0 + finalColor * 0.22);

          float maxLum = max(finalColor.r, max(finalColor.g, finalColor.b));
          if (maxLum <= 0.002) {
            discard;
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 5 // Couche atmosphère / optique de premier plan
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<LensFlareProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.flareColor !== undefined) {
      this.flareColorVec.set(newProps.flareColor)
      this.material.uniforms.uFlareColor.value = this.flareColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.accentColor !== undefined) {
      this.accentColorVec.set(newProps.accentColor)
      this.material.uniforms.uAccentColor.value = this.accentColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.sourceX !== undefined) this.material.uniforms.uSourceX.value = newProps.sourceX
    if (newProps.sourceY !== undefined) this.material.uniforms.uSourceY.value = newProps.sourceY
    if (newProps.streakLength !== undefined)
      this.material.uniforms.uStreakLength.value = newProps.streakLength
    if (newProps.chromaticDispersion !== undefined)
      this.material.uniforms.uChromaticDispersion.value = newProps.chromaticDispersion
    if (newProps.anamorphicRatio !== undefined)
      this.material.uniforms.uAnamorphicRatio.value = newProps.anamorphicRatio
    if (newProps.apertureBlades !== undefined)
      this.material.uniforms.uApertureBlades.value = Math.min(
        8,
        Math.max(5, Math.round(newProps.apertureBlades))
      )
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

export const LensFlareDefinition: IBrickDefinition<LensFlareProps> = {
  type: 'lens_flare',
  category: 'atmosphere',
  create: (id, props, context) => new LensFlareInstance(id, props, context),
}

BrickRegistry.register(LensFlareDefinition)
