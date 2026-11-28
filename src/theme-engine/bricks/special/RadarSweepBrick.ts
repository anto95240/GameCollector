/**
 * src/theme-engine/bricks/special/RadarSweepBrick.ts
 *
 * Brique Spéciale : Balayage Radar, Sonar & Grille Orbitale (Couche : Spéciaux).
 * Shader polaire anti-aliasé (`fwidth`) à persistance réaliste de phosphore CRT
 * sans couture angulaire, grille polaire graduée (cercles + rayons azimutaux + limbe),
 * échos/blips synchronisés qui s'illuminent vivement au passage du faisceau puis
 * s'éteignent progressivement jusqu'à zéro, léger fouillis radar (clutter) et bruit électronique :
 * - 'sonar' : écran sonar 360° circulaire à balayage phosphorescent (Splinter)
 * - 'motion_tracker' : détecteur de mouvement conique à ondes radiales montantes (Xenomorph)
 * - 'orbital_grid' : réticule holographique sphérique avec méridiens rotatifs et cibles verrouillées (Echelon)
 *
 * Décentrement parallaxe souris/scroll, blips dérivant par Simplex, et paliers HIGH / MEDIUM / LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type RadarSweepStyle = 'sonar' | 'motion_tracker' | 'orbital_grid'

export interface RadarSweepProps {
  /** Couleur du faisceau de balayage et de la rémanence (défaut #22c55e ou uPaletteAccent). */
  sweepColor?: string
  /** Couleur des cercles concentriques et de la grille polaire (défaut #15803d ou uPalettePrimary). */
  gridColor?: string
  /** Couleur des échos / blips détectés (défaut #86efac). */
  blipColor?: string
  /** Architecture du radar (défaut 'sonar'). */
  radarStyle?: RadarSweepStyle
  /** Cadence angulaire ou radiale du balayage (0.05 à 1.5, défaut 0.45). */
  sweepSpeed?: number
  /** Persistance lumineuse de la traîne après passage du faisceau (0.2 à 0.95, défaut 0.72). */
  persistence?: number
  /** Nombre d'anneaux concentriques gradués (3 à 6, défaut 4). */
  ringCount?: number
  /** Nombre maximal d'échos stochastiques actifs (0 à 12, défaut 6). */
  blipCount?: number
  /** Ouverture angulaire du cône en mode motion_tracker (0.6 à 3.14 rad, défaut 1.8). */
  arcSector?: number
  /** Échelle spatiale globale du radar (0.5 à 2.0, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.05 à 2.0, défaut 0.5). */
  speed?: number
  /** Profondeur et décentrement parallaxe à la souris (0.0 à 1.0, défaut 0.30). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Dérive et instabilité stochastique des blips (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Intensité du léger bruit électronique et grain phosphore CRT (0.0 à 1.0, défaut 0.35). */
  noiseLevel?: number
  /** Intensité du fouillis radar (échos parasites révélés dans la traîne) (0.0 à 1.0, défaut 0.35). */
  clutterIntensity?: number
}

const RADAR_STYLE_MAP: Record<RadarSweepStyle, number> = {
  sonar: 0,
  motion_tracker: 1,
  orbital_grid: 2,
}

export class RadarSweepInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'radar_sweep'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: RadarSweepProps
  private sweepColorVec: THREE.Color
  private gridColorVec: THREE.Color
  private blipColorVec: THREE.Color

  constructor(id: string, props: RadarSweepProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.sweepColorVec = new THREE.Color(props.sweepColor ?? '#22c55e')
    this.gridColorVec = new THREE.Color(props.gridColor ?? '#15803d')
    this.blipColorVec = new THREE.Color(props.blipColor ?? props.sweepColor ?? '#86efac')

    const styleIdx = RADAR_STYLE_MAP[props.radarStyle ?? 'sonar'] ?? 0
    const sweepSpeed = props.sweepSpeed ?? 0.45
    const persistence = props.persistence ?? 0.72
    const ringCount = Math.min(6, Math.max(3, Math.round(props.ringCount ?? 4)))
    const blipCount = Math.min(12, Math.max(0, Math.round(props.blipCount ?? 6)))
    const arcSector = props.arcSector ?? 1.8
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.5
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.45
    const noiseLevel = props.noiseLevel ?? 0.35
    const clutterIntensity = props.clutterIntensity ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uSweepColor: { value: this.sweepColorVec },
        uGridColor: { value: this.gridColorVec },
        uBlipColor: { value: this.blipColorVec },
        uUseCustomColors: {
          value: Boolean(props.sweepColor || props.gridColor || props.blipColor),
        },
        uRadarStyle: { value: styleIdx },
        uSweepSpeed: { value: sweepSpeed },
        uPersistence: { value: persistence },
        uRingCount: { value: ringCount },
        uBlipCount: { value: blipCount },
        uArcSector: { value: arcSector },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uNoiseLevel: { value: noiseLevel },
        uClutterIntensity: { value: clutterIntensity },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.994, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uSweepColor;
        uniform vec3 uGridColor;
        uniform vec3 uBlipColor;
        uniform bool uUseCustomColors;
        uniform int uRadarStyle;
        uniform float uSweepSpeed;
        uniform float uPersistence;
        uniform int uRingCount;
        uniform int uBlipCount;
        uniform float uArcSector;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uNoiseLevel;
        uniform float uClutterIntensity;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        float glowStroke(float d, float width, float glowStrength) {
          float ad = abs(d);
          float fw = max(0.0010, fwidth(d));
          float core = 1.0 - smoothstep(width, width + fw * 1.5 + 0.0012, ad);
          float halo = exp(-ad * (52.0 / max(0.2, glowStrength))) * 0.36;
          return max(core, halo);
        }

        // Enveloppe d'excitation phosphore réaliste : attaque vive au passage du faisceau,
        // décroissance exponentielle double pente (flash rapide + rémanence longue), extinction propre à 0
        float phosphorEchoEnvelope(float lagNorm, float persistence) {
          // lagNorm dans [0, 1[ : 0 = instant du passage du faisceau
          float attack = smoothstep(0.0, 0.016, lagNorm);
          float fastFlash = exp(-lagNorm * 16.0) * 0.85;
          float slowDecay = exp(-lagNorm * mix(7.2, 2.1, persistence));
          // Extinction complète avant le tour suivant (évite tout saut brutal à lagNorm = 1 -> 0)
          float cleanZero = smoothstep(0.96, 0.72, lagNorm);
          return (fastFlash + slowDecay) * attack * cleanZero;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe souris et scroll
          p -= uMouse * (uDepth * 0.14);
          p.y += uScroll * (uDepth * 0.06);
          p /= max(0.4, uDensity);

          float t = uTime * max(0.02, uSpeed) * (0.45 + uSweepSpeed * 1.8);
          float noiseAmt = clamp(uNoiseLevel, 0.0, 1.0);
          float clutterAmt = clamp(uClutterIntensity, 0.0, 1.0);

          vec3 colSweep = uUseCustomColors ? uSweepColor : uPaletteAccent;
          vec3 colGrid = uUseCustomColors ? uGridColor : uPalettePrimary;
          vec3 colBlip = uUseCustomColors ? uBlipColor : mix(colSweep, vec3(1.0), 0.38);
          // Phosphore chaud au moment de l'impact du faisceau d'électrons (teinte blanc-phosphore)
          vec3 hotPhosphor = mix(colSweep, vec3(0.96, 1.0, 0.96), 0.72);
          // Phosphore refroidi en fin de rémanence (plus profond et saturé)
          vec3 deepPhosphor = mix(colGrid, colSweep, 0.45) * 0.65;

          float gridAccum = 0.0;
          float sweepHot = 0.0;
          float sweepTrail = 0.0;
          float sweepDeepTrail = 0.0;
          float blipHot = 0.0;
          float blipGlow = 0.0;
          float clutterAccum = 0.0;
          float scopeMask = 0.0;

          if (uRadarStyle == 1) {
            // === MOTION_TRACKER : cône détecteur de mouvement (Xenomorph) ===
            vec2 mp = p - vec2(0.0, -0.26);
            float mr = length(mp);
            float maxR = 0.70;
            float angUp = atan(mp.x, mp.y); // 0 = haut, continu autour de l'axe vertical
            float halfArc = clamp(uArcSector * 0.5, 0.30, 1.55);

            float inSector = 1.0 - smoothstep(halfArc - 0.01, halfArc + 0.01, abs(angUp));
            float inRadius = 1.0 - smoothstep(maxR - 0.005, maxR + 0.005, mr);
            float sectorMask = inSector * inRadius;
            scopeMask = sectorMask;

            // Arcs concentriques dans le cône
            for (int i = 0; i < 6; i++) {
              if (i >= uRingCount) break;
              float ringR = maxR * (float(i + 1) / float(uRingCount));
              gridAccum += glowStroke(mr - ringR, 0.0018, 0.72) * inSector * 0.88;
            }

            // Bords latéraux du cône + rayons azimutaux
            float sideBound = abs(angUp) - halfArc;
            gridAccum += glowStroke(sideBound * mr, 0.0022, 0.78) * inRadius * 0.96;
            gridAccum += glowStroke(mp.x, 0.0013, 0.48) * sectorMask * 0.52;
            if (uQualityLevel >= 1) {
              float subRay = abs(abs(angUp) - halfArc * 0.5) * mr;
              gridAccum += glowStroke(subRay, 0.0011, 0.40) * inRadius * 0.42;
            }
            if (uQualityLevel >= 2) {
              // Graduations fines sur l'arc extérieur
              float arcTicks = smoothstep(0.86, 0.98, cos(angUp * 24.0))
                * smoothstep(0.015, 0.0, abs(mr - maxR * 0.97))
                * inSector;
              gridAccum += arcTicks * 0.42;
            }

            // Onde sonar radiale ascendante avec persistance phosphore
            float pulsePhase = fract(t * 0.52);
            float pulseR = pulsePhase * maxR;
            float rLag = pulseR - mr;
            if (rLag >= -0.014 && mr < maxR) {
              float lead = exp(-abs(rLag) * 68.0) * 1.25;
              float trail = (rLag > 0.0) ? exp(-rLag * (14.0 - uPersistence * 9.5)) * 0.65 : 0.0;
              float deepT = (rLag > 0.0) ? exp(-rLag * (6.0 - uPersistence * 3.8)) * 0.28 : 0.0;
              float fadeTop = 1.0 - pulsePhase * 0.18;
              sweepHot += lead * inSector * fadeTop;
              sweepTrail += trail * inSector * fadeTop;
              sweepDeepTrail += deepT * inSector * fadeTop;
            }

            // Fouillis radar léger dans le sillage de l'onde
            if (uQualityLevel >= 1 && clutterAmt > 0.02 && sectorMask > 0.01) {
              float cNoise = snoise(mp * 14.0 + vec2(0.0, -uTime * 0.06)) * 0.5 + 0.5;
              float clutterMask = pow(smoothstep(0.55, 0.92, cNoise), 2.2);
              clutterAccum = clutterMask * (sweepTrail + sweepDeepTrail) * clutterAmt * 0.55;
            }

            // Blips synchronisés au passage de l'onde radiale (2 même en LOW)
            int activeBlips = (uQualityLevel == 0) ? min(uBlipCount, 2) : ((uQualityLevel == 1) ? min(uBlipCount, 5) : uBlipCount);
            for (int b = 0; b < 12; b++) {
              if (b >= activeBlips) break;
              float fb = float(b);
              float h1 = hash12(vec2(fb, 9.3));
              float h2 = hash12(vec2(fb + 5.1, 3.7));
              float driftA = (uQualityLevel >= 1) ? snoise(vec2(uTime * 0.12 + fb * 2.1, fb)) * 0.12 * uRandomness : 0.0;
              float driftR = (uQualityLevel >= 1) ? snoise(vec2(fb * 3.7, uTime * 0.10)) * 0.05 * uRandomness : 0.0;

              float bAng = (h1 - 0.5) * (halfArc * 1.62) + driftA;
              float bRad = (0.16 + h2 * 0.72) * maxR + driftR;
              vec2 bPos = vec2(sin(bAng), cos(bAng)) * bRad;

              float lagNorm = fract((pulseR - bRad) / maxR);
              float echo = phosphorEchoEnvelope(lagNorm, uPersistence);
              float flash = exp(-lagNorm * 22.0) * smoothstep(0.0, 0.015, lagNorm);
              float dB = length(mp - bPos);
              float dotCore = exp(-dB * 92.0) * 1.45;
              float dotHalo = exp(-dB * 26.0) * 0.52;
              float pingRing = (uQualityLevel >= 2) ? glowStroke(dB - lagNorm * 0.065, 0.0011, 0.45) * exp(-lagNorm * 6.5) * 0.48 : 0.0;

              blipHot += dotCore * (0.45 + 1.15 * flash) * echo;
              blipGlow += (dotHalo + pingRing) * echo;
            }
          } else {
            // === SONAR (0) & ORBITAL_GRID (2) : cadran polaire 360° ===
            float r = length(p);
            float a = atan(p.y, p.x);
            float maxR = 0.41;
            float inDisc = 1.0 - smoothstep(maxR - 0.004, maxR + 0.004, r);
            scopeMask = inDisc;

            // 1. Grille polaire complète : anneaux concentriques hiérarchisés
            for (int i = 0; i < 6; i++) {
              if (i >= uRingCount) break;
              float ringR = maxR * (float(i + 1) / float(uRingCount));
              bool isOuter = (i == uRingCount - 1);
              float w = isOuter ? 0.0022 : 0.0012;
              gridAccum += glowStroke(r - ringR, w, isOuter ? 0.78 : 0.55) * (isOuter ? 0.95 : 0.50);
            }

            // Axes cardinaux (N/S/E/O)
            gridAccum += glowStroke(p.x, 0.0011, 0.42) * inDisc * 0.46;
            gridAccum += glowStroke(p.y, 0.0011, 0.42) * inDisc * 0.46;

            // Rayons azimutaux tous les 30° (12 secteurs polaires authentiques)
            if (uQualityLevel >= 1 && r < maxR && r > 0.02) {
              float spokeAngle = mod(a + PI / 12.0 + TAU, PI / 6.0) - PI / 12.0;
              float spokeDist = abs(sin(spokeAngle)) * r;
              gridAccum += glowStroke(spokeDist, 0.0008, 0.30) * inDisc * 0.24;
            }

            // Graduations de degrés (majeures tous les 30° + mineures tous les 5°) sur le limbe + coches d'axes (HIGH)
            if (uQualityLevel >= 2) {
              float minorTicks = smoothstep(0.84, 0.97, cos(a * 72.0))
                * smoothstep(0.011, 0.0, abs(r - maxR * 0.975));
              float majorTicks = smoothstep(0.94, 0.995, cos(a * 12.0))
                * smoothstep(0.022, 0.0, abs(r - maxR * 0.955));
              // Micro-coches de distance le long des axes cardinaux
              float axisStep = maxR / float(uRingCount * 4);
              float tickOnX = smoothstep(0.0045, 0.0, abs(p.y))
                * smoothstep(0.0018, 0.0, abs(fract(abs(p.x) / axisStep + 0.5) - 0.5) * axisStep);
              float tickOnY = smoothstep(0.0045, 0.0, abs(p.x))
                * smoothstep(0.0018, 0.0, abs(fract(abs(p.y) / axisStep + 0.5) - 0.5) * axisStep);
              gridAccum += (minorTicks * 0.34 + majorTicks * 0.62 + (tickOnX + tickOnY) * inDisc * 0.26);
            }

            // Point émetteur central discret
            gridAccum += exp(-r * 95.0) * 0.72;

            // Grille sphérique orbitale rotative (mode 2 : Echelon)
            if (uRadarStyle == 2 && r < maxR) {
              for (int lat = -2; lat <= 2; lat++) {
                if (lat == 0) continue;
                float latY = float(lat) * 0.135;
                gridAccum += glowStroke(p.y - latY, 0.001, 0.38) * inDisc * 0.35;
              }
              for (int m = 0; m < 3; m++) {
                float lonAng = t * 0.28 + float(m) * (PI / 3.0);
                float xScale = max(0.06, abs(cos(lonAng)));
                vec2 mp = vec2(p.x / xScale, p.y);
                gridAccum += glowStroke(length(mp) - maxR, 0.0012, 0.4) * inDisc * 0.42;
              }
            }

            // 2. Balayage rotatif horaire avec persistance phosphore bi-exponentielle
            float sweepAng = mod(-t * (1.25 + uSweepSpeed * 2.2), TAU);
            float lag = mod(a - sweepAng + TAU * 4.0, TAU);
            float lagNorm = lag / TAU;

            // Traînée principale lumineuse + rémanence profonde plus lente
            float decayFast = mix(0.24, 1.35, uPersistence);
            float decaySlow = mix(0.65, 3.20, uPersistence);
            float trailFadeZero = smoothstep(0.98, 0.78, lagNorm);
            float wakeFast = exp(-lag / max(0.12, decayFast)) * trailFadeZero;
            float wakeSlow = exp(-lag / max(0.25, decaySlow)) * trailFadeZero;
            // Atténuation naturelle vers le bord extérieur du faisceau (divergence radiale du lobe)
            float radialLobe = mix(1.08, 0.78, smoothstep(0.05, maxR, r));

            // Ligne frontale ultra-nette du faisceau d'électrons + halo phosphore immédiat
            float armDist = sin(a - sweepAng) * r;
            float armFront = step(0.0, cos(a - sweepAng));
            float armCore = glowStroke(armDist, 0.0015, 0.92) * armFront * inDisc;
            float leadBloom = exp(-lag * 18.0) * inDisc * 0.55;

            sweepHot += (armCore * 1.15 + leadBloom) * radialLobe;
            sweepTrail += wakeFast * inDisc * 0.62 * radialLobe;
            sweepDeepTrail += wakeSlow * inDisc * 0.32 * radialLobe;

            // Second faisceau opposé discret en mode orbital_grid
            if (uRadarStyle == 2 && uQualityLevel >= 1) {
              float lag2 = mod(a - (sweepAng + PI) + TAU * 4.0, TAU);
              sweepTrail += exp(-lag2 / max(0.15, decayFast * 0.65)) * inDisc * 0.24;
            }

            // 3. Fouillis radar (clutter mer/terrain discret révélé uniquement dans la persistance du balayage)
            if (uQualityLevel >= 1 && clutterAmt > 0.02 && r < maxR) {
              float cScale = (uQualityLevel >= 2) ? 20.0 : 14.0;
              float c1 = snoise(p * cScale + vec2(1.7, 3.1)) * 0.5 + 0.5;
              float c2 = (uQualityLevel >= 2) ? (snoise(p * 42.0 + vec2(-uTime * 0.04, 5.2)) * 0.5 + 0.5) : 0.6;
              float speckles = pow(smoothstep(0.56, 0.90, c1 * 0.65 + c2 * 0.35), 2.3);
              // Fouillis légèrement plus présent près du centre (retours proches)
              float nearBias = mix(1.25, 0.45, smoothstep(0.04, maxR, r));
              clutterAccum = speckles * nearBias * (wakeFast * 0.75 + wakeSlow * 0.35) * inDisc * clutterAmt * 0.58;
            }

            // 4. Échos/blips réalistes : s'allument vivement au passage du faisceau puis s'éteignent
            // 2 blips légers même en LOW pour préserver l'effet signature du radar
            int activeBlips = (uQualityLevel == 0) ? min(uBlipCount, 2) : ((uQualityLevel == 1) ? min(uBlipCount, 5) : uBlipCount);
            for (int b = 0; b < 12; b++) {
              if (b >= activeBlips) break;
              float fb = float(b);
              float h1 = hash12(vec2(fb, 14.7));
              float h2 = hash12(vec2(fb * 2.3, 6.1));
              float hSize = hash12(vec2(fb * 4.7 + 1.3, 8.9));

              float driftA = (uQualityLevel >= 1) ? snoise(vec2(uTime * 0.09 + fb * 2.0, fb)) * 0.24 * uRandomness : 0.0;
              float driftR = (uQualityLevel >= 1) ? snoise(vec2(fb * 4.1, uTime * 0.07)) * 0.03 * uRandomness : 0.0;

              float bAng = h1 * TAU - PI + driftA;
              float bRad = (0.14 + h2 * 0.74) * maxR + driftR;
              vec2 bPos = vec2(cos(bAng), sin(bAng)) * bRad;

              float blipLag = mod(bAng - sweepAng + TAU * 4.0, TAU);
              float bLagNorm = blipLag / TAU;
              float echo = phosphorEchoEnvelope(bLagNorm, uPersistence);
              if (echo <= 0.002) continue;

              float flash = exp(-bLagNorm * 24.0) * smoothstep(0.0, 0.014, bLagNorm);

              // Forme réaliste d'écho radar : légèrement étiré en arc azimutal (largeur de lobe d'antenne)
              float drB = r - bRad;
              float daB = atan(sin(a - bAng), cos(a - bAng)) * bRad;
              float arcWidth = mix(0.011, 0.022, hSize) * (0.75 + 0.55 * (bRad / maxR));
              float radWidth = mix(0.0055, 0.0095, hSize);
              float ellipDist = length(vec2(drB / radWidth, daB / arcWidth));

              float dotCore = exp(-ellipDist * ellipDist * 1.45) * (1.15 + 0.55 * hSize);
              float dotHalo = exp(-ellipDist * 1.15) * 0.42;

              // Réticule de verrouillage (orbital_grid) ou anneau de ping bref (sonar HIGH)
              float lockMark = 0.0;
              if (uQualityLevel >= 2 && uRadarStyle == 2) {
                float dDiamond = abs(p.x - bPos.x) + abs(p.y - bPos.y);
                lockMark = glowStroke(dDiamond - 0.022, 0.001, 0.4) * 0.72;
              } else if (uQualityLevel >= 2) {
                float dB = length(p - bPos);
                lockMark = glowStroke(dB - bLagNorm * 0.055, 0.0009, 0.42) * exp(-bLagNorm * 9.5) * 0.42;
              }

              blipHot += dotCore * (0.40 + 1.25 * flash) * echo;
              blipGlow += (dotHalo + lockMark) * echo;
            }
          }

          // 5. Léger bruit électronique CRT & micro-scanlines de tube phosphore dans l'écran radar
          float crtNoise = 0.0;
          float scanMod = 1.0;
          if (noiseAmt > 0.01 && scopeMask > 0.01) {
            if (uQualityLevel >= 1) {
              // Grain phosphore fin renouvelé à ~24 Hz (aspect tube analogique authentique)
              float frameStep = floor(uTime * 24.0);
              vec2 grainCoord = floor(gl_FragCoord.xy * 0.5);
              float g = hash12(grainCoord + vec2(frameStep * 17.3, frameStep * 9.1));
              crtNoise = (g - 0.5) * 0.24 * noiseAmt * scopeMask;
              // Très léger bruit de fond thermique de réception à l'intérieur du disque
              float floorStatic = (g * g) * 0.055 * noiseAmt * scopeMask;
              crtNoise += floorStatic;
            }
            if (uQualityLevel >= 2) {
              // Micro-scanlines subtiles de moniteur radar
              scanMod = 1.0 - (0.08 * noiseAmt) * (0.5 + 0.5 * sin(gl_FragCoord.y * 1.6));
            }
          }

          // Composition chromatique phosphore réaliste
          vec3 sweepCol = hotPhosphor * sweepHot
            + colSweep * sweepTrail
            + deepPhosphor * sweepDeepTrail
            + mix(colGrid, colSweep, 0.65) * clutterAccum;

          vec3 blipFinal = mix(colBlip, vec3(0.96, 1.0, 0.97), 0.62) * blipHot
            + colBlip * blipGlow;

          vec3 finalCol = (colGrid * gridAccum + sweepCol + blipFinal) * scanMod;
          finalCol += colSweep * max(0.0, crtNoise);
          finalCol *= uIntensity;

          float alpha = clamp(
            (gridAccum * 0.56 + sweepHot * 0.85 + sweepTrail * 0.62 + sweepDeepTrail * 0.34
              + clutterAccum * 0.5 + blipHot * 0.9 + blipGlow * 0.65 + max(0.0, crtNoise) * 0.7)
              * uIntensity,
            0.0,
            0.94
          );
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
    this.mesh.renderOrder = -25
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<RadarSweepProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.sweepColor !== undefined) {
      this.sweepColorVec.set(newProps.sweepColor)
      this.material.uniforms.uSweepColor.value = this.sweepColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.gridColor !== undefined) {
      this.gridColorVec.set(newProps.gridColor)
      this.material.uniforms.uGridColor.value = this.gridColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.blipColor !== undefined) {
      this.blipColorVec.set(newProps.blipColor)
      this.material.uniforms.uBlipColor.value = this.blipColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.radarStyle !== undefined) {
      this.material.uniforms.uRadarStyle.value = RADAR_STYLE_MAP[newProps.radarStyle] ?? 0
    }
    if (newProps.sweepSpeed !== undefined)
      this.material.uniforms.uSweepSpeed.value = newProps.sweepSpeed
    if (newProps.persistence !== undefined)
      this.material.uniforms.uPersistence.value = newProps.persistence
    if (newProps.ringCount !== undefined) {
      this.material.uniforms.uRingCount.value = Math.min(
        6,
        Math.max(3, Math.round(newProps.ringCount))
      )
    }
    if (newProps.blipCount !== undefined) {
      this.material.uniforms.uBlipCount.value = Math.min(
        12,
        Math.max(0, Math.round(newProps.blipCount))
      )
    }
    if (newProps.arcSector !== undefined)
      this.material.uniforms.uArcSector.value = newProps.arcSector
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.noiseLevel !== undefined)
      this.material.uniforms.uNoiseLevel.value = newProps.noiseLevel
    if (newProps.clutterIntensity !== undefined)
      this.material.uniforms.uClutterIntensity.value = newProps.clutterIntensity
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

export const RadarSweepDefinition: IBrickDefinition<RadarSweepProps> = {
  type: 'radar_sweep',
  category: 'special',
  create: (id, props, context) => new RadarSweepInstance(id, props, context),
}

BrickRegistry.register(RadarSweepDefinition)
