/**
 * src/theme-engine/bricks/special/RunicCircleBrick.ts
 *
 * Brique Spéciale : Anneaux Géométriques & Rosace Lumineuse (Couche : Spéciaux).
 * Shader SDF en coordonnées polaires générant des anneaux concentriques contre-rotatifs
 * à vitesses incommensurables, polygones sacrés inscrits, bandes de symboles géométriques
 * 100 % procéduraux corrigés en ratio d'arc (zéro symbole protégé), astrolabe armillaire
 * ou boussole antique, avec tracés fins et précis, lueur pulsée organique,
 * particules orbitales scintillantes et apparition progressive au montage.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type RunicPatternStyle =
  | 'arcane'
  | 'mandala'
  | 'polyhedron'
  | 'astrolabe'
  | 'compass'
  | 'cyber_glyph'

export interface RunicCircleProps {
  /** Couleur dominante des anneaux et tracés lumineux (défaut #fbbf24 ou uPaletteAccent). */
  primaryColor?: string
  /** Couleur secondaire des cœurs, nœuds et impulsions (défaut #f97316 ou uPalettePrimary). */
  secondaryColor?: string
  /** Grammaire géométrique de la rosace (défaut 'arcane'). */
  patternStyle?: RunicPatternStyle
  /** Nombre d'anneaux concentriques contre-rotatifs (2 à 5, défaut 4). */
  ringCount?: number
  /** Ordre de symétrie polygonale / radiale (4 à 16, défaut 8). */
  symmetry?: number
  /** Inclinaison perspective pseudo-3D (0.0 = face, 0.7 = oblique, défaut 0.18). */
  tilt3D?: number
  /** Vitesse de rotation différentielle (0.0 à 1.5, défaut 0.28). */
  rotationSpeed?: number
  /** Fréquence de pulsation lumineuse (0.0 à 2.0, défaut 0.45). */
  pulseSpeed?: number
  /** Amplitude d'oscillation magnétique de l'aiguille en mode compass (0.0 à 1.0, défaut 0.5). */
  needleOscillation?: number
  /** Échelle spatiale globale de la rosace (0.4 à 2.0, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Profondeur et réactivité d'inclinaison à la souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Irrégularité des glyphes procéduraux et déphasages (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Durée de l'apparition progressive en secondes au montage (0.0 à 6.0, défaut 2.4). */
  revealDuration?: number
  /** Nombre de particules orbitales lumineuses autour des anneaux (0 à 28, défaut 16). */
  particleCount?: number
  /** Finesse et précision des tracés géométriques (0.5 à 2.0, défaut 1.0). */
  lineSharpness?: number
}

const PATTERN_STYLE_MAP: Record<RunicPatternStyle, number> = {
  arcane: 0,
  mandala: 1,
  polyhedron: 2,
  astrolabe: 3,
  compass: 4,
  cyber_glyph: 5,
}

export class RunicCircleInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'runic_circle'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: RunicCircleProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private localTime = 0.12

  constructor(id: string, props: RunicCircleProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#fbbf24')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#f97316')

    const styleIdx = PATTERN_STYLE_MAP[props.patternStyle ?? 'arcane'] ?? 0
    const ringCount = Math.min(5, Math.max(2, Math.round(props.ringCount ?? 4)))
    const symmetry = Math.min(16, Math.max(4, Math.round(props.symmetry ?? 8)))
    const tilt3D = props.tilt3D ?? 0.18
    const rotationSpeed = props.rotationSpeed ?? 0.28
    const pulseSpeed = props.pulseSpeed ?? 0.45
    const needleOscillation = props.needleOscillation ?? 0.5
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const revealDuration = props.revealDuration ?? 2.4
    const particleCount = Math.min(28, Math.max(0, Math.round(props.particleCount ?? 16)))
    const lineSharpness = props.lineSharpness ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uLocalTime: { value: this.localTime },
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uPrimaryColor: { value: this.primaryColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColors: { value: Boolean(props.primaryColor || props.secondaryColor) },
        uPatternStyle: { value: styleIdx },
        uRingCount: { value: ringCount },
        uSymmetry: { value: symmetry },
        uTilt3D: { value: tilt3D },
        uRotationSpeed: { value: rotationSpeed },
        uPulseSpeed: { value: pulseSpeed },
        uNeedleOscillation: { value: needleOscillation },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uRevealDuration: { value: revealDuration },
        uParticleCount: { value: particleCount },
        uLineSharpness: { value: lineSharpness },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.996, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uLocalTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColors;
        uniform int uPatternStyle;
        uniform int uRingCount;
        uniform float uSymmetry;
        uniform float uTilt3D;
        uniform float uRotationSpeed;
        uniform float uPulseSpeed;
        uniform float uNeedleOscillation;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uRevealDuration;
        uniform int uParticleCount;
        uniform float uLineSharpness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        mat2 rot2(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        // Distance à un segment [a, b] pour tracés de symboles fins et précis
        float sdSegment(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a, ba = b - a;
          float h = clamp(dot(pa, ba) / max(1e-5, dot(ba, ba)), 0.0, 1.0);
          return length(pa - ba * h);
        }

        // Tracé lumineux fin et précis avec anti-aliasing analytique + double halo optique
        float glowStroke(float d, float width, float glowStrength) {
          float ad = abs(d);
          float sharp = clamp(uLineSharpness, 0.5, 2.0);
          float w = width * 0.60 / sharp;
          float fw = max(0.0005, fwidth(d));
          float core = 1.0 - smoothstep(w, w + fw * 1.25, ad);
          float innerHalo = exp(-ad * (62.0 / max(0.25, glowStrength))) * 0.44;
          float outerHalo = (uQualityLevel >= 1)
            ? exp(-ad * (18.0 / max(0.25, glowStrength))) * 0.16
            : 0.0;
          return max(core, innerHalo + outerHalo);
        }

        // Distance à un polygone régulier inscrit de rayon R et N côtés
        float sdRegularPolygon(vec2 p, float r, float n) {
          float an = PI / n;
          float a = atan(p.y, p.x);
          float sector = mod(a + an, 2.0 * an) - an;
          return length(p) * cos(sector) - r * cos(an);
        }

        // Masque d'apparition progressive le long d'un anneau (arc sweep + pointe lumineuse)
        vec2 arcRevealMask(float angle, float progress) {
          if (progress >= 0.999) return vec2(1.0, 0.0);
          if (progress <= 0.001) return vec2(0.0, 0.0);
          float normA = fract((angle + PI) / TAU);
          float mask = 1.0 - smoothstep(progress - 0.05, progress + 0.01, normA);
          float tip = exp(-abs(normA - progress) * 42.0) * step(0.01, progress);
          return vec2(mask, tip);
        }

        // Bande procédurale de symboles géométriques fins corrigés en ratio d'arc (zéro symbole protégé)
        float proceduralGlyphBand(float r, float a, float bandR, float bandW, float count, float seed) {
          float radialDist = abs(r - bandR);
          if (radialDist > bandW * 0.58) return 0.0;

          float cellCoord = (a + PI) / TAU * count;
          float seg = floor(cellCoord);
          float localA = fract(cellCoord) - 0.5;
          float localR = (r - bandR) / max(0.001, bandW);

          // Correction de ratio pour obtenir des symboles isométriques nets
          float arcW = bandR * TAU / count;
          vec2 gp = vec2(localA * arcW, localR * bandW) / max(0.004, min(arcW, bandW) * 0.42);

          float h1 = hash12(vec2(seg, seed));
          float h2 = hash12(vec2(seg + 17.3, seed * 2.1));
          int motif = int(floor(h1 * 8.0));

          float d = 1.0;
          if (motif == 0) {
            // Tige verticale + traverse supérieure + chevron
            d = min(d, sdSegment(gp, vec2(0.0, -0.75), vec2(0.0, 0.75)));
            d = min(d, sdSegment(gp, vec2(-0.45, 0.55), vec2(0.45, 0.55)));
            d = min(d, sdSegment(gp, vec2(0.0, 0.1), vec2(0.42, -0.35)));
          } else if (motif == 1) {
            // Losange central + axe vertical
            d = min(d, sdSegment(gp, vec2(0.0, -0.72), vec2(0.0, 0.72)));
            d = min(d, sdSegment(gp, vec2(-0.42, 0.0), vec2(0.0, 0.42)));
            d = min(d, sdSegment(gp, vec2(0.0, 0.42), vec2(0.42, 0.0)));
            d = min(d, sdSegment(gp, vec2(0.42, 0.0), vec2(0.0, -0.42)));
            d = min(d, sdSegment(gp, vec2(0.0, -0.42), vec2(-0.42, 0.0)));
          } else if (motif == 2) {
            // Fourche astronomique
            d = min(d, sdSegment(gp, vec2(0.0, -0.75), vec2(0.0, 0.15)));
            d = min(d, sdSegment(gp, vec2(0.0, 0.15), vec2(-0.45, 0.7)));
            d = min(d, sdSegment(gp, vec2(0.0, 0.15), vec2(0.45, 0.7)));
            d = min(d, sdSegment(gp, vec2(-0.35, -0.35), vec2(0.35, -0.35)));
          } else if (motif == 3) {
            // Triangle / delta inscrit + point
            d = min(d, sdSegment(gp, vec2(-0.48, -0.55), vec2(0.48, -0.55)));
            d = min(d, sdSegment(gp, vec2(-0.48, -0.55), vec2(0.0, 0.65)));
            d = min(d, sdSegment(gp, vec2(0.48, -0.55), vec2(0.0, 0.65)));
            d = min(d, length(gp - vec2(0.0, -0.15)) - 0.1);
          } else if (motif == 4) {
            // Double barre + diagonale croisée
            d = min(d, sdSegment(gp, vec2(-0.42, -0.65), vec2(-0.42, 0.65)));
            d = min(d, sdSegment(gp, vec2(0.42, -0.65), vec2(0.42, 0.65)));
            d = min(d, sdSegment(gp, vec2(-0.42, -0.15), vec2(0.42, 0.35)));
          } else if (motif == 5) {
            // Anneau géométrique + barre transversale
            d = min(d, abs(length(gp) - 0.44));
            d = min(d, sdSegment(gp, vec2(0.0, -0.75), vec2(0.0, 0.75)));
          } else if (motif == 6) {
            // Z géométrique anguleux
            d = min(d, sdSegment(gp, vec2(-0.45, 0.6), vec2(0.45, 0.6)));
            d = min(d, sdSegment(gp, vec2(0.45, 0.6), vec2(-0.45, -0.6)));
            d = min(d, sdSegment(gp, vec2(-0.45, -0.6), vec2(0.45, -0.6)));
          } else {
            // Croissant angulaire + barre
            d = min(d, sdSegment(gp, vec2(-0.35, -0.65), vec2(0.35, 0.0)));
            d = min(d, sdSegment(gp, vec2(0.35, 0.0), vec2(-0.35, 0.65)));
            d = min(d, sdSegment(gp, vec2(-0.45, 0.0), vec2(0.1, 0.0)));
          }

          if (h2 > 0.72) {
            d = min(d, length(gp - vec2(0.48, 0.55)) - 0.09);
          }

          float sharp = clamp(uLineSharpness, 0.5, 2.0);
          float strokeW = 0.12 / sharp;
          float stroke = 1.0 - smoothstep(strokeW, strokeW + 0.13, d);
          float halo = exp(-max(0.0, d) * 4.5) * 0.25;
          return clamp(stroke + halo, 0.0, 1.0);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          p -= uMouse * (uDepth * 0.12);
          p.y += uScroll * (uDepth * 0.06);

          float scale = 1.0 / max(0.35, uDensity);
          p *= scale;

          // Projection pseudo-3D inclinable modulée par la souris
          float tilt = clamp(uTilt3D + uMouse.y * uDepth * 0.22, 0.0, 0.78);
          vec2 tiltedP = p;
          tiltedP.y /= max(0.32, 1.0 - tilt * 0.65);
          tiltedP = rot2(uMouse.x * uDepth * 0.25) * tiltedP;

          float baseOuter = 0.36;
          // Rejet rapide hors rosace pour garder un coût GPU minimal
          if (length(tiltedP) > baseOuter * 1.38 && length(p) > baseOuter * 1.38) {
            discard;
          }

          float t = uTime * max(0.02, uSpeed) * (0.45 + uRotationSpeed * 1.8);
          float breath = 1.0 + sin(uTime * (0.5 + uPulseSpeed) + snoise(vec2(uTime * 0.18, 1.7)) * 0.6) * 0.018;
          tiltedP *= breath;

          float r = length(tiltedP);
          float a = atan(tiltedP.y, tiltedP.x);

          // Apparition progressive globale (0 -> 1 sur uRevealDuration secondes)
          float revealRaw = (uRevealDuration <= 0.01) ? 1.0 : clamp(uLocalTime / uRevealDuration, 0.0, 1.0);
          float revealEase = 1.0 - pow(1.0 - revealRaw, 2.6);

          // Lueur pulsée organique multi-harmonique se propageant radialement
          float pulseBase = 0.72 + 0.20 * sin(uTime * (0.9 + uPulseSpeed * 2.1) - r * 11.0)
            + 0.10 * sin(uTime * (1.618 + uPulseSpeed * 1.3) - r * 5.5);

          vec3 colPrimary = uUseCustomColors ? uPrimaryColor : uPaletteAccent;
          vec3 colSecondary = uUseCustomColors ? uSecondaryColor : uPalettePrimary;

          float lineAccum = 0.0;
          float accentAccum = 0.0;

          int maxRings = (uQualityLevel == 0) ? 2 : ((uQualityLevel == 1) ? min(uRingCount, 3) : uRingCount);

          // Vitesses angulaires irrationnelles et alternées pour éviter toute boucle synchrone
          float speedProfile[5];
          speedProfile[0] = 0.37;
          speedProfile[1] = -0.61;
          speedProfile[2] = 0.89;
          speedProfile[3] = -1.23;
          speedProfile[4] = 0.53;

          if (uPatternStyle == 3) {
            // === ASTROLABE ===
            for (int i = 0; i < 5; i++) {
              if (i >= maxRings) break;
              float fi = float(i);
              float ringR = baseOuter * (1.0 - fi * 0.14);
              float ringOrder = float(maxRings - 1 - i) / max(1.0, float(maxRings));
              float ringRev = clamp((revealEase - ringOrder * 0.45) / 0.55, 0.0, 1.0);

              float axisAngle = fi * 0.85 + t * speedProfile[i] * 0.9;
              vec2 ap = rot2(axisAngle) * p;
              float squash = 0.42 + 0.52 * abs(sin(t * 0.38 + fi * 1.27));
              ap.y /= max(0.28, squash);
              float ar = length(ap);
              float aa = atan(ap.y, ap.x);

              vec2 rev = arcRevealMask(aa, ringRev);
              lineAccum += glowStroke(ar - ringR, 0.0018, 0.85) * (0.85 - fi * 0.09) * rev.x;
              accentAccum += glowStroke(ar - ringR, 0.0022, 1.0) * rev.y * 1.2;

              float nodeAngle = t * (0.85 + fi * 0.33) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + fi * 2.1;
              vec2 nodePos = vec2(cos(nodeAngle), sin(nodeAngle)) * ringR;
              float nodeD = length(ap - nodePos);
              accentAccum += exp(-nodeD * 48.0) * 1.15 * ringRev;

              if (uQualityLevel >= 2 && i < 2) {
                float ticks = smoothstep(0.80, 0.96, cos(aa * 48.0)) * smoothstep(0.012, 0.0, abs(ar - ringR));
                lineAccum += ticks * 0.40 * rev.x;
              }
            }
            accentAccum += exp(-length(p) * 19.0) * 0.90 * pulseBase * smoothstep(0.0, 0.25, revealEase);
          } else if (uPatternStyle == 4) {
            // === COMPASS ===
            float rotBase = t * 0.07;
            vec2 cp = rot2(rotBase) * tiltedP;
            float cr = length(cp);
            float ca = atan(cp.y, cp.x);

            vec2 revOuter = arcRevealMask(ca, clamp(revealEase * 1.3, 0.0, 1.0));
            vec2 revInner = arcRevealMask(ca + 1.5, clamp((revealEase - 0.15) * 1.3, 0.0, 1.0));

            lineAccum += glowStroke(cr - baseOuter, 0.0024, 0.9) * revOuter.x;
            lineAccum += glowStroke(cr - baseOuter * 0.87, 0.0014, 0.65) * 0.78 * revOuter.x;
            lineAccum += glowStroke(cr - baseOuter * 0.22, 0.0016, 0.75) * 0.72 * revInner.x;
            accentAccum += glowStroke(cr - baseOuter, 0.0025, 1.0) * revOuter.y * 1.2;

            if (uQualityLevel >= 1) {
              float degTicks = smoothstep(0.84, 0.98, cos(ca * 36.0)) * smoothstep(0.020, 0.0, abs(cr - baseOuter * 0.935));
              lineAccum += degTicks * 0.55 * revOuter.x;
            }

            float starFade = smoothstep(0.25, 0.85, revealEase);
            float star4 = abs(cos(ca * 2.0));
            float starShape = pow(star4, 4.0) * (baseOuter * 0.72) + 0.04;
            float star8 = pow(abs(sin(ca * 2.0)), 5.0) * (baseOuter * 0.48) + 0.03;
            lineAccum += glowStroke(cr - starShape, 0.0016, 0.85) * 0.9 * starFade;
            lineAccum += glowStroke(cr - star8, 0.0013, 0.6) * 0.55 * starFade;

            float needleAng = 1.5708 + sin(uTime * 1.35) * 0.14 * uNeedleOscillation
              + snoise(vec2(uTime * 0.55, 3.1)) * 0.22 * uNeedleOscillation
              + uMouse.x * uDepth * 0.5;
            vec2 np = rot2(-needleAng) * tiltedP;
            float needleBody = abs(np.y) - max(0.0, (0.28 - abs(np.x)) * 0.09);
            if (abs(np.x) < 0.28) {
              float nGlow = 1.0 - smoothstep(0.0, 0.005, needleBody);
              accentAccum += nGlow * (np.x > 0.0 ? 1.25 : 0.45) * starFade;
            }
            accentAccum += exp(-cr * 32.0) * 0.9 * pulseBase * smoothstep(0.0, 0.25, revealEase);
          } else {
            // === ARCANE / MANDALA / POLYHEDRON / CYBER_GLYPH ===
            for (int i = 0; i < 5; i++) {
              if (i >= maxRings) break;
              float fi = float(i);
              float ringR = baseOuter * (1.0 - fi * 0.17);
              float ringOrder = float(maxRings - 1 - i) / max(1.0, float(maxRings));
              float ringRev = clamp((revealEase - ringOrder * 0.48) / 0.52, 0.0, 1.0);

              float ringPulse = 0.78 + 0.22 * sin(uTime * (1.1 + uPulseSpeed * 2.0) - fi * 0.85);
              float ringRot = t * speedProfile[i];

              vec2 rp = rot2(ringRot) * tiltedP;
              float ra = atan(rp.y, rp.x);

              vec2 rev = arcRevealMask(ra, ringRev);

              // Anneau principal (avec coupures cyber si cyber_glyph)
              float ringMask = 1.0;
              if (uPatternStyle == 5) {
                float seg = hash12(vec2(floor((ra + PI) / TAU * uSymmetry * 2.0), fi + 3.0));
                ringMask = step(0.18, seg);
              }
              lineAccum += glowStroke(r - ringR, 0.0018, 0.85) * ringMask * (0.95 - fi * 0.08) * ringPulse * rev.x;
              accentAccum += glowStroke(r - ringR, 0.0022, 1.0) * rev.y * 1.25;

              // Filet fin intérieur encadrant l'anneau (HIGH & MEDIUM)
              if (uQualityLevel >= 1 && i < 3) {
                float subR = ringR - 0.015;
                lineAccum += glowStroke(r - subR, 0.0009, 0.5) * 0.48 * rev.x;
                if (uQualityLevel >= 2) {
                  float ticks = smoothstep(0.86, 0.98, cos(ra * uSymmetry * 6.0)) * smoothstep(0.007, 0.0, abs(r - (ringR - 0.007)));
                  lineAccum += ticks * 0.45 * rev.x;
                }
              }

              // Polygones ou étoiles inscrits selon le style
              float polyFade = smoothstep(0.20, 0.85, ringRev);
              if (i == 0 || (i == 1 && uPatternStyle != 5)) {
                float polySides = (uPatternStyle == 2) ? 6.0 : max(3.0, floor(uSymmetry * 0.5));
                float dPoly1 = sdRegularPolygon(rp, ringR * 0.96, polySides);
                lineAccum += glowStroke(dPoly1, 0.0015, 0.72) * 0.78 * polyFade * ringPulse;

                if (uPatternStyle == 0 || uPatternStyle == 1) {
                  vec2 rp2 = rot2(PI / polySides) * rp;
                  float dPoly2 = sdRegularPolygon(rp2, ringR * 0.96, polySides);
                  lineAccum += glowStroke(dPoly2, 0.0013, 0.65) * 0.68 * polyFade * ringPulse;
                }
              }

              // Bande de symboles géométriques fins et nets (HIGH & MEDIUM sur anneau 0)
              if ((uQualityLevel >= 2 && i < 2) || (uQualityLevel == 1 && i == 0)) {
                float glyphCount = (uPatternStyle == 1) ? uSymmetry * 3.0 : uSymmetry * 2.0;
                float gBand = proceduralGlyphBand(r, ra, ringR - 0.032, 0.034, glyphCount, fi * 11.7 + float(uPatternStyle) * 5.0);
                accentAccum += gBand * 0.75 * ringRev * ringPulse;
              }
            }

            // Rayons radiaux et points cardinaux
            if (uQualityLevel >= 1) {
              vec2 sp = rot2(-t * 0.35) * tiltedP;
              float sa = atan(sp.y, sp.x);
              float sector = mod(sa + PI / uSymmetry, TAU / uSymmetry) - PI / uSymmetry;
              float radialRay = abs(sector) * r;
              float rayMask = smoothstep(0.08, 0.12, r) * smoothstep(baseOuter, baseOuter - 0.04, r) * smoothstep(0.35, 0.95, revealEase);
              if (uPatternStyle == 1 || uPatternStyle == 2 || uPatternStyle == 0) {
                lineAccum += glowStroke(radialRay, 0.0010, 0.45) * rayMask * (uPatternStyle == 0 ? 0.25 : 0.45);
              }
            }

            // Cœur pulsant interne
            accentAccum += exp(-r * 17.0) * 0.62 * pulseBase * smoothstep(0.0, 0.25, revealEase);
          }

          // Particules orbitales lumineuses le long et autour des anneaux
          int activeParticles = (uQualityLevel >= 2)
            ? uParticleCount
            : ((uQualityLevel == 1) ? min(uParticleCount, 10) : min(uParticleCount, 2));
          float particleAppear = smoothstep(0.35, 0.98, revealEase);

          if (activeParticles > 0 && particleAppear > 0.01) {
            for (int k = 0; k < 28; k++) {
              if (k >= activeParticles) break;
              float fk = float(k);
              float seedP1 = hash12(vec2(fk * 13.7, 5.1));
              float seedP2 = hash12(vec2(fk * 29.3, 19.7));
              int hostRing = int(mod(fk, float(maxRings)));
              float orbitR = baseOuter * (1.0 - float(hostRing) * 0.16) + (seedP1 - 0.5) * 0.028;
              float orbitDir = (mod(float(hostRing), 2.0) < 0.5) ? 1.0 : -1.0;
              float orbitSpd = (0.45 + seedP2 * 0.95) * orbitDir * (0.4 + uRotationSpeed * 1.4);
              float pAngle = seedP1 * TAU + uTime * max(0.05, uSpeed) * orbitSpd;
              // Respiration radiale légère
              orbitR += sin(uTime * (0.8 + seedP2) + fk) * 0.006;

              vec2 pPos = vec2(cos(pAngle), sin(pAngle)) * orbitR;
              float pDist = length(tiltedP - pPos);
              float twinkle = 0.45 + 0.55 * sin(uTime * (2.2 + seedP1 * 3.0) + fk * 2.4);
              float pCore = exp(-pDist * 190.0) * 1.1 + exp(-pDist * 55.0) * 0.42;

              // Micro-traînée tangentielle sur HIGH
              float pTail = 0.0;
              if (uQualityLevel >= 2) {
                float dA = mod((a - pAngle) * orbitDir + TAU, TAU);
                if (dA < 0.35 && abs(r - orbitR) < 0.014) {
                  pTail = exp(-dA * 12.0) * exp(-abs(r - orbitR) * 180.0) * 0.45;
                }
              }

              accentAccum += (pCore + pTail) * twinkle * particleAppear;
            }
          }

          vec3 finalCol = colPrimary * (lineAccum * pulseBase)
            + mix(colSecondary, vec3(1.0, 0.98, 0.92), 0.38) * accentAccum;
          float lowVisBoost = (uQualityLevel == 0) ? 1.35 : 1.0;
          finalCol *= uIntensity * lowVisBoost;

          float alpha = clamp((lineAccum * 0.72 + accentAccum * 0.85) * uIntensity * lowVisBoost, 0.0, 0.94);
          if (alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -30
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(delta: number): void {
    if (!this.material) return
    this.localTime += Math.min(delta, 0.05)
    this.material.uniforms.uLocalTime.value = this.localTime
  }

  public updateProps(newProps: Partial<RunicCircleProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.patternStyle !== undefined) {
      this.material.uniforms.uPatternStyle.value = PATTERN_STYLE_MAP[newProps.patternStyle] ?? 0
    }
    if (newProps.ringCount !== undefined) {
      this.material.uniforms.uRingCount.value = Math.min(
        5,
        Math.max(2, Math.round(newProps.ringCount))
      )
    }
    if (newProps.symmetry !== undefined) {
      this.material.uniforms.uSymmetry.value = Math.min(
        16,
        Math.max(4, Math.round(newProps.symmetry))
      )
    }
    if (newProps.tilt3D !== undefined) this.material.uniforms.uTilt3D.value = newProps.tilt3D
    if (newProps.rotationSpeed !== undefined)
      this.material.uniforms.uRotationSpeed.value = newProps.rotationSpeed
    if (newProps.pulseSpeed !== undefined)
      this.material.uniforms.uPulseSpeed.value = newProps.pulseSpeed
    if (newProps.needleOscillation !== undefined)
      this.material.uniforms.uNeedleOscillation.value = newProps.needleOscillation
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.revealDuration !== undefined)
      this.material.uniforms.uRevealDuration.value = newProps.revealDuration
    if (newProps.particleCount !== undefined) {
      this.material.uniforms.uParticleCount.value = Math.min(
        28,
        Math.max(0, Math.round(newProps.particleCount))
      )
    }
    if (newProps.lineSharpness !== undefined)
      this.material.uniforms.uLineSharpness.value = newProps.lineSharpness
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

export const RunicCircleDefinition: IBrickDefinition<RunicCircleProps> = {
  type: 'runic_circle',
  category: 'special',
  create: (id, props, context) => new RunicCircleInstance(id, props, context),
}

BrickRegistry.register(RunicCircleDefinition)
