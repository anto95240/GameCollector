/**
 * src/theme-engine/bricks/parallax/ParallaxForestBrick.ts
 *
 * Brique de silhouettes de Forêt en Parallaxe (Couche 2 : Intermediate).
 * Forêt profonde réaliste étagée sur jusqu'à 4 plans en perspective :
 * - Espèces variées : conifères (sapins/pins à verticilles étagés) et feuillus (houppiers multi-lobes + fourches)
 * - Densité différenciée par plan : crête boisée continue au loin, sous-bois aéré au milieu,
 *   grands arbres clairsemés au premier plan laissant voir les troncs et la profondeur
 * - Trouées de lumière filtrant entre les cimes et soulignant les lisières de feuillage
 * - Brume au sol dérivant entre les troncs et les plans de profondeur
 * - Mouvement du vent strictement limité aux cimes (troncs et bases parfaitement rigides)
 * - Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW)
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Forêt.
 */
export interface ParallaxForestProps {
  /** Teinte dominante des arbres au premier plan (défaut #0a1f18 ou uPaletteSecondary * 0.35). */
  forestColor?: string
  /** Teinte de la brume de sous-bois et d'horizon (défaut #164e3f ou uPalettePrimary * 0.3). */
  fogColor?: string
  /** Densité globale des arbres (défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent dans les cimes et de la brume au sol (défaut 0.25). */
  speed?: number
  /** Profondeur d'étagement et sensibilité à la parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Contraste général, opacité et présence de brume (défaut 1.0). */
  intensity?: number
  /** Variabilité des hauteurs, espacements et silhouettes d'arbres (défaut 0.4). */
  randomness?: number
  /** Amplitude de flexion des cimes sous le vent (défaut 0.5). */
  windStrength?: number
  /** Proportion de conifères vs feuillus (0.0 = 100% feuillus, 1.0 = 100% conifères, défaut 0.62). */
  coniferRatio?: number
  /** Intensité des trouées de lumière et du rétro-éclairage des lisières (0.0 à 1.5, défaut 0.55). */
  lightGapIntensity?: number
  /** Teinte optionnelle de la lumière filtrant dans les trouées (défaut dérivé de la brume). */
  lightColor?: string
}

export class ParallaxForestInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_forest'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxForestProps
  private forestColorVec: THREE.Color
  private fogColorVec: THREE.Color
  private lightColorVec: THREE.Color

  constructor(id: string, props: ParallaxForestProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.forestColorVec = new THREE.Color(props.forestColor ?? '#0a1f18')
    this.fogColorVec = new THREE.Color(props.fogColor ?? '#164e3f')
    this.lightColorVec = new THREE.Color(props.lightColor ?? '#c7e8d8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const windStrength = props.windStrength ?? 0.5
    const coniferRatio = props.coniferRatio ?? 0.62
    const lightGapIntensity = props.lightGapIntensity ?? 0.55

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
        uForestColor: { value: this.forestColorVec },
        uFogColor: { value: this.fogColorVec },
        uLightColor: { value: this.lightColorVec },
        uUseCustomColors: {
          value: Boolean(props.forestColor || props.fogColor),
        },
        uUseCustomLightColor: {
          value: Boolean(props.lightColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uWindStrength: { value: windStrength },
        uConiferRatio: { value: coniferRatio },
        uLightGapIntensity: { value: lightGapIntensity },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.992, 1.0);
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
        uniform vec3 uForestColor;
        uniform vec3 uFogColor;
        uniform vec3 uLightColor;
        uniform bool uUseCustomColors;
        uniform bool uUseCustomLightColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uWindStrength;
        uniform float uConiferRatio;
        uniform float uLightGapIntensity;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Hauteur de sol vallonné d'un plan donné (cohérente pour chaque pied d'arbre)
        float layerGroundY(float x, float baseLineY, float layerId) {
          float g = snoise(vec2(x * 1.15, layerId * 5.7)) * 0.045;
          g += snoise(vec2(x * 2.9, layerId * 13.1)) * 0.016;
          return baseLineY + g;
        }

        // Silhouette d'un conifère (sapin/pin) : tronc droit rigide + étages de branches retombantes + vent uniquement sur la cime
        // Retourne vec2(couverture [0..1], facteur bord/lisière feuillage [0..1])
        vec2 evalConifer(
          vec2 local,
          float treeH,
          float treeW,
          float crownStartRel,
          float windSway,
          float seed,
          float aa
        ) {
          if (local.y < -0.02 || local.y > treeH + aa * 2.0) return vec2(0.0);
          if (abs(local.x) > treeW * 1.35 + abs(windSway)) return vec2(0.0);

          float yRel = clamp(local.y / max(0.01, treeH), 0.0, 1.0);

          // Mouvement du vent UNIQUEMENT sur la moitié supérieure / cime (tronc parfaitement fixe)
          float crownBend = pow(smoothstep(0.32, 1.0, yRel), 1.9);
          float px = local.x - windSway * crownBend;
          float ax = abs(px);

          // 1. Tronc visible rigide (s'évase très légèrement aux racines)
          float trunkW = treeW * mix(0.115, 0.045, yRel);
          float trunkCov = (1.0 - smoothstep(trunkW - aa, trunkW + aa, abs(local.x - windSway * crownBend * 0.25)))
                         * step(yRel, 0.85);

          // 2. Étages de branches (verticilles de sapin/épicéa)
          float canopyCov = 0.0;
          float edgeRim = 0.0;
          if (yRel >= crownStartRel - 0.03) {
            float cy = clamp((yRel - crownStartRel) / max(0.1, 1.0 - crownStartRel), 0.0, 1.0);
            float tiers = 5.0 + floor(fract(seed * 7.3) * 3.0); // 5 à 7 étages
            float tierPos = cy * tiers;
            float tierIdx = floor(tierPos);
            float tierFrac = fract(tierPos);

            // Profil en dents de scie : chaque verticille s'élargit vers le bas et s'effile au sommet
            float boughFlare = 0.58 + 0.48 * pow(1.0 - tierFrac, 0.72);
            float tierJitter = 0.86 + 0.28 * hash12(vec2(tierIdx, seed * 19.3));
            // Légère asymétrie gauche/droite par étage
            float sideJitter = 0.90 + 0.20 * hash12(vec2(tierIdx + sign(px) * 3.0, seed * 11.1));
            float envW = treeW * pow(max(0.0, 1.0 - cy), 0.86) * boughFlare * tierJitter * sideJitter;

            // Légère retombée des branches aux extrémités + micro-aiguilles sur le bord
            float needleNoise = 0.0;
            if (uQualityLevel >= 1) {
              needleNoise = snoise(vec2(px * 42.0 + seed * 9.0, local.y * 36.0)) * treeW * 0.14 * (1.0 - cy * 0.45);
            }
            float bound = max(0.0, envW + needleNoise);
            float baseFade = smoothstep(crownStartRel - 0.02, crownStartRel + 0.04, yRel);
            canopyCov = (1.0 - smoothstep(bound - aa, bound + aa, ax)) * baseFade;
            // Lisière fine pour capter la lumière des trouées
            edgeRim = smoothstep(bound - treeW * 0.26, bound, ax) * canopyCov * smoothstep(0.15, 0.75, cy);
          }

          float cov = max(trunkCov, canopyCov);
          return vec2(cov, edgeRim);
        }

        // Silhouette d'un feuillu (chêne/hêtre) : tronc visible avec fourche + houppier multi-lobes + vent sur la cime
        vec2 evalBroadleaf(
          vec2 local,
          float treeH,
          float treeW,
          float crownStartRel,
          float windSway,
          float seed,
          float aa
        ) {
          // Garde large pour ne jamais rogner le sommet arrondi des feuillus
          if (local.y < -0.02 || local.y > treeH * 1.38) return vec2(0.0);
          if (abs(local.x) > treeW * 1.95 + abs(windSway)) return vec2(0.0);

          float yRel = clamp(local.y / max(0.01, treeH), 0.0, 1.0);
          // Vent uniquement sur le haut de la cime
          float crownBend = pow(smoothstep(0.35, 1.0, yRel), 1.85);
          float swayX = windSway * crownBend;

          // 1. Tronc solide et légèrement sinueux + 2 branches maîtresses en Y à la base du houppier
          float trunkLean = sin(yRel * 2.6 + seed * 6.28) * treeW * 0.07 * smoothstep(0.0, 0.5, yRel);
          float trunkW = treeW * mix(0.14, 0.065, smoothstep(0.0, crownStartRel + 0.15, yRel));
          float trunkCov = (1.0 - smoothstep(trunkW - aa, trunkW + aa, abs(local.x - trunkLean)))
                         * step(yRel, crownStartRel + 0.14);

          if (uQualityLevel >= 1 && yRel > crownStartRel - 0.08 && yRel < crownStartRel + 0.22) {
            float fy = (yRel - (crownStartRel - 0.06)) / 0.26;
            float limbOffset = fy * treeW * 0.34;
            float limbW = trunkW * 0.52 * (1.0 - fy * 0.45);
            float l1 = 1.0 - smoothstep(limbW - aa, limbW + aa, abs(local.x - trunkLean - limbOffset));
            float l2 = 1.0 - smoothstep(limbW - aa, limbW + aa, abs(local.x - trunkLean + limbOffset * 0.85));
            trunkCov = max(trunkCov, max(l1, l2));
          }

          // 2. Houppier organique multi-lobes (3 à 4 masses de feuillage assemblées)
          float canopyCov = 0.0;
          float edgeRim = 0.0;
          if (yRel >= crownStartRel - 0.06) {
            float crownH = treeH * (1.0 - crownStartRel);
            vec2 cOrigin = vec2(trunkLean + swayX, treeH * (crownStartRel + (1.0 - crownStartRel) * 0.48));
            vec2 relC = local - cOrigin;

            float dMin = 99.0;
            // Lobe central supérieur
            vec2 p0 = relC - vec2(0.0, crownH * 0.16);
            dMin = min(dMin, length(p0 / vec2(treeW * 0.86, crownH * 0.48)) - 1.0);
            // Lobe gauche
            float jL = 0.82 + 0.32 * hash12(vec2(seed, 3.1));
            vec2 p1 = relC - vec2(-treeW * 0.48, -crownH * 0.02);
            dMin = min(dMin, length(p1 / vec2(treeW * 0.64 * jL, crownH * 0.40)) - 1.0);
            // Lobe droit
            float jR = 0.82 + 0.32 * hash12(vec2(seed, 7.9));
            vec2 p2 = relC - vec2(treeW * 0.46, -crownH * 0.06);
            dMin = min(dMin, length(p2 / vec2(treeW * 0.66 * jR, crownH * 0.38)) - 1.0);

            if (uQualityLevel >= 1) {
              // Bord de feuillage découpé (bouquets de feuilles + micro-trouées en bordure)
              float leafEdge = snoise(vec2(relC.x * 26.0 + seed * 5.0, relC.y * 24.0 + seed * 3.0)) * 0.20;
              if (uQualityLevel >= 2) {
                leafEdge += snoise(vec2(relC.x * 54.0 + seed * 11.0, relC.y * 52.0)) * 0.09;
              }
              dMin += leafEdge;
            }

            float aaNorm = aa / max(0.01, min(treeW, crownH) * 0.5);
            canopyCov = 1.0 - smoothstep(-aaNorm, aaNorm, dMin);
            // Lisière éclairée par la lumière filtrant dans le ciel
            edgeRim = smoothstep(-0.34, 0.02, dMin) * canopyCov * smoothstep(crownStartRel, 0.92, yRel);
          }

          float cov = max(trunkCov, canopyCov);
          return vec2(cov, edgeRim);
        }

        // Évalue une strate complète d'arbres avec densité propre, troncs visibles et vent sur les cimes
        vec4 evaluateForestLayer(
          vec2 uv,
          float aspect,
          float baseLineY,
          float layerScale,
          float cellSpacing,
          float presenceProb,
          float crownStartRel,
          float parallaxRatio,
          float windFactor,
          float distanceFactor,
          float layerId,
          vec3 layerColor,
          vec3 fogCol,
          vec3 lightCol,
          float time,
          vec2 mouse,
          float aa
        ) {
          float shiftX = mouse.x * uDepth * parallaxRatio * 1.45;
          float shiftY = mouse.y * uDepth * parallaxRatio * 0.32 + uScroll * parallaxRatio * 0.16;
          vec2 p = vec2((uv.x - 0.5) * aspect + shiftX, uv.y + shiftY);

          float cellW = cellSpacing / clamp(uDensity, 0.4, 2.2);
          float cellIdx = floor(p.x / cellW);

          float bestCov = 0.0;
          float bestRim = 0.0;
          float bestYRel = 0.0;

          // Vérification cellule courante + 2 voisines (-1, 0, +1) pour éviter toute coupure
          for (int k = -1; k <= 1; k++) {
            float idx = cellIdx + float(k);
            float hExist = hash12(vec2(idx, layerId * 17.3 + 1.1));
            if (hExist > presenceProb) continue;

            float hSize = hash12(vec2(idx + 13.7, layerId * 29.1));
            float hType = hash12(vec2(idx + 37.3, layerId * 7.9));
            float hJit = hash12(vec2(idx + 71.1, layerId * 11.3));

            float rootX = (idx + 0.5 + (hJit - 0.5) * 0.55) * cellW;
            float rootGroundY = layerGroundY(rootX, baseLineY, layerId);

            float treeH = (0.19 + hSize * 0.17 * (0.5 + uRandomness)) * layerScale;
            float isConifer = step(1.0 - clamp(uConiferRatio, 0.0, 1.0), hType);
            float treeW = (isConifer > 0.5 ? (0.036 + hSize * 0.022) : (0.048 + hSize * 0.028)) * layerScale;

            // Rafale cohérente par arbre (évaluée à rootX, pas à p.x : zéro déformation en gelée)
            float gust = 0.0;
            if (windFactor > 0.01 && uWindStrength > 0.01) {
              float tW = time * max(0.05, uSpeed);
              float w1 = sin(tW * 1.45 + idx * 1.37 + layerId) * 0.55;
              float w2 = snoise(vec2(rootX * 1.6 - tW * 0.55, layerId * 3.1)) * 0.65;
              gust = (w1 + w2) * 0.016 * uWindStrength * windFactor * layerScale;
            }

            vec2 local = vec2(p.x - rootX, p.y - rootGroundY);
            vec2 res = (isConifer > 0.5)
              ? evalConifer(local, treeH, treeW, crownStartRel, gust, hSize * 19.0 + idx * 0.31, aa)
              : evalBroadleaf(local, treeH, treeW, crownStartRel, gust, hSize * 23.0 + idx * 0.47, aa);

            if (res.x > bestCov) {
              bestCov = res.x;
              bestRim = res.y;
              bestYRel = clamp(local.y / max(0.01, treeH), 0.0, 1.0);
            }
          }

          // Sol boisé sous la ligne de terrain
          float gY = layerGroundY(p.x, baseLineY, layerId);
          float inGround = 1.0 - smoothstep(gY - aa, gY + aa, p.y);
          float totalCov = max(bestCov, inGround);
          if (totalCov <= 0.004) {
            return vec4(0.0);
          }

          // Dégradé subtil hauteur + rétro-éclairage de lisière par les trouées de lumière
          vec3 col = mix(layerColor * 0.78, layerColor * 1.12, bestYRel);
          float rimGlow = bestRim * uLightGapIntensity * (0.42 - distanceFactor * 0.18);
          col += lightCol * max(0.0, rimGlow);

          // Désaturation atmosphérique sur les strates lointaines
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lum), distanceFactor * 0.35);
          col = mix(col, fogCol, distanceFactor * 0.52);

          // Brume légère au ras du sol sur le bas des troncs
          float trunkMist = smoothstep(0.11 * layerScale, -0.01, p.y - gY);
          col = mix(col, fogCol, trunkMist * (0.38 + distanceFactor * 0.25));

          return vec4(col, totalCov);
        }

        // Nappe de brume au sol dérivant entre les plans
        float evalGroundMist(vec2 uv, float aspect, float centerY, float bandH, float speedMult, float seed, float time) {
          float env = exp(-pow((uv.y - centerY) / max(0.02, bandH), 2.0));
          if (env < 0.02) return 0.0;
          float drift = time * max(0.04, uSpeed) * speedMult;
          vec2 mp = vec2(uv.x * aspect * 2.1 - drift + seed, uv.y * 5.5 + seed * 0.4);
          float n = snoise(mp) * 0.5 + 0.5;
          if (uQualityLevel >= 2) {
            float n2 = snoise(mp * 2.2 + vec2(n * 0.7 - drift * 0.5, 1.9)) * 0.5 + 0.5;
            n = n * 0.6 + n2 * 0.4;
          }
          return env * (0.32 + 0.68 * n);
        }

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float aa = 1.4 / max(1.0, uResolution.y);
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseForest = uUseCustomColors ? uForestColor : (uPaletteSecondary * 0.32);
          vec3 baseFog = uUseCustomColors ? uFogColor : (uPalettePrimary * 0.34);
          // Brume atmosphérique de profondeur légèrement plus claire/laiteuse pour bien détacher les 4 plans et les troncs
          vec3 aerialFog = mix(baseFog * 1.55, vec3(0.28, 0.44, 0.48), 0.38);
          vec3 lightCol = uUseCustomLightColor
            ? uLightColor
            : mix(aerialFog * 1.35, vec3(0.88, 0.95, 0.86), 0.48);

          vec4 result = vec4(0.0);

          // =========================================================================
          // STRATE 4 : Crête boisée lointaine très dense et brumeuse (HIGH uniquement)
          // =========================================================================
          if (uQualityLevel >= 2) {
            vec4 l4 = evaluateForestLayer(
              uv, aspect, 0.39, 0.55, 0.048, 0.94, 0.10, 0.08, 0.12, 0.88, 4.0,
              baseForest, aerialFog, lightCol, t, uMouse, aa * 1.5
            );
            if (l4.a > 0.004) result = l4;
          }

          // =========================================================================
          // STRATE 3 : Plan intermédiaire lointain — densité soutenue (MEDIUM & HIGH)
          // =========================================================================
          if (uQualityLevel >= 1) {
            vec4 l3 = evaluateForestLayer(
              uv, aspect, 0.29, 0.78, 0.068, 0.86, 0.16, 0.18, 0.38, 0.58, 3.0,
              baseForest, aerialFog, lightCol, t, uMouse, aa * 1.2
            );
            if (l3.a > 0.004) {
              result.rgb = mix(result.rgb, l3.rgb, l3.a);
              result.a = max(result.a, l3.a);
            }

            // Brume flottante entre strate 3 et strate 2
            float mFar = evalGroundMist(uv, aspect, 0.27, 0.10, 0.12, 4.2, t) * 0.52;
            if (mFar > 0.005) {
              result.rgb = mix(result.rgb, aerialFog * 1.08, mFar);
              result.a = max(result.a, mFar * 0.68);
            }
          }

          // =========================================================================
          // STRATE 2 : Plan médian boisé avec clairières (Tous paliers)
          // =========================================================================
          {
            vec4 l2 = evaluateForestLayer(
              uv, aspect, 0.17, 1.05, 0.095, 0.76, 0.24, 0.32, 0.72, 0.28, 2.0,
              baseForest, aerialFog, lightCol, t, uMouse, aa
            );
            if (l2.a > 0.004) {
              result.rgb = mix(result.rgb, l2.rgb, l2.a);
              result.a = max(result.a, l2.a);
            }
          }

          // Trouées de lumière obliques filtrant entre les cimes médianes vers la brume du sous-bois (MEDIUM & HIGH)
          if (uQualityLevel >= 1 && uLightGapIntensity > 0.02) {
            float driftL = t * max(0.02, uSpeed) * 0.06;
            float slantX = (uv.x - 0.5) * aspect - uv.y * 0.36 + uMouse.x * uDepth * 0.12;
            float ray1 = pow(0.5 + 0.5 * snoise(vec2(slantX * 3.2 + driftL, 1.8)), 2.5);
            float ray2 = (uQualityLevel >= 2)
              ? pow(0.5 + 0.5 * snoise(vec2(slantX * 5.8 - driftL * 0.7, 5.4)), 2.9)
              : 0.0;
            float vFade = smoothstep(0.02, 0.30, uv.y) * smoothstep(0.84, 0.34, uv.y);
            float shaft = (ray1 * 0.68 + ray2 * 0.42) * vFade * uLightGapIntensity * 0.36;
            if (shaft > 0.004) {
              result.rgb = mix(result.rgb, lightCol, clamp(shaft, 0.0, 0.52));
              result.a = max(result.a, shaft * 0.65);
            }
          }

          // Brume rampante au sol DERRIÈRE les troncs du premier plan (met les troncs en relief!)
          {
            float mMid = (uQualityLevel == 0)
              ? smoothstep(0.24, 0.02, uv.y) * 0.46
              : evalGroundMist(uv, aspect, 0.13, 0.115, 0.20, 12.7, t) * 0.64;
            if (mMid > 0.005) {
              vec3 mistTint = mix(aerialFog, lightCol, uLightGapIntensity * 0.26);
              result.rgb = mix(result.rgb, mistTint, clamp(mMid, 0.0, 0.72));
              result.a = max(result.a, mMid * 0.75);
            }
          }

          // =========================================================================
          // STRATE 1 : Premier Plan — arbres hauts et clairsemés, TRONCS VISIBLES, forte parallaxe
          // =========================================================================
          {
            vec4 l1 = evaluateForestLayer(
              uv, aspect, 0.02, 1.68, 0.21, 0.62, 0.42, 0.56, 1.0, 0.0, 1.0,
              baseForest * 0.72, aerialFog * 0.75, lightCol, t, uMouse, aa
            );
            if (l1.a > 0.004) {
              result.rgb = mix(result.rgb, l1.rgb, l1.a);
              result.a = max(result.a, l1.a);
            }
          }

          // Voile très léger de brume rasante tout en bas devant les racines (HIGH)
          if (uQualityLevel >= 2) {
            float frontMist = evalGroundMist(uv, aspect, 0.03, 0.065, 0.28, 29.4, t) * 0.36;
            if (frontMist > 0.004) {
              result.rgb = mix(result.rgb, aerialFog * 0.85, frontMist);
              result.a = max(result.a, frontMist * 0.62);
            }
          }

          // Lucioles dorées discrètes dans le sous-bois brumeux (HIGH uniquement)
          if (uQualityLevel >= 2 && uv.y > 0.07 && uv.y < 0.46) {
            vec2 ffGrid = vec2(uv.x * aspect * 14.0, uv.y * 18.0);
            vec2 ffCell = floor(ffGrid);
            float fRand = hash12(ffCell + 42.1);
            if (fRand > 0.935) {
              vec2 basePos = hash22(ffCell + 77.3) * 0.55 + 0.22;
              vec2 driftP = vec2(sin(t * 0.75 + fRand * 12.0), cos(t * 0.58 + fRand * 19.0)) * 0.14;
              float dist = length(fract(ffGrid) - (basePos + driftP));
              float pulse = pow(0.5 + 0.5 * sin(t * (1.6 + fRand * 1.8) + fRand * 17.0), 3.2);
              float glow = exp(-dist * dist * 85.0) * pulse;
              if (glow > 0.01) {
                vec3 fireflyCol = vec3(0.98, 0.88, 0.42);
                result.rgb += fireflyCol * glow * 0.55;
                result.a = max(result.a, glow * 0.45);
              }
            }
          }

          if (result.a <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(result.rgb, clamp(result.a * uIntensity, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -40
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxForestProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.forestColor !== undefined) {
      this.forestColorVec.set(newProps.forestColor)
      this.material.uniforms.uForestColor.value = this.forestColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.fogColor !== undefined) {
      this.fogColorVec.set(newProps.fogColor)
      this.material.uniforms.uFogColor.value = this.fogColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.lightColor !== undefined) {
      this.lightColorVec.set(newProps.lightColor)
      this.material.uniforms.uLightColor.value = this.lightColorVec
      this.material.uniforms.uUseCustomLightColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.windStrength !== undefined)
      this.material.uniforms.uWindStrength.value = newProps.windStrength
    if (newProps.coniferRatio !== undefined)
      this.material.uniforms.uConiferRatio.value = newProps.coniferRatio
    if (newProps.lightGapIntensity !== undefined)
      this.material.uniforms.uLightGapIntensity.value = newProps.lightGapIntensity
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

export const ParallaxForestDefinition: IBrickDefinition<ParallaxForestProps> = {
  type: 'parallax_forest',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxForestInstance(id, props, context),
}

BrickRegistry.register(ParallaxForestDefinition)
