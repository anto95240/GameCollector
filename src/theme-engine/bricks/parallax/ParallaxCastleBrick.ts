/**
 * src/theme-engine/bricks/parallax/ParallaxCastleBrick.ts
 *
 * Brique de silhouettes de Château & Forteresse en Ruines en Parallaxe (Couche 2 : Intermediate).
 * Architecture médiévale nette et strictement statique (aucune ondulation des murs ou créneaux) :
 * - Promontoire rocheux escarpé et crête lointaine en perspective atmosphérique
 * - Deux plans architecturaux : donjon/citadelle intérieure (plus lointain et légèrement brumeux)
 *   et remparts/tours d'avant-plan (nets, sombres, créneaux horizontaux francs, mâchicoulis)
 * - Ruines par blocs de maçonnerie ébréchés en escalier (ruinDecay), sans déformation molle
 * - Fenêtres rectangulaires alignées sur l'architecture, dont quelques-unes éclairées
 *   par un scintillement chaleureux irrégulier et asynchrone
 * - Brume vaporeuse dérivant devant les remparts et le pied de la falaise
 * - Quelques oiseaux/corbeaux lointains battant des ailes au-dessus des flèches
 * - Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW)
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Château / Ruines.
 */
export interface ParallaxCastleProps {
  /** Teinte de la maçonnerie médiévale et des murailles (défaut #080d1a ou uPaletteSecondary * 0.28). */
  castleColor?: string
  /** Teinte des torches chaleureuses vacillant dans les fenêtres (défaut #f97316 ou uPaletteAccent). */
  torchColor?: string
  /** Teinte du promontoire rocheux et des falaises (défaut #0f172a ou uPaletteSecondary * 0.38). */
  rockColor?: string
  /** Densité et richesse architecturale (nombre de tours et contreforts, défaut 1.0). */
  density?: number
  /** Vitesse de vacillement des fenêtres, dérive de la brume et vol des oiseaux (défaut 0.3). */
  speed?: number
  /** Étalement en profondeur et sensibilité à la parallaxe souris/scroll (défaut 0.3). */
  depth?: number
  /** Contraste d'ombre et opacité globale (défaut 1.0). */
  intensity?: number
  /** Asymétrie architecturale des hauteurs de tours (défaut 0.4). */
  randomness?: number
  /** Degré de délabrement en ruines (0.0 = forteresse intacte, 1.0 = ruines effondrées, défaut 0.25). */
  ruinDecay?: number
  /** Éclat et halo de diffusion des fenêtres éclairées (défaut 1.0). */
  torchGlow?: number
  /** Densité de la brume atmosphérique passant devant le château (0.0 à 1.2, défaut 0.55). */
  mistDensity?: number
  /** Teinte optionnelle de la brume atmosphérique (défaut dérivé du ciel / roche). */
  mistColor?: string
}

export class ParallaxCastleInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_castle'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxCastleProps
  private castleColorVec: THREE.Color
  private torchColorVec: THREE.Color
  private rockColorVec: THREE.Color
  private mistColorVec: THREE.Color

  constructor(id: string, props: ParallaxCastleProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.castleColorVec = new THREE.Color(props.castleColor ?? '#080d1a')
    this.torchColorVec = new THREE.Color(props.torchColor ?? '#f97316')
    this.rockColorVec = new THREE.Color(props.rockColor ?? '#0f172a')
    this.mistColorVec = new THREE.Color(props.mistColor ?? '#334155')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const ruinDecay = props.ruinDecay ?? 0.25
    const torchGlow = props.torchGlow ?? 1.0
    const mistDensity = props.mistDensity ?? 0.55

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
        uCastleColor: { value: this.castleColorVec },
        uTorchColor: { value: this.torchColorVec },
        uRockColor: { value: this.rockColorVec },
        uMistColor: { value: this.mistColorVec },
        uUseCustomColors: {
          value: Boolean(props.castleColor || props.torchColor || props.rockColor),
        },
        uUseCustomMistColor: {
          value: Boolean(props.mistColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uRuinDecay: { value: ruinDecay },
        uTorchGlow: { value: torchGlow },
        uMistDensity: { value: mistDensity },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.993, 1.0);
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
        uniform vec3 uCastleColor;
        uniform vec3 uTorchColor;
        uniform vec3 uRockColor;
        uniform vec3 uMistColor;
        uniform bool uUseCustomColors;
        uniform bool uUseCustomMistColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uRuinDecay;
        uniform float uTorchGlow;
        uniform float uMistDensity;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Brèche de ruine en escalier de pierres nettes (jamais d'ondulation molle)
        float steppedRuinDrop(float x, float blockW, float decay, float seed) {
          if (decay <= 0.02) return 0.0;
          float col = floor(x / max(0.004, blockW));
          float r1 = hash12(vec2(col, seed));
          float r2 = hash12(vec2(floor(col * 0.5), seed + 17.3));
          // Seuls certains créneaux/blocs s'effondrent, par paliers de hauteur de pierre
          float notch = step(1.0 - decay * 0.85, r1) * (0.35 + 0.65 * r2);
          float tiers = floor(notch * 4.5 + 0.2) * 0.016 * decay;
          return tiers;
        }

        // Tour médiévale strictement statique (horizontale et verticale nettes) avec créneaux, mâchicoulis et flèche optionnelle
        // Retourne vec2(couverture [0..1], facteur bord éclairé [0..1])
        vec2 evalStaticTower(
          vec2 q,
          float cx,
          float baseY,
          float width,
          float height,
          float hasSpire,
          float merlonCount,
          float decay,
          float seed,
          float aa
        ) {
          float halfW = width * 0.5;
          float dx = abs(q.x - cx);
          float topY = baseY + height;

          // Rejet rapide
          if (dx > halfW * 1.25 || q.y < baseY - 0.02 || q.y > topY + width * 1.9) {
            return vec2(0.0);
          }

          bool intactSpire = (hasSpire > 0.5 && decay < 0.55);
          float ruinCut = intactSpire ? 0.0 : steppedRuinDrop(q.x - cx, width / max(4.0, merlonCount * 2.0), decay, seed);
          float effTop = topY - ruinCut;

          // Corps principal rectangulaire + léger encorbellement (mâchicoulis) juste sous le parapet
          float corbelZone = smoothstep(topY - 0.036, topY - 0.028, q.y) * step(q.y, effTop + 0.002);
          float bodyHalfW = halfW + corbelZone * 0.0055 * step(decay, 0.72);
          float inBodyX = 1.0 - smoothstep(bodyHalfW - aa, bodyHalfW + aa, dx);
          float inBodyY = smoothstep(baseY - aa, baseY + aa, q.y) * (1.0 - smoothstep(effTop - aa, effTop + aa, q.y));
          float body = inBodyX * inBodyY;

          // Créneaux nets au sommet du parapet (sur les tours sans toit conique)
          float crenelH = 0.017;
          float crenel = 0.0;
          if (!intactSpire && q.y >= effTop - aa && q.y <= effTop + crenelH + aa && dx <= bodyHalfW + aa) {
            float u = (q.x - (cx - bodyHalfW)) / max(0.001, 2.0 * bodyHalfW);
            float cell = u * merlonCount;
            float cellIdx = floor(cell);
            float f = fract(cell);
            // Merlon solide occupant 56% du pas, créneau vide 44%
            float merlonPresent = step(decay * 0.65, hash12(vec2(cellIdx, seed + 5.1)));
            float mMaskX = (1.0 - smoothstep(0.56 - aa * 8.0, 0.56 + aa * 8.0, f)) * smoothstep(0.0, aa * 6.0, f);
            // Bords gauche/droit toujours fermés si non ruinés
            if (cellIdx < 0.5 || cellIdx >= merlonCount - 1.5) mMaskX = max(mMaskX, 1.0 - smoothstep(0.60, 0.64, f));
            float mMaskY = 1.0 - smoothstep(effTop + crenelH - aa, effTop + crenelH + aa, q.y);
            crenel = mMaskX * mMaskY * inBodyX * merlonPresent;
          }

          // Flèche / toit conique gothique posé bien à plat sur la corniche (aucune fente sous le toit)
          float spire = 0.0;
          if (intactSpire) {
            float spireBase = effTop - 0.006;
            float spireH = width * (1.28 + 0.25 * fract(seed * 3.7));
            float relY = (q.y - spireBase) / max(0.001, spireH);
            if (relY >= -0.02 && relY <= 1.02) {
              float spireHalfW = max(0.0, (1.0 - relY)) * (bodyHalfW * 1.14);
              float sX = 1.0 - smoothstep(spireHalfW - aa, spireHalfW + aa, dx);
              float sY = smoothstep(spireBase - aa, spireBase + aa, q.y) * (1.0 - smoothstep(spireBase + spireH - aa, spireBase + spireH + aa, q.y));
              spire = sX * sY;
              // Fin épi de faîtage vertical au sommet
              float finialH = 0.026;
              if (q.y >= spireBase + spireH - aa && q.y <= spireBase + spireH + finialH) {
                float fMask = (1.0 - smoothstep(0.0018, 0.0018 + aa, dx));
                spire = max(spire, fMask);
              }
            }
          }

          float cov = max(max(body, crenel), spire);
          // Lumière rasante sur le flanc gauche (lune/ciel)
          float litEdge = smoothstep(-halfW * 0.45, -halfW * 0.98, q.x - cx) * cov;
          return vec2(cov, litEdge);
        }

        // Courtine (mur horizontal net avec créneaux réguliers, arches/brèches en ruine)
        vec2 evalCurtainWall(
          vec2 q,
          float xMin,
          float xMax,
          float baseY,
          float wallH,
          float merlonStep,
          float decay,
          float seed,
          float aa
        ) {
          if (q.x < xMin - aa || q.x > xMax + aa || q.y < baseY - 0.02 || q.y > baseY + wallH + 0.03) {
            return vec2(0.0);
          }

          float ruinCut = steppedRuinDrop(q.x, merlonStep * 1.1, decay * 1.25, seed);
          // Brèche centrale éventuelle si très en ruine
          float midX = 0.5 * (xMin + xMax);
          float breachW = (xMax - xMin) * 0.22 * smoothstep(0.45, 0.95, decay);
          if (breachW > 0.005 && abs(q.x - midX) < breachW) {
            ruinCut += (1.0 - abs(q.x - midX) / breachW) * wallH * 0.58;
          }

          float topY = baseY + wallH - ruinCut;
          float inX = smoothstep(xMin - aa, xMin + aa, q.x) * (1.0 - smoothstep(xMax - aa, xMax + aa, q.x));
          float inY = smoothstep(baseY - aa, baseY + aa, q.y) * (1.0 - smoothstep(topY - aa, topY + aa, q.y));
          float wall = inX * inY;

          // Créneaux horizontaux réguliers sur la partie non effondrée
          float crenelH = 0.014;
          float crenel = 0.0;
          if (ruinCut < 0.006 && q.y >= topY - aa && q.y <= topY + crenelH + aa) {
            float cell = (q.x - xMin) / max(0.008, merlonStep);
            float f = fract(cell);
            float merlonOk = step(decay * 0.55, hash12(vec2(floor(cell), seed + 9.3)));
            float mx = (1.0 - smoothstep(0.55 - aa * 10.0, 0.55 + aa * 10.0, f)) * smoothstep(0.0, aa * 8.0, f);
            float my = 1.0 - smoothstep(topY + crenelH - aa, topY + crenelH + aa, q.y);
            crenel = inX * mx * my * merlonOk;
          }

          float cov = max(wall, crenel);
          // Légère arête éclairée sur le bord supérieur du parapet
          float topRim = smoothstep(topY - 0.008, topY, q.y) * cov * 0.45;
          return vec2(cov, topRim);
        }

        // Fenêtres rectangulaires alignées sur des étages horizontaux stricts (scintillement irrégulier)
        // Retourne vec2(masqueOuverture [0..1], intensitéLumière [0..1])
        vec2 evalCastleWindows(vec2 q, float baseY, float maxY, float t, float seed, float aa) {
          if (q.y < baseY + 0.035 || q.y > maxY - 0.025) return vec2(0.0);

          float spX = 0.024;
          float spY = 0.036;
          vec2 cell = vec2(floor(q.x / spX), floor((q.y - baseY) / spY));
          vec2 center = vec2((cell.x + 0.5) * spX, baseY + (cell.y + 0.5) * spY);

          float rExist = hash12(cell + vec2(seed, 19.3));
          float rLit = hash12(cell + vec2(seed + 41.7, 7.1));
          // ~38% des emplacements possèdent une fenêtre architecturale
          if (rExist < 0.62) return vec2(0.0);

          // Dimensions rectangulaires nettes (meurtrières ou fenêtres gothiques étroites)
          float halfW = (rExist > 0.86) ? 0.0044 : 0.0032;
          float halfH = (rExist > 0.86) ? 0.0092 : 0.0074;
          vec2 d = abs(q - center);

          float winMask = (1.0 - smoothstep(halfW - aa, halfW + aa, d.x))
                        * (1.0 - smoothstep(halfH - aa, halfH + aa, d.y));
          // Halo doux autour de la fenêtre éclairée sur la pierre proche
          float halo = exp(-length((q - center) / vec2(halfW * 2.8, halfH * 2.4)) * 1.9) * 0.28;

          // Seules quelques fenêtres sont allumées (~38% des fenêtres existantes)
          if (rLit < 0.62) {
            return vec2(winMask, 0.0); // Fenêtre sombre non éclairée
          }

          // Scintillement irrégulier et asynchrone (flamme de torche / bougie)
          float phase = rLit * 47.3 + rExist * 19.1;
          float nFast = snoise(vec2(t * max(0.08, uSpeed) * 4.2 + phase, rExist * 11.0));
          float nSlow = snoise(vec2(t * max(0.05, uSpeed) * 1.15 + phase * 0.5, rLit * 23.0));
          float dip = smoothstep(-0.78, -0.35, snoise(vec2(t * 0.32 + phase, 5.7)));
          float flicker = clamp((0.68 + 0.24 * nFast + 0.16 * nSlow) * (0.25 + 0.75 * dip), 0.0, 1.15);

          float glow = max(winMask, halo * (uQualityLevel >= 2 ? 1.0 : 0.0)) * flicker;
          return vec2(winMask, glow);
        }

        // Oiseau / corbeau fin en vol avec battement d'ailes organique
        float evalBird(vec2 q, vec2 pos, float scale, float flapPhase, float aa) {
          vec2 b = (q - pos) / max(0.002, scale);
          if (abs(b.x) > 1.35 || abs(b.y) > 0.95) return 0.0;
          // Alternance battement doux et court plané
          float flap = sin(flapPhase) * 0.42 + sin(flapPhase * 2.0) * 0.08;
          float ax = abs(b.x);
          // Courbe d'aile en M naturelle
          float wingY = sin(clamp(ax, 0.0, 1.0) * 2.55) * (0.26 + flap) - ax * ax * 0.18;
          float thickness = mix(0.11, 0.025, clamp(ax, 0.0, 1.0));
          float dWing = abs(b.y - wingY) - thickness;
          float wingCov = (1.0 - smoothstep(0.0, aa / scale + 0.05, dWing)) * step(ax, 1.08);
          float bodyCov = 1.0 - smoothstep(0.12, 0.18, length(b * vec2(1.0, 1.8)));
          return max(wingCov, bodyCov);
        }

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float aa = 1.35 / max(1.0, uResolution.y);
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseCastle = uUseCustomColors ? uCastleColor : (uPaletteSecondary * 0.26);
          vec3 baseRock = uUseCustomColors ? uRockColor : (uPaletteSecondary * 0.36);
          vec3 baseTorch = uUseCustomColors ? uTorchColor : uPaletteAccent;
          vec3 mistCol = uUseCustomMistColor
            ? uMistColor
            : mix(baseRock * 1.45, mix(uPalettePrimary * 0.45, vec3(0.42, 0.50, 0.62), 0.5), 0.55);

          // Coordonnées centrées corrigées du ratio d'aspect (proportions architecturales exactes)
          vec2 qBase = vec2((uv.x - 0.5) * aspect, uv.y);

          // Parallaxe différenciée par plan (perspective atmosphérique)
          vec2 shiftFar = vec2(uMouse.x * uDepth * 0.07 * aspect, uMouse.y * uDepth * 0.025 + uScroll * 0.04);
          vec2 shiftBack = vec2(uMouse.x * uDepth * 0.16 * aspect, uMouse.y * uDepth * 0.05 + uScroll * 0.08);
          vec2 shiftFront = vec2(uMouse.x * uDepth * 0.26 * aspect, uMouse.y * uDepth * 0.08 + uScroll * 0.13);

          vec3 finalCol = vec3(0.0);
          float finalAlpha = 0.0;

          // =========================================================================
          // 0. Crête montagneuse lointaine en perspective atmosphérique (HIGH uniquement)
          // =========================================================================
          if (uQualityLevel >= 2) {
            vec2 qFar = qBase + shiftFar;
            float ridge = 0.27
              + (1.0 - abs(snoise(vec2(qFar.x * 1.25 + 2.3, 1.7)))) * 0.14
              + (1.0 - abs(snoise(vec2(qFar.x * 2.9 + 5.1, 4.2)))) * 0.045;
            float farMask = 1.0 - smoothstep(ridge - aa * 2.5, ridge + aa * 2.5, qFar.y);
            if (farMask > 0.004) {
              vec3 farCol = mix(baseRock * 0.9, mistCol, 0.68);
              finalCol = farCol;
              finalAlpha = farMask * 0.72;
            }
          }

          // =========================================================================
          // 1. Oiseaux lointains dans le ciel au-dessus des flèches (MEDIUM & HIGH)
          // =========================================================================
          if (uQualityLevel >= 1) {
            vec2 qSky = qBase + shiftBack;
            int birdCount = (uQualityLevel >= 2) ? 5 : 2;
            float birds = 0.0;
            for (int b = 0; b < 5; b++) {
              if (b >= birdCount) break;
              float fb = float(b);
              float bt = t * max(0.08, uSpeed) * (0.48 + fb * 0.07) + fb * 1.85;
              // Vol lent en courbe large autour du donjon
              vec2 bPos = vec2(
                sin(bt * 0.55 + fb * 1.3) * (0.28 + fb * 0.045) + (fb - 2.0) * 0.04,
                0.62 + cos(bt * 0.42 + fb) * 0.065 + fb * 0.028
              );
              float bScale = 0.011 + fract(fb * 0.37) * 0.005;
              birds = max(birds, evalBird(qSky, bPos, bScale, t * (4.8 + fb * 0.7) + fb * 2.3, aa));
            }
            if (birds > 0.01) {
              vec3 birdCol = mix(baseCastle * 0.85, mistCol, 0.25);
              finalCol = mix(finalCol, birdCol, birds);
              finalAlpha = max(finalAlpha, birds * 0.88);
            }
          }

          // =========================================================================
          // 2. Plan Arrière du Château : Donjon central & Hautes Tours (légèrement voilés par l'atmosphère)
          //    STRICTEMENT STATIQUE : baseY fixe = 0.22 (ne dépend jamais de rockY(x)!)
          // =========================================================================
          vec2 qBack = qBase + shiftBack;
          float castleFoundationY = 0.22;
          float asym = (uRandomness - 0.4) * 0.06;
          float dens = clamp(uDensity, 0.5, 2.0);

          vec2 backArch = vec2(0.0);
          // Grand donjon central avec flèche
          backArch = max(backArch, evalStaticTower(qBack, 0.01, castleFoundationY, 0.145, 0.33 + asym, 1.0, 7.0, uRuinDecay * 0.85, 1.1, aa));
          // Tourelle accolée au donjon (haute flèche élancée)
          backArch = max(backArch, evalStaticTower(qBack, -0.085, castleFoundationY, 0.068, 0.37 - asym * 0.6, 1.0, 4.0, uRuinDecay * 0.95, 2.7, aa));
          // Tour de guet orientale arrière
          backArch = max(backArch, evalStaticTower(qBack, 0.145, castleFoundationY, 0.082, 0.28 + asym * 0.5, 0.0, 5.0, uRuinDecay * 1.15, 3.9, aa));
          // Muraille intérieure haute reliant le donjon
          backArch = max(backArch, evalCurtainWall(qBack, -0.16, 0.19, castleFoundationY, 0.20, 0.022, uRuinDecay * 0.9, 5.3, aa));
          // Tour secondaire supplémentaire si densité > 0.85
          if (dens > 0.85) {
            backArch = max(backArch, evalStaticTower(qBack, -0.215, castleFoundationY, 0.064, 0.25, 1.0, 4.0, uRuinDecay * 1.2, 6.4, aa));
          }

          if (backArch.x > 0.004) {
            // Perspective atmosphérique : la citadelle intérieure est légèrement plus claire/brumeuse
            vec3 backStone = mix(baseCastle, mistCol, 0.24 + uMistDensity * 0.12);
            // Texture de pierre subtile + arête éclairée au clair de lune
            if (uQualityLevel >= 1) {
              float ashlar = snoise(vec2(qBack.x * 38.0, floor(qBack.y * 90.0))) * 0.08;
              backStone *= (0.96 + ashlar);
            }
            backStone += mistCol * backArch.y * 0.32;

            // Fenêtres rectangulaires sur le donjon arrière
            if (uQualityLevel >= 1) {
              vec2 winBack = evalCastleWindows(qBack, castleFoundationY + 0.05, castleFoundationY + 0.32, t, 11.2, aa);
              if (winBack.x > 0.05) {
                backStone = mix(backStone, baseCastle * 0.45, winBack.x * 0.75);
              }
              if (winBack.y > 0.01) {
                vec3 warm = mix(baseTorch, vec3(1.0, 0.92, 0.62), clamp(winBack.y * 0.45, 0.0, 0.65));
                backStone += warm * winBack.y * uTorchGlow * 1.15;
              }
            }

            finalCol = mix(finalCol, backStone, backArch.x);
            finalAlpha = max(finalAlpha, backArch.x);
          }

          // =========================================================================
          // 3. Plan Avant : Promontoire rocheux + Remparts & Tours d'avant-plan (nets et sombres)
          // =========================================================================
          vec2 qFront = qBase + shiftFront;
          float outerBaseY = 0.18;

          vec2 frontArch = vec2(0.0);
          // Tour d'angle gauche d'avant-plan
          frontArch = max(frontArch, evalStaticTower(qFront, -0.175, outerBaseY, 0.095, 0.24 - asym * 0.5, 0.0, 5.0, uRuinDecay * 1.05, 8.2, aa));
          // Tour d'angle droite / bastion d'avant-plan
          frontArch = max(frontArch, evalStaticTower(qFront, 0.225, outerBaseY, 0.092, 0.22 + asym * 0.4, 1.0, 5.0, uRuinDecay * 0.85, 9.7, aa));
          // Châtelet / porte fortifiée centrale basse
          frontArch = max(frontArch, evalStaticTower(qFront, 0.035, outerBaseY, 0.115, 0.175, 0.0, 6.0, uRuinDecay * 0.75, 10.5, aa));
          // Courtine avant continue avec créneaux horizontaux francs
          frontArch = max(frontArch, evalCurtainWall(qFront, -0.27, 0.31, outerBaseY, 0.125, 0.020, uRuinDecay * 1.0, 12.1, aa));
          // Pan de ruine / contrefort avancé à droite
          if (dens > 0.75) {
            frontArch = max(frontArch, evalCurtainWall(qFront, 0.28, 0.42, outerBaseY - 0.03, 0.105, 0.022, min(1.0, uRuinDecay * 1.45 + 0.18), 14.8, aa));
          }

          // Promontoire rocheux escarpé (FBM géologique irrégulier sans dents de scie répétitives)
          float plateauProfile = smoothstep(0.62, 0.24, abs(qFront.x));
          float crag1 = snoise(vec2(qFront.x * 1.65 + 1.8, 3.1)) * 0.055;
          float crag2 = snoise(vec2(qFront.x * 4.3 + 4.2, 7.5)) * 0.022 + snoise(vec2(qFront.x * 9.5 + 1.1, 2.3)) * 0.008;
          float cliffY = 0.11 + plateauProfile * 0.115 + crag1 * (0.45 + 0.55 * plateauProfile) + crag2;
          // Lisse le plateau sous la base des remparts pour asseoir solidement le château
          cliffY = mix(cliffY, max(cliffY, outerBaseY + 0.015), smoothstep(0.36, 0.22, abs(qFront.x)));
          float rockMask = 1.0 - smoothstep(cliffY - aa, cliffY + aa, qFront.y);

          if (frontArch.x > 0.004) {
            vec3 frontStone = baseCastle;
            if (uQualityLevel >= 1) {
              // Blocs de maçonnerie horizontaux subtils (assises de pierre)
              float row = floor(qFront.y * 85.0);
              float colB = floor(qFront.x * 42.0 + mod(row, 2.0) * 0.5);
              float blockVar = hash12(vec2(colB, row)) * 0.14 - 0.07;
              frontStone *= (1.0 + blockVar);
            }
            // Légère lumière rasante sur les arêtes exposées
            frontStone += mistCol * frontArch.y * 0.26;

            // Fenêtres rectangulaires sur les remparts et tours d'avant-plan
            vec2 winFront = evalCastleWindows(qFront, outerBaseY + 0.025, outerBaseY + 0.23, t, 27.4, aa);
            if (winFront.x > 0.05) {
              frontStone = mix(frontStone, baseCastle * 0.35, winFront.x * 0.8);
            }
            if (winFront.y > 0.01) {
              vec3 warm = mix(baseTorch, vec3(1.0, 0.90, 0.55), clamp(winFront.y * 0.48, 0.0, 0.70));
              frontStone += warm * winFront.y * uTorchGlow * 1.38;
            }

            finalCol = mix(finalCol, frontStone, frontArch.x);
            finalAlpha = max(finalAlpha, frontArch.x);
          }

          // Falaise rocheuse (devant la base des murs pour ancrer la forteresse dans le roc)
          if (rockMask > 0.004) {
            vec3 rockSurface = baseRock;
            if (uQualityLevel >= 1) {
              // Facettes rocheuses obliques et arêtes escarpées
              float facet = snoise(vec2(qFront.x * 8.5 + qFront.y * 4.0, qFront.y * 12.0));
              float strata = snoise(vec2(qFront.x * 22.0, qFront.y * 34.0)) * 0.10;
              rockSurface = mix(baseRock * 0.72, baseRock * 1.22, smoothstep(-0.3, 0.5, facet)) + strata * 0.15;
            }
            // Assombrissement vers le bas du gouffre
            rockSurface *= mix(0.62, 1.0, smoothstep(0.0, cliffY, qFront.y));
            finalCol = mix(finalCol, rockSurface, rockMask);
            finalAlpha = max(finalAlpha, rockMask);
          }

          // =========================================================================
          // 4. Brume vaporeuse dérivant DEVANT la falaise et les remparts
          // =========================================================================
          if (uMistDensity > 0.01) {
            float drift = t * max(0.04, uSpeed) * 0.16;
            float mistBandLow = smoothstep(0.38, 0.02, uv.y);
            float mistBandMid = exp(-pow((uv.y - 0.24) / 0.11, 2.0));

            float fogVal = 0.5;
            if (uQualityLevel >= 2) {
              vec2 mP1 = vec2(qFront.x * 2.1 - drift, uv.y * 3.8);
              vec2 mP2 = vec2(qFront.x * 4.4 - drift * 1.7 + 5.2, uv.y * 6.5 - 1.3);
              float f1 = snoise(mP1) * 0.5 + 0.5;
              float f2 = snoise(mP2 + vec2(f1 * 0.8, 0.0)) * 0.5 + 0.5;
              fogVal = f1 * 0.62 + f2 * 0.38;
            } else if (uQualityLevel == 1) {
              fogVal = snoise(vec2(qFront.x * 2.3 - drift, uv.y * 4.0)) * 0.5 + 0.5;
            }

            float frontMist = clamp((mistBandLow * 0.52 + mistBandMid * 0.58) * (0.38 + 0.85 * fogVal) * uMistDensity * 0.72, 0.0, 0.78);
            if (frontMist > 0.004) {
              // La brume passe devant les pierres et s'estompe doucement dans le ciel
              vec3 mistTint = mix(mistCol * 1.12, mistCol * 1.38 + vec3(0.08, 0.09, 0.12), mistBandMid * fogVal);
              finalCol = mix(finalCol, mistTint, frontMist);
              finalAlpha = max(finalAlpha, frontMist * 0.82);
            }
          }

          if (finalAlpha <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(finalCol, clamp(finalAlpha * uIntensity, 0.0, 1.0));
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

  public updateProps(newProps: Partial<ParallaxCastleProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.castleColor !== undefined) {
      this.castleColorVec.set(newProps.castleColor)
      this.material.uniforms.uCastleColor.value = this.castleColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.torchColor !== undefined) {
      this.torchColorVec.set(newProps.torchColor)
      this.material.uniforms.uTorchColor.value = this.torchColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.rockColor !== undefined) {
      this.rockColorVec.set(newProps.rockColor)
      this.material.uniforms.uRockColor.value = this.rockColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.mistColor !== undefined) {
      this.mistColorVec.set(newProps.mistColor)
      this.material.uniforms.uMistColor.value = this.mistColorVec
      this.material.uniforms.uUseCustomMistColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.ruinDecay !== undefined)
      this.material.uniforms.uRuinDecay.value = newProps.ruinDecay
    if (newProps.torchGlow !== undefined)
      this.material.uniforms.uTorchGlow.value = newProps.torchGlow
    if (newProps.mistDensity !== undefined)
      this.material.uniforms.uMistDensity.value = newProps.mistDensity
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

export const ParallaxCastleDefinition: IBrickDefinition<ParallaxCastleProps> = {
  type: 'parallax_castle',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxCastleInstance(id, props, context),
}

BrickRegistry.register(ParallaxCastleDefinition)
