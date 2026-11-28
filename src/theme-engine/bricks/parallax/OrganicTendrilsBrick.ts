/**
 * src/theme-engine/bricks/parallax/OrganicTendrilsBrick.ts
 *
 * Brique de silhouettes organiques & vrilles animées (Couche 2 : Intermediate).
 * Vrilles ramifiées procédurales avec :
 * - Ramification récursive (tige principale → fourches secondaires → vrilles tertiaires) à épaisseur décroissante
 * - Mouvement de fouet organique lent avec retard de phase (mouvement secondaire racine → pointe)
 * - Veines bioluminescentes pulsant de façon irrégulière le long des ramifications
 * - Brume sombre rampante au pied des racines ou le long de la brèche dimensionnelle
 * - Modes 'edges' (bordures, centre dégagé pour l'UI) et 'vertical_rift' (brèche verticale)
 * - Reflets spéculaires visqueux / ferrofluide sur volume tubulaire + réaction au curseur souris
 * - Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW)
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type TendrilAnchorMode = 'edges' | 'vertical_rift'

export interface OrganicTendrilsProps {
  /** Couleur de la matière sombre des vrilles (défaut #09090b ou uPaletteSecondary). */
  primaryColor?: string
  /** Couleur bioluminescente des veines et du cœur de faille (défaut #ef4444 ou uPaletteAccent). */
  veinColor?: string
  /** Couleur des reflets spéculaires visqueux / ferrofluide (défaut #f8fafc). */
  specularColor?: string
  /** Mode d'ancrage spatial des vrilles (défaut 'edges'). */
  anchorMode?: TendrilAnchorMode
  /** Emprise spatiale vers l'intérieur, bridée en mode edges (0.15 à 0.45, défaut 0.30). */
  reach?: number
  /** Intensité lumineuse des veines bioluminescentes (0.0 à 1.0, défaut 0.55). */
  veinGlow?: number
  /** Brillance spéculaire humide / ferrofluide (0.0 à 1.0, défaut 0.55). */
  specularStrength?: number
  /** Cadence de battement organique des veines (0.0 à 1.5, défaut 0.50). */
  pulseSpeed?: number
  /** Densité et nombre de vrilles principales (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Vitesse d'ondulation et de mouvement de fouet (0.0 à 1.5, défaut 0.35). */
  speed?: number
  /** Profondeur et sensibilité à la souris/scroll (0.0 à 1.0, défaut 0.40). */
  depth?: number
  /** Contraste et opacité globale (0.2 à 2.0, défaut 1.0). */
  intensity?: number
  /** Variabilité organique des courbures et ramifications (0.0 à 1.0, défaut 0.50). */
  randomness?: number
  /** Densité de la brume sombre rampante au pied des vrilles (0.0 à 1.5, défaut 0.55). */
  baseMist?: number
  /** Richesse et envergure des ramifications secondaires/tertiaires (0.3 à 1.8, défaut 1.0). */
  branching?: number
}

const ANCHOR_MODE_MAP: Record<TendrilAnchorMode, number> = {
  edges: 0,
  vertical_rift: 1,
}

export class OrganicTendrilsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'organic_tendrils'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: OrganicTendrilsProps
  private primaryColorVec: THREE.Color
  private veinColorVec: THREE.Color
  private specularColorVec: THREE.Color

  constructor(id: string, props: OrganicTendrilsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#09090b')
    this.veinColorVec = new THREE.Color(props.veinColor ?? '#ef4444')
    this.specularColorVec = new THREE.Color(props.specularColor ?? '#f8fafc')

    const anchorIdx = ANCHOR_MODE_MAP[props.anchorMode ?? 'edges'] ?? 0
    const reach = props.reach ?? 0.3
    const veinGlow = props.veinGlow ?? 0.55
    const specularStrength = props.specularStrength ?? 0.55
    const pulseSpeed = props.pulseSpeed ?? 0.5
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5
    const baseMist = props.baseMist ?? 0.55
    const branching = props.branching ?? 1.0

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
        uPrimaryColor: { value: this.primaryColorVec },
        uVeinColor: { value: this.veinColorVec },
        uSpecularColor: { value: this.specularColorVec },
        uUseCustomColors: {
          value: Boolean(props.primaryColor || props.veinColor || props.specularColor),
        },
        uAnchorMode: { value: anchorIdx },
        uReach: { value: reach },
        uVeinGlow: { value: veinGlow },
        uSpecularStrength: { value: specularStrength },
        uPulseSpeed: { value: pulseSpeed },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uBaseMist: { value: baseMist },
        uBranching: { value: branching },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.988, 1.0);
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
        uniform vec3 uPrimaryColor;
        uniform vec3 uVeinColor;
        uniform vec3 uSpecularColor;
        uniform bool uUseCustomColors;
        uniform int uAnchorMode;
        uniform float uReach;
        uniform float uVeinGlow;
        uniform float uSpecularStrength;
        uniform float uPulseSpeed;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uBaseMist;
        uniform float uBranching;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Pulsation organique irrégulière qui se propage de la racine (s=0) vers la pointe (s=1)
        float irregularVeinPulse(float t, float s, float seed) {
          float travel = t * 1.45 - s * 3.6 + seed * 19.3;
          float n1 = snoise(vec2(travel * 0.42, seed * 3.7));
          float n2 = snoise(vec2(travel * 1.15 + 7.1, seed * 8.3 + t * 0.13));
          // Impulsions sporadiques non-périodiques (sursauts organiques)
          float surge = smoothstep(0.18, 0.88, n1 * 0.65 + n2 * 0.35 + 0.12);
          float doubleBeat = pow(max(0.0, sin(travel * 1.37 + n1 * 2.4)), 5.0) * 0.65;
          float ambientGlow = 0.14 + 0.12 * (0.5 + 0.5 * snoise(vec2(t * 0.25 + seed * 5.0, s * 2.0)));
          return clamp(ambientGlow + surge * 0.72 + doubleBeat * 0.55, 0.0, 1.35);
        }

        // Déplacement latéral en fouet lent avec retard de phase (mouvement secondaire)
        float whipOffset(float s, float t, float seed, float amp) {
          // Racine fixe (s=0), amplitude croissante non-linéaire vers la pointe
          float flex = pow(clamp(s, 0.0, 1.0), 1.45);
          // Retard de phase progressif le long de la tige : la base mène, la pointe suit
          float phase1 = t * (0.95 + fract(seed * 7.13) * 0.45) - s * 3.10 + seed * 12.7;
          float phase2 = t * (1.72 + fract(seed * 3.91) * 0.60) - s * 5.40 + seed * 23.1;
          float w = sin(phase1) * 0.68 + sin(phase2) * 0.32;
          // Courbure organique sinueuse en S propre à chaque vrille (évite les tiges droites rigides)
          float staticCurve = sin(s * 4.2 + seed * 11.0) * 0.72 + cos(s * 7.1 + seed * 5.3) * 0.28;
          return (staticCurve + w * 0.62) * flex * amp;
        }

        // Résultat d'évaluation d'une branche :
        // .x = couverture SDF [0..1]
        // .y = coordonnées transversales signées [-1..1] (pour normale tubulaire 3D)
        // .z = intensité veine centrale [0..1]
        // .w = position normalisée s le long de la vrille [0..1]
        vec4 evalBranchCurve(
          vec2 local,
          float len,
          float rootRadius,
          float bendDir,
          float curveAmp,
          float t,
          float seed,
          float aa
        ) {
          if (local.y < -rootRadius * 1.4 || local.y > len + rootRadius * 1.2) {
            return vec4(0.0);
          }
          float s = clamp(local.y / max(0.001, len), 0.0, 1.0);
          // Courbure directionnelle en S de la fourche + mouvement de fouet avec retard
          float cx = bendDir * pow(s, 1.18) * len * 0.62 + whipOffset(s, t, seed, curveAmp);
          float dx = local.x - cx;

          // Épaisseur organique décroissante de la racine jusqu'à une pointe fine, avec renflement nodal subtil
          float taper = pow(max(0.0, 1.0 - s), 1.08);
          float nodeSwell = 1.0 + 0.14 * sin(s * 14.0 + seed * 9.0) * (1.0 - s);
          float radius = max(0.0007, rootRadius * taper * nodeSwell);

          // Fermeture douce aux extrémités (cap racine + pointe effilée)
          float overY = max(0.0, -local.y) + max(0.0, local.y - len);
          float dist = length(vec2(dx, overY));

          // Légère rugosité charnue sur le bord (MEDIUM / HIGH)
          float fleshBump = 0.0;
          if (uQualityLevel >= 1) {
            fleshBump = snoise(vec2(s * 11.0 + seed * 5.0, dx * 35.0)) * radius * 0.15;
          }
          float effRadius = max(0.0004, radius + fleshBump);
          // Atténuation douce sous-pixel pour éviter tout pointillé sur les pointes tertiaires ultra-fines
          float subpixelFade = smoothstep(aa * 0.35, aa * 1.35, effRadius);
          float cov = (1.0 - smoothstep(effRadius - aa, effRadius + aa, dist)) * subpixelFade;
          if (cov <= 0.002) return vec4(0.0);

          float normX = clamp(dx / max(0.001, effRadius), -1.0, 1.0);
          // Veine lumineuse au cœur de la tige, bien lisible sur la tige mère et les fourches
          float veinCore = exp(-pow(abs(normX) / 0.38, 2.0)) * smoothstep(0.95, 0.10, s) * cov;
          return vec4(cov, normX, veinCore, s);
        }

        // Fusionne deux résultats de branches en conservant le tube dominant
        vec4 mergeBranch(vec4 a, vec4 b) {
          if (b.x <= 0.001) return a;
          if (a.x <= 0.001) return b;
          // Lissage doux à la jonction des fourches
          float w = smoothstep(0.0, 1.0, b.x / max(0.001, a.x + b.x));
          float cov = max(a.x, b.x);
          float nx = mix(a.y, b.y, w);
          float vein = max(a.z, b.z * 0.92);
          float s = mix(a.w, b.w, w);
          return vec4(cov, nx, vein, s);
        }

        // Évalue un arbre de vrilles (tige principale + fourches secondaires + tertiaires)
        // dans un repère local où u = axe le long de la bordure, v = profondeur vers l'intérieur (>= 0)
        vec4 evalTendrilEdgeSystem(
          float uCoord,
          float vInward,
          float maxReach,
          float t,
          float layerSeed,
          float scaleMult,
          float aa
        ) {
          float spacing = (0.175 / clamp(uDensity, 0.4, 2.2)) * scaleMult;
          float cellIdx = floor(uCoord / spacing);
          vec4 acc = vec4(0.0);

          // Vérification cellule courante + voisines (-1, 0, +1) pour continuité totale
          for (int k = -1; k <= 1; k++) {
            float idx = cellIdx + float(k);
            float h1 = hash12(vec2(idx, layerSeed * 13.7 + 1.9));
            float h2 = hash12(vec2(idx + 31.4, layerSeed * 7.3 + 5.1));
            float h3 = hash12(vec2(idx + 73.1, layerSeed * 19.1 + 2.7));

            // Probabilité d'existence irrégulière pour éviter une haie uniforme
            if (h1 < 0.16) continue;

            float rootU = (idx + 0.5 + (h2 - 0.5) * 0.62) * spacing;
            float stemLen = maxReach * (0.50 + h1 * 0.72) * (0.82 + 0.36 * uRandomness);
            float rootRad = (0.0135 + h3 * 0.0125) * scaleMult;
            float leanDir = (h2 - 0.5) * (0.95 + uRandomness * 0.95);
            float whipAmp = stemLen * (0.20 + uRandomness * 0.18);

            vec2 localMain = vec2(uCoord - rootU, vInward);
            vec4 mainRes = evalBranchCurve(localMain, stemLen, rootRad, leanDir, whipAmp, t, h1 * 17.3 + layerSeed, aa);
            acc = mergeBranch(acc, mainRes);

            // Ramifications secondaires (2 fourches à hauteurs et côtés variés, épaisseur 0.52x)
            float branchScale = clamp(uBranching, 0.3, 1.8);
            int secCount = (uQualityLevel == 0) ? 1 : 2;
            for (int b = 0; b < 2; b++) {
              if (b >= secCount) break;
              float fb = float(b);
              float sFork = (b == 0) ? (0.26 + h2 * 0.20) : (0.52 + h3 * 0.22);
              float forkY = sFork * stemLen;
              // Position exacte du point de jonction sur la tige mère (hérite du fouet)
              float forkX = leanDir * pow(sFork, 1.18) * stemLen * 0.62
                          + whipOffset(sFork, t, h1 * 17.3 + layerSeed, whipAmp);

              float side = ((b == 0 ? (h3 > 0.5 ? 1.0 : -1.0) : (h3 > 0.5 ? -1.0 : 1.0)));
              float angle = side * (0.46 + fract(h2 * 5.7 + fb * 0.37) * 0.42);
              float ca = cos(angle);
              float sa = sin(angle);

              vec2 dFork = localMain - vec2(forkX, forkY);
              // Rotation vers l'axe de la branche secondaire
              vec2 localSec = vec2(dFork.x * ca - dFork.y * sa, dFork.x * sa + dFork.y * ca);
              float secLen = stemLen * (0.34 + fract(h1 * 3.1 + fb * 0.51) * 0.24) * branchScale;
              float secRad = rootRad * pow(1.0 - sFork, 1.1) * 0.56;
              float secSeed = h2 * 29.1 + fb * 11.7 + layerSeed;

              vec4 secRes = evalBranchCurve(
                localSec,
                secLen,
                secRad,
                side * 0.38,
                secLen * 0.22,
                t * 1.18 - sFork * 0.65,
                secSeed,
                aa
              );
              // Marque le s effectif plus proche de la pointe pour la propagation de veine
              secRes.w = clamp(sFork + secRes.w * (1.0 - sFork), 0.0, 1.0);
              secRes.z *= 0.85;
              acc = mergeBranch(acc, secRes);

              // Ramification tertiaire fine (HIGH uniquement, épaisseur 0.34x de la tige)
              if (uQualityLevel >= 2 && branchScale > 0.45) {
                float sTert = 0.44 + fract(h3 * 4.3 + fb * 0.29) * 0.24;
                float tForkY = sTert * secLen;
                float tForkX = (side * 0.38) * pow(sTert, 1.35) * secLen * 0.52
                             + whipOffset(sTert, t * 1.18 - sFork * 0.65, secSeed, secLen * 0.22);
                float tSide = -side;
                float tAng = tSide * (0.52 + h1 * 0.32);
                float tca = cos(tAng);
                float tsa = sin(tAng);
                vec2 dTert = localSec - vec2(tForkX, tForkY);
                vec2 localTert = vec2(dTert.x * tca - dTert.y * tsa, dTert.x * tsa + dTert.y * tca);
                float tertLen = secLen * 0.48 * min(1.25, branchScale);
                float tertRad = secRad * 0.52;

                vec4 tertRes = evalBranchCurve(
                  localTert,
                  tertLen,
                  tertRad,
                  tSide * 0.32,
                  tertLen * 0.26,
                  t * 1.35 - (sFork + sTert * 0.4) * 0.85,
                  secSeed + 41.3,
                  aa
                );
                tertRes.w = clamp(sFork + sTert * 0.4 + tertRes.w * 0.4, 0.0, 1.0);
                tertRes.z *= 0.62;
                acc = mergeBranch(acc, tertRes);
              }
            }
          }

          return acc;
        }

        // Évalue les 4 bordures (edges) ou les 2 lèvres de la faille (vertical_rift)
        vec4 evalFullScene(vec2 p, vec2 pEdgeUv, float aspect, float reachClamped, float t, float layerSeed, float scaleMult, float aa) {
          vec4 acc = vec4(0.0);
          if (uAnchorMode == 0) {
            float halfW = 0.5 * aspect;
            float halfH = 0.5;
            // Bord inférieur (ancrage principal, portée légèrement supérieure)
            float vBot = pEdgeUv.y + halfH;
            if (vBot < reachClamped * 1.45) {
              acc = mergeBranch(acc, evalTendrilEdgeSystem(pEdgeUv.x, vBot, reachClamped * 1.12, t, layerSeed + 1.0, scaleMult, aa));
            }
            // Bord gauche
            float vLeft = pEdgeUv.x + halfW;
            if (vLeft < reachClamped * 1.45) {
              acc = mergeBranch(acc, evalTendrilEdgeSystem(pEdgeUv.y + 1.7, vLeft, reachClamped * 1.05, t * 0.94, layerSeed + 5.0, scaleMult, aa));
            }
            // Bord droit
            float vRight = halfW - pEdgeUv.x;
            if (vRight < reachClamped * 1.45) {
              acc = mergeBranch(acc, evalTendrilEdgeSystem(-pEdgeUv.y + 3.1, vRight, reachClamped * 1.05, t * 1.03, layerSeed + 9.0, scaleMult, aa));
            }
            // Bord supérieur (légèrement plus discret pour aérer le haut de l'UI)
            float vTop = halfH - pEdgeUv.y;
            if (vTop < reachClamped * 1.25) {
              acc = mergeBranch(acc, evalTendrilEdgeSystem(-pEdgeUv.x + 2.3, vTop, reachClamped * 0.85, t * 0.89, layerSeed + 13.0, scaleMult, aa));
            }
          } else {
            // Mode brèche verticale : vrilles poussant de part et d'autre de la faille
            float riftMeander = snoise(vec2(p.y * 2.4, t * 0.22)) * 0.075 * (0.5 + uRandomness);
            float dx = p.x - riftMeander;
            float vEnvelope = smoothstep(0.49, 0.14, abs(p.y));
            float lateralReach = (0.14 + reachClamped * 0.68) * (0.38 + 0.62 * vEnvelope);
            if (abs(dx) < lateralReach * 1.45) {
              if (dx >= -0.025) {
                acc = mergeBranch(acc, evalTendrilEdgeSystem(p.y + 0.5, max(0.0, dx), lateralReach, t, layerSeed + 21.0, scaleMult, aa));
              }
              if (dx <= 0.025) {
                acc = mergeBranch(acc, evalTendrilEdgeSystem(-p.y + 2.7, max(0.0, -dx), lateralReach, t * 0.96, layerSeed + 37.0, scaleMult, aa));
              }
            }
          }
          return acc;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float aa = 1.6 / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * max(0.02, uSpeed);
          vec2 mousePos = uMouse * 0.5 * vec2(aspect, 1.0);
          vec2 parallaxShift = uMouse * (uDepth * 0.075) + vec2(0.0, uScroll * uDepth * 0.045);

          // Réaction organique de recul / enroulement au passage de la souris
          vec2 pReact = p - parallaxShift;
          vec2 toMouse = pReact - mousePos;
          float dMouse = length(toMouse);
          if (dMouse < 0.36 && uDepth > 0.01) {
            vec2 pushDir = toMouse / max(0.001, dMouse);
            float pushStr = exp(-dMouse * 8.0) * 0.055 * uDepth;
            pReact += pushDir * pushStr;
          }

          float reachClamped = clamp(uReach, 0.15, 0.45);
          float halfW = 0.5 * aspect;
          float halfH = 0.5;

          // Distance au bord / à la faille pour rejet rapide & brume sombre au pied
          float distToAnchor = 1.0;
          float riftCoreGlow = 0.0;
          float riftEdgeShadow = 0.0;
          if (uAnchorMode == 0) {
            float dxBorder = halfW - abs(p.x);
            float dyBorder = halfH - abs(p.y);
            distToAnchor = min(dxBorder, dyBorder);
          } else {
            float riftMeander = snoise(vec2(pReact.y * 2.4, t * 0.22)) * 0.075 * (0.5 + uRandomness);
            float dx = abs(pReact.x - riftMeander);
            float vEnvelope = smoothstep(0.49, 0.12, abs(pReact.y));
            float jagged = snoise(vec2(pReact.y * 14.0 - t * 0.3, 3.1)) * 0.015;
            float riftHalfW = (0.018 + reachClamped * 0.09) * vEnvelope + jagged;
            riftCoreGlow = exp(-max(0.0, dx - max(0.0, riftHalfW * 0.32)) * 32.0) * vEnvelope;
            riftEdgeShadow = exp(-dx * 10.5) * vEnvelope;
            distToAnchor = dx;
          }

          // Rejet rapide hors portée (garde le centre UI parfaitement dégagé et rapide)
          float maxZone = (uAnchorMode == 0) ? (reachClamped * 1.48) : (0.18 + reachClamped * 0.95);
          if (distToAnchor > maxZone && riftCoreGlow <= 0.004) {
            discard;
          }

          vec3 colMatter = uUseCustomColors ? uPrimaryColor : (uPaletteSecondary * 0.32);
          vec3 colVein = uUseCustomColors ? uVeinColor : uPaletteAccent;
          vec3 colSpec = uUseCustomColors ? uSpecularColor : vec3(0.97, 0.98, 1.0);

          // 1. Brume sombre rampante au pied des vrilles (ou autour de la faille)
          float mistAlpha = 0.0;
          if (uBaseMist > 0.01) {
            float mistBand = (uAnchorMode == 0)
              ? (1.0 - smoothstep(0.0, reachClamped * 0.95, distToAnchor))
              : riftEdgeShadow;
            float mistNoise = 0.65;
            if (uQualityLevel >= 1) {
              vec2 mUv = p * 3.4 + vec2(t * 0.18, -t * 0.12);
              float m1 = snoise(mUv) * 0.5 + 0.5;
              float m2 = (uQualityLevel >= 2) ? (snoise(mUv * 2.2 - vec2(t * 0.25, 3.1)) * 0.5 + 0.5) : 0.5;
              mistNoise = mix(m1, m2, 0.38);
            }
            mistAlpha = clamp(pow(mistBand, 1.35) * (0.45 + 0.75 * mistNoise) * uBaseMist * 0.72, 0.0, 0.85);
          }

          // Couleur de fond de la brume sombre (légèrement teintée par la matière sombre)
          vec3 darkMistCol = colMatter * 0.55;
          vec3 finalCol = darkMistCol;
          float finalAlpha = mistAlpha;

          // 2. Plan arrière de vrilles floutées en parallaxe (HIGH uniquement)
          if (uQualityLevel >= 2) {
            vec2 pBack = p - parallaxShift * 0.45;
            vec4 backT = evalFullScene(pBack, pBack, aspect, reachClamped * 0.88, t * 0.72, 47.0, 1.18, aa * 3.2);
            if (backT.x > 0.004) {
              float backPulse = irregularVeinPulse(uTime * max(0.05, uPulseSpeed), backT.w, 13.7);
              vec3 backCol = colMatter * 0.72 + colVein * backT.z * uVeinGlow * backPulse * 0.42;
              // Fondu dans la brume sombre pour la profondeur
              backCol = mix(backCol, darkMistCol, 0.32);
              float ba = backT.x * 0.72;
              finalCol = mix(finalCol, backCol, ba);
              finalAlpha = max(finalAlpha, ba);
            }
          }

          // 3. Plan principal de vrilles nettes ramifiées
          vec4 fgT = evalFullScene(pReact, pReact, aspect, reachClamped, t, 3.0, 1.0, aa);
          if (fgT.x > 0.004) {
            float cov = fgT.x;
            float normX = fgT.y;
            float vein = fgT.z;
            float sAlong = fgT.w;

            // Normale cylindrique 3D analytique (très rapide, aucun recalcul du champ)
            float normZ = sqrt(max(0.05, 1.0 - normX * normX));
            float bump = (uQualityLevel >= 1) ? snoise(pReact * 28.0 + vec2(t * 0.2)) * 0.14 : 0.0;
            vec3 norm = normalize(vec3(normX + bump, bump * 0.7, normZ));

            // Éclairage cohérent (source principale influencée doucement par la souris)
            vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.9 + 0.38, uMouse.y * uDepth * 0.9 + 0.58, 0.82));
            float diff = 0.45 + 0.55 * max(0.0, dot(norm, lightDir));
            // Assombrissement subtil vers la racine (occlusion ambiante dans la brume)
            float rootAO = mix(0.68, 1.0, smoothstep(0.0, 0.28, sAlong));
            vec3 tendrilCol = colMatter * diff * rootAO;

            // Reflet spéculaire humide / ferrofluide + Fresnel de bord (MEDIUM & HIGH)
            if (uQualityLevel >= 1 && uSpecularStrength > 0.01) {
              vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
              float spec = pow(max(0.0, dot(norm, halfVec)), 28.0) * uSpecularStrength * 1.45;
              float rim = pow(1.0 - max(norm.z, 0.0), 2.4) * uSpecularStrength * 0.55;
              tendrilCol += colSpec * (spec + rim);
            }

            // Veines bioluminescentes à pulsation irrégulière se propageant de la racine vers la pointe
            if (uVeinGlow > 0.01 && vein > 0.005) {
              float seedLocal = floor((pReact.x + pReact.y) * 4.5);
              float pulse = irregularVeinPulse(uTime * max(0.05, uPulseSpeed), sAlong, seedLocal * 0.37 + 1.2);
              vec3 hotVein = mix(colVein * 1.25, vec3(1.0, 0.88, 0.72), clamp(vein * pulse * 0.55, 0.0, 0.72));
              tendrilCol += hotVein * vein * uVeinGlow * (0.35 + pulse * 1.45) * 1.55;
            }

            finalCol = mix(finalCol, tendrilCol, cov);
            finalAlpha = max(finalAlpha, cov);
          }

          // 4. Cœur lumineux de la brèche dimensionnelle (mode vertical_rift)
          if (uAnchorMode == 1 && riftCoreGlow > 0.008) {
            float riftPulse = irregularVeinPulse(uTime * max(0.05, uPulseSpeed), abs(pReact.y) * 2.0, 9.4);
            vec3 riftHot = mix(colVein, vec3(1.0, 0.90, 0.76), clamp(riftCoreGlow * 0.75, 0.0, 0.88));
            float coreMix = clamp(riftCoreGlow * (1.0 - fgT.x * 0.58), 0.0, 1.0);
            finalCol = mix(finalCol, riftHot * (0.78 + 0.45 * riftPulse), coreMix);
            finalAlpha = max(finalAlpha, riftCoreGlow * 0.94);
          }

          float outAlpha = clamp(finalAlpha * uIntensity, 0.0, 0.96);
          if (outAlpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalCol, outAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -22
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<OrganicTendrilsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.veinColor !== undefined) {
      this.veinColorVec.set(newProps.veinColor)
      this.material.uniforms.uVeinColor.value = this.veinColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.specularColor !== undefined) {
      this.specularColorVec.set(newProps.specularColor)
      this.material.uniforms.uSpecularColor.value = this.specularColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.anchorMode !== undefined) {
      this.material.uniforms.uAnchorMode.value = ANCHOR_MODE_MAP[newProps.anchorMode] ?? 0
    }
    if (newProps.reach !== undefined) this.material.uniforms.uReach.value = newProps.reach
    if (newProps.veinGlow !== undefined) this.material.uniforms.uVeinGlow.value = newProps.veinGlow
    if (newProps.specularStrength !== undefined)
      this.material.uniforms.uSpecularStrength.value = newProps.specularStrength
    if (newProps.pulseSpeed !== undefined)
      this.material.uniforms.uPulseSpeed.value = newProps.pulseSpeed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.baseMist !== undefined) this.material.uniforms.uBaseMist.value = newProps.baseMist
    if (newProps.branching !== undefined)
      this.material.uniforms.uBranching.value = newProps.branching
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

export const OrganicTendrilsDefinition: IBrickDefinition<OrganicTendrilsProps> = {
  type: 'organic_tendrils',
  category: 'intermediate',
  create: (id, props, context) => new OrganicTendrilsInstance(id, props, context),
}

BrickRegistry.register(OrganicTendrilsDefinition)
