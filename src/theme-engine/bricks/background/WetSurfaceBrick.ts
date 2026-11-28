/**
 * src/theme-engine/bricks/background/WetSurfaceBrick.ts
 *
 * Brique de Fond : Sol Humide & Reflets Spéculaires en Perspective (Couche 1 : Background).
 * Projection perspective 3D d'une chaussée mouillée (pavés irréguliers ou asphalte) :
 * - Flaques organiques irrégulières par FBM multi-octaves avec accumulation dans les creux
 * - Sol assombri par l'humidité avec zone capillaire poreuse autour des flaques
 * - Effet de Fresnel physique (Schlick) renforçant la réflexion en incidence rasante
 * - Reflets flous et déformés selon la rugosité locale et la normale 2D du revêtement
 * - Reflets des lumières étirés verticalement (anisotropes) et brisés par les micro-reliefs
 * - Gouttes de pluie aléatoires générant des anneaux concentriques et reflets de bordure
 *
 * Transparent au-dessus de la ligne d'horizon pour se superposer naturellement à gradient_sky.
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type WetSurfaceType = 'cobblestone' | 'asphalt'

export type WetReflectionStyle =
  | 'lantern'
  | 'shop_windows'
  | 'underglow'
  | 'tail_light'
  | 'flame_tracks'

export interface WetSurfaceProps {
  /** Teinte de base de la chaussée humide (défaut #141720 ou uPaletteSecondary). */
  baseColor?: string
  /** Teinte principale des reflets spéculaires sur les flaques (défaut #f59e0b ou uPaletteAccent). */
  reflectionColor?: string
  /** Teinte secondaire des reflets (ex: éclairs cyan sur sillons enflammés). */
  secondaryReflectionColor?: string
  /** Nature du revêtement au sol (défaut 'cobblestone'). */
  surfaceType?: WetSurfaceType
  /** Style d'illumination réfléchie sur la chaussée (défaut 'lantern'). */
  reflectionStyle?: WetReflectionStyle
  /** Hauteur relative de la ligne d'horizon du sol (0.18 à 0.50, défaut 0.34). */
  horizonHeight?: number
  /** Couverture des flaques réfléchissantes (0.15 à 0.95, défaut 0.62). */
  puddleCoverage?: number
  /** Intensité des micro-ondes d'impact de gouttes de pluie (0.0 à 1.0, défaut 0.45). */
  rainRipples?: number
  /** Échelle spatiale des pavés / du grain d'asphalte (0.4 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'animation de défilement / scintillement (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Sensibilité perspective à la souris et au scroll (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance des reflets et contraste du sol (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Irrégularité des flaques et pavés (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Degré d'humidité et d'assombrissement poreux du sol (0.0 à 1.0, défaut 0.75). */
  wetness?: number
  /** Rugosité de base hors flaques contrôlant le flou des reflets (0.05 à 0.95, défaut 0.42). */
  roughness?: number
  /** Intensité de l'effet de Fresnel en incidence rasante (0.0 à 1.5, défaut 1.0). */
  fresnelStrength?: number
}

const SURFACE_TYPE_MAP: Record<WetSurfaceType, number> = {
  cobblestone: 0,
  asphalt: 1,
}

const REFLECTION_STYLE_MAP: Record<WetReflectionStyle, number> = {
  lantern: 0,
  shop_windows: 1,
  underglow: 2,
  tail_light: 3,
  flame_tracks: 4,
}

export class WetSurfaceInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'wet_surface'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WetSurfaceProps
  private baseColorVec: THREE.Color
  private reflectionColorVec: THREE.Color
  private secondaryReflectionVec: THREE.Color

  constructor(id: string, props: WetSurfaceProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.baseColorVec = new THREE.Color(props.baseColor ?? '#141720')
    this.reflectionColorVec = new THREE.Color(props.reflectionColor ?? '#f59e0b')
    this.secondaryReflectionVec = new THREE.Color(
      props.secondaryReflectionColor ?? props.reflectionColor ?? '#38bdf8'
    )

    const surfaceIdx = SURFACE_TYPE_MAP[props.surfaceType ?? 'cobblestone'] ?? 0
    const reflIdx = REFLECTION_STYLE_MAP[props.reflectionStyle ?? 'lantern'] ?? 0
    const horizonHeight = props.horizonHeight ?? 0.34
    const puddleCoverage = props.puddleCoverage ?? 0.62
    const rainRipples = props.rainRipples ?? 0.45
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.45
    const wetness = props.wetness ?? 0.75
    const roughness = props.roughness ?? 0.42
    const fresnelStrength = props.fresnelStrength ?? 1.0

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
        uBaseColor: { value: this.baseColorVec },
        uReflectionColor: { value: this.reflectionColorVec },
        uSecondaryReflection: { value: this.secondaryReflectionVec },
        uUseCustomColors: {
          value: Boolean(props.baseColor || props.reflectionColor),
        },
        uUseSecondaryRefl: { value: Boolean(props.secondaryReflectionColor) },
        uSurfaceType: { value: surfaceIdx },
        uReflectionStyle: { value: reflIdx },
        uHorizonHeight: { value: horizonHeight },
        uPuddleCoverage: { value: puddleCoverage },
        uRainRipples: { value: rainRipples },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uWetness: { value: wetness },
        uRoughness: { value: roughness },
        uFresnelStrength: { value: fresnelStrength },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9985, 1.0);
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
        uniform vec3 uBaseColor;
        uniform vec3 uReflectionColor;
        uniform vec3 uSecondaryReflection;
        uniform bool uUseCustomColors;
        uniform bool uUseSecondaryRefl;
        uniform int uSurfaceType;
        uniform int uReflectionStyle;
        uniform float uHorizonHeight;
        uniform float uPuddleCoverage;
        uniform float uRainRipples;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uWetness;
        uniform float uRoughness;
        uniform float uFresnelStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Pavés en quinconce avec joints biseautés et variation individuelle
        vec2 cobblestonePattern(vec2 p) {
          float row = floor(p.y);
          float offset = mod(row, 2.0) * 0.5;
          vec2 cell = vec2(floor(p.x + offset), row);
          vec2 f = fract(vec2(p.x + offset, p.y));

          float randStone = hash12(cell);
          vec2 jitter = (hash22(cell + 13.7) - 0.5) * (0.14 * clamp(uRandomness + 0.25, 0.2, 1.2));
          vec2 pf = clamp(f + jitter, 0.0, 1.0);
          vec2 edgeDist = min(pf, 1.0 - pf);
          float bevel = smoothstep(0.04, 0.21, min(edgeDist.x, edgeDist.y));
          float dome = smoothstep(0.58, 0.0, length(pf - 0.5)) * 0.30;
          return vec2(clamp(bevel * 0.82 + dome * bevel, 0.0, 1.0), randStone);
        }

        // Hauteur scalaire du revêtement pour calcul de normale par différences finies
        float sampleSurfaceHeight(vec2 wp) {
          if (uSurfaceType == 0) {
            return cobblestonePattern(vec2(wp.x * 3.6, wp.y * 1.45)).x;
          }
          float macro = snoise(wp * 4.2) * 0.5 + 0.5;
          float micro = (uQualityLevel >= 2) ? (snoise(wp * 16.5) * 0.22) : 0.0;
          return clamp(macro * 0.72 + micro + 0.14, 0.0, 1.0);
        }

        // Anneaux d'impact de gouttes de pluie (sparse + position aléatoire à chaque cycle)
        // Retourne xy = gradient normal 2D (nx, nz), z = éclat spéculaire sur la crête de l'anneau
        vec3 rippleLayer(vec2 wp, float t, float scale, float seedOffset) {
          vec2 sp = wp * scale;
          vec2 cell = floor(sp);
          vec2 f = fract(sp);

          float baseHash = hash12(cell + seedOffset);
          float rate = 0.55 + baseHash * 0.65;
          float phase = t * rate + baseHash * 13.7;
          float cycleId = floor(phase);
          float life = fract(phase);

          // Probabilité d'avoir une goutte active dans cette cellule (évite l'aspect grille régulière)
          float dropProb = hash12(cell + cycleId * 31.7 + seedOffset);
          if (dropProb < 0.48) {
            return vec3(0.0);
          }

          vec2 center = hash22(cell + cycleId * 17.3 + seedOffset) * 0.56 + 0.22;
          vec2 diff = f - center;
          float dist = length(diff);
          float radius = life * 0.44;
          float deltaR = dist - radius;

          // Enveloppe localisée autour du front d'onde en expansion
          float env = exp(-deltaR * deltaR * 340.0) * (1.0 - life) * smoothstep(0.0, 0.07, life);
          if (env < 0.002) {
            return vec3(0.0);
          }

          vec2 dir = diff / max(0.0005, dist);
          float wave = cos(deltaR * 52.0);
          float gradMag = wave * env;
          float rimSpec = max(0.0, sin(deltaR * 52.0 + 0.8)) * env;
          return vec3(dir * gradMag, rimSpec);
        }

        // Colonne lumineuse anisotrope étirée verticalement et floutée par la rugosité
        float anisotropicStreak(float rx, float vOffset, float sigmaX, float sigmaUp, float sigmaDown) {
          float horiz = exp(-(rx * rx) / max(0.0002, 2.0 * sigmaX * sigmaX));
          // Étirement asymétrique : décroît plus vite vers l'horizon (haut) et s'étire vers la caméra (bas)
          float vSigma = (vOffset >= 0.0) ? sigmaUp : sigmaDown;
          float vert = exp(-(vOffset * vOffset) / max(0.0004, 2.0 * vSigma * vSigma));
          // Conservation d'énergie approximative : plus le lobe est étroit (flaque lisse), plus le pic est vif
          float energy = clamp(0.036 / max(0.018, sigmaX), 0.22, 1.35);
          return horiz * vert * energy;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          float horizon = clamp(uHorizonHeight + uMouse.y * uDepth * 0.08 - uScroll * uDepth * 0.05, 0.15, 0.58);
          if (uv.y > horizon + 0.025) {
            discard;
          }

          float d = max(0.008, horizon - uv.y);
          float z = 1.0 / d;
          float viewX = (uv.x - 0.5 + uMouse.x * uDepth * 0.28) * aspect;
          float x = viewX * z;

          float t = uTime * max(0.02, uSpeed);
          // Défilement vers l'avant uniquement pour les modes route/vitesse
          float travel = (uReflectionStyle >= 2) ? (t * 4.5) : 0.0;
          vec2 worldP = vec2(x, z - travel) * (0.45 * uDensity);

          // 1. Relief et normale 2D du revêtement (avec filtrage anti-aliasing vers l'horizon)
          float detailFade = smoothstep(0.012, 0.12, d);
          float surfaceHeight = 0.5;
          float grainVar = 0.5;
          vec2 surfNormal = vec2(0.0);

          if (uQualityLevel >= 1) {
            if (uSurfaceType == 0) {
              vec2 cobble = cobblestonePattern(vec2(worldP.x * 3.6, worldP.y * 1.45));
              surfaceHeight = mix(0.5, cobble.x, detailFade);
              grainVar = mix(0.5, cobble.y, detailFade);
            } else {
              float tarmac = snoise(worldP * 4.2) * 0.5 + 0.5;
              float micro = (uQualityLevel >= 2) ? (snoise(worldP * 16.5) * 0.22) : 0.0;
              surfaceHeight = mix(0.5, clamp(tarmac * 0.72 + micro + 0.14, 0.0, 1.0), detailFade);
              grainVar = tarmac;
            }

            // Normale 2D par différences finies pour déformer les reflets sur les arêtes de pavés / asphalte
            float eps = (uSurfaceType == 0) ? 0.032 : 0.055;
            float hx = sampleSurfaceHeight(worldP + vec2(eps, 0.0));
            float hz = sampleSurfaceHeight(worldP + vec2(0.0, eps));
            float h0 = (uSurfaceType == 0) ? surfaceHeight : sampleSurfaceHeight(worldP);
            float bumpStrength = (uSurfaceType == 0) ? 1.15 : 0.85;
            surfNormal = vec2(h0 - hx, h0 - hz) * (bumpStrength / eps) * 0.06 * detailFade;
          }

          // 2. Flaques irrégulières par bruit FBM + accumulation dans les creux
          vec2 puddleCoord = worldP * 0.30;
          if (uQualityLevel >= 2 && uRandomness > 0.01) {
            vec2 warp = vec2(
              snoise(worldP * 0.22 + vec2(3.1, 7.4)),
              snoise(worldP * 0.22 + vec2(9.2, 2.8))
            );
            puddleCoord += warp * (0.38 * uRandomness);
          }

          float puddleNoise = snoise(puddleCoord + vec2(1.7, 0.4)) * 0.5 + 0.5;
          if (uQualityLevel >= 1) {
            puddleNoise = puddleNoise * 0.65 + (snoise(puddleCoord * 2.45 + vec2(4.2, 1.1)) * 0.5 + 0.5) * 0.35;
          }
          if (uQualityLevel >= 2) {
            puddleNoise = puddleNoise * 0.82 + (snoise(puddleCoord * 5.8 - vec2(2.6, 5.1)) * 0.5 + 0.5) * 0.18;
          }

          float puddleThresh = 1.0 - clamp(uPuddleCoverage, 0.1, 0.95);
          // Les creux de pavés ou aspérités retiennent l'eau en premier
          float puddleField = puddleNoise + (0.5 - surfaceHeight) * 0.34;
          float puddleMask = smoothstep(puddleThresh - 0.06, puddleThresh + 0.075, puddleField);
          // Halo capillaire humide autour des flaques
          float dampRimMask = smoothstep(puddleThresh - 0.24, puddleThresh + 0.01, puddleField) * (1.0 - puddleMask);

          // 3. Rides concentriques de gouttes de pluie dans les flaques (2 couches décalées en HIGH)
          vec2 rippleGrad = vec2(0.0);
          float rippleGlint = 0.0;
          if (uQualityLevel >= 1 && uRainRipples > 0.01 && puddleMask > 0.02) {
            vec3 r1 = rippleLayer(worldP, t * 1.35 + uTime * 0.15, 1.55, 7.3);
            vec3 r2 = (uQualityLevel >= 2)
              ? rippleLayer(worldP + vec2(0.37, 0.61), t * 1.45 + uTime * 0.18, 2.35, 29.1)
              : vec3(0.0);
            vec3 rSum = r1 + r2 * 0.75;
            float rWeight = uRainRipples * puddleMask * detailFade;
            rippleGrad = rSum.xy * rWeight * 0.11;
            rippleGlint = rSum.z * rWeight;
          }

          // 4. Rugosité locale & déformation des reflets selon la rugosité
          float wetnessClamped = clamp(uWetness, 0.0, 1.0);
          float baseRough = clamp(uRoughness, 0.05, 0.95);
          // L'eau stagnante est quasi-miroir ; le bord capillaire est légèrement plus lisse que le pavé sec
          float localRoughness = mix(baseRough, 0.024, puddleMask);
          localRoughness = mix(localRoughness, localRoughness * 0.68, dampRimMask * wetnessClamped);

          // Déformation horizontale & verticale : forte sur relief rugueux, quasi nulle sur flaque calme (sauf rides)
          float microRoughJitter = 0.0;
          if (uQualityLevel >= 2) {
            microRoughJitter = (hash12(floor(worldP * 26.0)) - 0.5) * localRoughness * 0.05 * detailFade;
          }
          vec2 totalNormal = surfNormal * (1.0 - puddleMask * 0.92) + rippleGrad;
          float distortX = totalNormal.x * (0.45 + localRoughness * 1.1) + microRoughJitter;
          float distortY = totalNormal.y * (0.25 + localRoughness * 0.65);

          float rxBase = (uv.x - 0.5 + uMouse.x * uDepth * 0.14) * aspect + distortX;
          float ry = uv.y + distortY;

          // Largeur du lobe horizontal dictée par la rugosité (flaque = fin & net, sol humide = flou & large)
          float sigmaX = mix(0.024, 0.17, localRoughness * localRoughness);
          float roughBlurMult = mix(1.0, 1.45, localRoughness);

          // 5. Effet de Fresnel (Schlick) : plus réfléchissant en incidence rasante près de l'horizon
          float cosTheta = clamp((d / sqrt(d * d + viewX * viewX * 0.35 + 1.0)) * 1.55, 0.0, 1.0);
          float oneMinusCos = 1.0 - cosTheta;
          float schlick = oneMinusCos * oneMinusCos;
          schlick = schlick * schlick * oneMinusCos;
          float f0 = mix(0.045 * (0.4 + 0.6 * wetnessClamped), 0.02, puddleMask);
          float fresnel = (f0 + (1.0 - f0) * schlick) * clamp(uFresnelStrength, 0.0, 1.5);
          // Pondération visible dans la scène tout en gardant la courbe physique rasante
          float reflGain = mix(0.28, 1.55, fresnel) * (0.35 + 0.85 * puddleMask);

          // 6. Calcul des reflets anisotropes étirés verticalement selon reflectionStyle
          vec3 colBase = uUseCustomColors ? uBaseColor : (uPaletteSecondary * 0.22);
          vec3 colRefl = uUseCustomColors ? uReflectionColor : uPaletteAccent;
          vec3 colSec = uUseSecondaryRefl ? uSecondaryReflection : mix(colRefl, uPalettePrimary, 0.5);

          // Micro-scintillement vertical le long des traînées lumineuses (HIGH & MEDIUM)
          float verticalShimmer = 1.0;
          if (uQualityLevel >= 1) {
            float shimmerNoise = snoise(vec2(rxBase * 18.0, z * 0.85 - travel * 0.4 + totalNormal.y * 6.0));
            verticalShimmer = mix(0.88, 1.0 + shimmerNoise * 0.38, (1.0 - puddleMask * 0.65) * detailFade);
          }

          vec3 reflLight = vec3(0.0);
          float vNorm = clamp(horizon - ry, 0.0, horizon);

          if (uReflectionStyle == 0) {
            // === LANTERN : lanternes de rue reflétées en colonnes verticales brisées ===
            float flicker1 = 0.88 + 0.12 * sin(uTime * 5.2 + snoise(vec2(uTime * 2.1, 1.3)) * 2.5);
            float flicker2 = 0.90 + 0.10 * cos(uTime * 4.1 + snoise(vec2(uTime * 1.7, 5.1)) * 2.2);
            // Légère convergence perspective vers l'horizon
            float perspScale = mix(0.68, 1.15, clamp(vNorm / max(0.05, horizon), 0.0, 1.0));
            float l1 = anisotropicStreak(rxBase + 0.22 * aspect * perspScale, ry - horizon * 0.62, sigmaX * 1.15, horizon * 0.36, horizon * 0.85);
            float l2 = anisotropicStreak(rxBase - 0.30 * aspect * perspScale, ry - horizon * 0.70, sigmaX * 1.30, horizon * 0.32, horizon * 0.78) * 0.72;
            reflLight = colRefl * (l1 * flicker1 + l2 * flicker2) * verticalShimmer;

          } else if (uReflectionStyle == 1) {
            // === SHOP_WINDOWS : vitrines flanquant la ruelle étirées verticalement ===
            float modL = 0.78 + 0.22 * sin(z * 0.65 + uTime * 1.1);
            float modR = 0.78 + 0.22 * cos(z * 0.60 - uTime * 1.0);
            float leftWin = anisotropicStreak(rxBase + 0.34 * aspect, ry - horizon * 0.56, sigmaX * 1.65, horizon * 0.44, horizon * 0.92) * modL;
            float rightWin = anisotropicStreak(rxBase - 0.34 * aspect, ry - horizon * 0.58, sigmaX * 1.65, horizon * 0.44, horizon * 0.92) * modR;
            float centerWarm = anisotropicStreak(rxBase, ry - horizon * 0.74, sigmaX * 2.1, horizon * 0.34, horizon * 0.75) * 0.45;
            reflLight = colRefl * (leftWin + rightWin) * verticalShimmer
              + colSec * centerWarm * (0.4 + 0.75 * puddleMask);

          } else if (uReflectionStyle == 2) {
            // === UNDERGLOW : halo néon sous châssis + traînée verticale humide ===
            float pulse = 0.86 + 0.14 * sin(uTime * 2.8);
            float pool = anisotropicStreak(rxBase, ry - horizon * 0.42, sigmaX * 2.5, horizon * 0.22, horizon * 0.34);
            float corePool = anisotropicStreak(rxBase, ry - horizon * 0.45, sigmaX * 1.45, horizon * 0.15, horizon * 0.24) * 0.85;
            reflLight = colRefl * (pool + corePool) * pulse * verticalShimmer;

          } else if (uReflectionStyle == 3) {
            // === TAIL_LIGHT : feux arrière doubles étirés en longs rubans verticaux ===
            float sway = sin(z * 0.07 - travel * 0.12) * 0.06;
            float perspPair = mix(0.45, 1.15, clamp(vNorm / max(0.05, horizon), 0.0, 1.0));
            float twinL = anisotropicStreak(rxBase - sway - 0.08 * perspPair, ry - horizon * 0.66, sigmaX * 0.85, horizon * 0.30, horizon * 0.95);
            float twinR = anisotropicStreak(rxBase - sway + 0.08 * perspPair, ry - horizon * 0.66, sigmaX * 0.85, horizon * 0.30, horizon * 0.95);
            float broadGlow = anisotropicStreak(rxBase - sway * 0.6, ry - horizon * 0.58, sigmaX * 2.2, horizon * 0.38, horizon * 0.95) * 0.48;
            reflLight = colRefl * ((twinL + twinR) * 0.85 + broadGlow) * verticalShimmer;

          } else {
            // === FLAME_TRACKS : sillons enflammés parallèles + éclairs reflétés ===
            float trackSpacing = 0.55;
            float fireJitter = snoise(vec2(z * 0.6 - t * 6.0, x * 2.0)) * 0.08;
            float trackBlur = mix(3.6, 2.2, localRoughness * (1.0 - puddleMask));
            float tLeft = exp(-pow((x + trackSpacing + fireJitter + distortX * 2.5) * trackBlur, 2.0));
            float tRight = exp(-pow((x - trackSpacing - fireJitter + distortX * 2.5) * trackBlur, 2.0));
            float flames = (tLeft + tRight) * (0.75 + 0.4 * sin(z * 1.8 - t * 14.0));
            float sparkFlash = pow(max(0.0, snoise(vec2(x * 1.5, z * 0.4 - t * 5.0))), 5.0) * (0.35 + 0.85 * puddleMask);
            vec3 hotFire = mix(colRefl, vec3(1.0, 0.95, 0.72), clamp(flames * 0.55, 0.0, 0.85));
            reflLight = hotFire * flames * 1.25 + colSec * sparkFlash * 1.1;
          }

          // 7. Sol assombri par l'humidité (sec -> bord capillaire poreux -> flaque profonde)
          float jointAO = (uSurfaceType == 0 && uQualityLevel >= 1) ? smoothstep(0.02, 0.32, surfaceHeight) : 1.0;
          vec3 dryGround = colBase * (0.76 + 0.44 * surfaceHeight * (0.72 + 0.28 * grainVar)) * mix(0.65, 1.0, jointAO);
          // Assombrissement par porosité (humide + halo capillaire + flaque)
          float dampDark = mix(1.0, 0.70, wetnessClamped);
          float rimDark = mix(1.0, 0.46, wetnessClamped);
          float puddleDark = mix(1.0, 0.26, wetnessClamped);
          float moistureFactor = mix(dampDark, rimDark, dampRimMask);
          moistureFactor = mix(moistureFactor, puddleDark, puddleMask);
          vec3 groundCol = dryGround * moistureFactor;

          // Légère augmentation du contraste chromatique sur pierre humide
          groundCol = mix(groundCol, pow(max(groundCol, vec3(0.001)), vec3(1.12)), wetnessClamped * 0.35);

          // 8. Reflet ambiant du ciel / horizon par Fresnel dans les flaques + reflets de bord de gouttes
          vec3 skyAmbientRefl = mix(colBase * 1.65 + vec3(0.03, 0.04, 0.06), mix(colRefl, uPalettePrimary, 0.4), 0.22);
          groundCol += skyAmbientRefl * fresnel * (0.14 + 0.72 * puddleMask) * uIntensity;
          if (rippleGlint > 0.001) {
            groundCol += mix(skyAmbientRefl * 1.8, colRefl, 0.35) * rippleGlint * (0.35 + 0.65 * fresnel) * uIntensity;
          }

          // Addition des reflets directionnels modulés par Fresnel, distance et rugosité
          float distAtten = smoothstep(0.008, 0.04, d);
          float reflMask = (uReflectionStyle == 4) ? (0.65 + 0.55 * reflGain) : (reflGain * roughBlurMult * 0.72);
          groundCol += reflLight * reflMask * distAtten * uIntensity;

          // 9. Brume douce à la ligne d'horizon pour fusionner avec gradient_sky
          float horizonFade = smoothstep(horizon + 0.015, horizon - 0.055, uv.y);
          float horizonMist = exp(-d * 18.0) * 0.45;
          groundCol += colRefl * horizonMist * 0.35 * uIntensity;

          float alpha = clamp(horizonFade * (0.94 + horizonMist * 0.06), 0.0, 1.0);
          if (alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(groundCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -85
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<WetSurfaceProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.baseColor !== undefined) {
      this.baseColorVec.set(newProps.baseColor)
      this.material.uniforms.uBaseColor.value = this.baseColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.reflectionColor !== undefined) {
      this.reflectionColorVec.set(newProps.reflectionColor)
      this.material.uniforms.uReflectionColor.value = this.reflectionColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryReflectionColor !== undefined) {
      this.secondaryReflectionVec.set(newProps.secondaryReflectionColor)
      this.material.uniforms.uSecondaryReflection.value = this.secondaryReflectionVec
      this.material.uniforms.uUseSecondaryRefl.value = true
    }
    if (newProps.surfaceType !== undefined) {
      this.material.uniforms.uSurfaceType.value = SURFACE_TYPE_MAP[newProps.surfaceType] ?? 0
    }
    if (newProps.reflectionStyle !== undefined) {
      this.material.uniforms.uReflectionStyle.value =
        REFLECTION_STYLE_MAP[newProps.reflectionStyle] ?? 0
    }
    if (newProps.horizonHeight !== undefined)
      this.material.uniforms.uHorizonHeight.value = newProps.horizonHeight
    if (newProps.puddleCoverage !== undefined)
      this.material.uniforms.uPuddleCoverage.value = newProps.puddleCoverage
    if (newProps.rainRipples !== undefined)
      this.material.uniforms.uRainRipples.value = newProps.rainRipples
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.wetness !== undefined) this.material.uniforms.uWetness.value = newProps.wetness
    if (newProps.roughness !== undefined)
      this.material.uniforms.uRoughness.value = newProps.roughness
    if (newProps.fresnelStrength !== undefined)
      this.material.uniforms.uFresnelStrength.value = newProps.fresnelStrength
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
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

export const WetSurfaceDefinition: IBrickDefinition<WetSurfaceProps> = {
  type: 'wet_surface',
  category: 'background',
  create: (id, props, context) => new WetSurfaceInstance(id, props, context),
}

BrickRegistry.register(WetSurfaceDefinition)
