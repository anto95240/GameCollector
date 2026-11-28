/**
 * src/theme-engine/bricks/special/GravitationalLensingBrick.ts
 *
 * Brique Spéciale : Lentille Gravitationnelle, Trou Noir & Vortex (Couche : Spéciaux).
 * Simulation optique relativiste hybride (distorsion réelle du fond via FramebufferTexture
 * en HIGH/MEDIUM + rendu analytique autonome ultra-léger en LOW, 1 seul draw call GPU) :
 * - Trou noir : ombre d'horizon nette, anneau de photons fin, disque d'accrétion continu
 *   (avant + arches gravitationnelles supérieure et inférieure courbées), cisaillement
 *   képlérien lent, effet Doppler relativiste (côté en approche sur-lumineux/chaud, côté
 *   fuyant redshifté) et étoiles du fond étirées en arcs d'Einstein ('black_hole')
 * - Portail énergétique circulaire à caustiques Cherenkov ondulantes ('portal')
 * - Vortex spatio-temporel en spirale lumineuse ('wormhole')
 * - Multiples lentilles dimensionnelles à dispersion chromatique ('multilens')
 * - Lentille gravitationnelle faible en arcs d'Einstein réactifs à la souris ('weak_lensing')
 * - Flux centripète de superamas convergeant vers un attracteur ('attractor')
 *
 * Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D, GLSL_VORONOI_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type GravitationalLensMode =
  | 'black_hole'
  | 'portal'
  | 'wormhole'
  | 'multilens'
  | 'weak_lensing'
  | 'attractor'

export interface GravitationalLensingProps {
  /** Teinte principale du disque d'accrétion, portail ou arcs (défaut #fb923c ou uPaletteAccent). */
  diskColor?: string
  /** Teinte secondaire de dispersion / spirale / couronne (défaut #38bdf8 ou uPalettePrimary). */
  secondaryColor?: string
  /** Teinte du cœur / horizon des événements (défaut #020308). */
  coreColor?: string
  /** Topologie de l'effet gravitationnel (défaut 'black_hole'). */
  lensMode?: GravitationalLensMode
  /** Rayon de l'horizon des événements ou du portail (0.0 à 0.35, défaut 0.14). */
  coreRadius?: number
  /** Inclinaison du disque d'accrétion en mode black_hole (0.05 à 0.55, défaut 0.22). */
  diskTilt?: number
  /** Brillance de l'anneau d'Einstein / sphère de photons (0.0 à 1.5, défaut 0.9). */
  einsteinRing?: number
  /** Torsion de la spirale en mode wormhole / attractor (0.2 à 2.5, défaut 1.2). */
  spiralTwist?: number
  /** Force des ondulations liquides en mode portal (0.0 à 1.2, défaut 0.7). */
  rippleStrength?: number
  /** Décalage spectral rouge/Doppler (0.0 à 1.0, défaut 0.25). */
  redshift?: number
  /** Nombre d'arcs / flux gravitationnels en modes weak_lensing et attractor (4 à 24, défaut 12). */
  arcCount?: number
  /** Vitesse d'aspiration centripète en mode attractor (0.1 à 1.5, défaut 0.6). */
  inflowSpeed?: number
  /** Dispersion chromatique RVB sur la couronne (0.0 à 1.0, défaut 0.35). */
  chromaticSplit?: number
  /** Échelle spatiale de l'effet (0.5 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse d'animation globale (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Réactivité à la souris et parallaxe (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Turbulence organique FBM (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Intensité de l'asymétrie lumineuse Doppler relativiste (0.0 à 1.8, défaut 1.0). */
  dopplerStrength?: number
  /** Puissance de la distorsion gravitationnelle du fond et des arcs d'Einstein (0.0 à 2.0, défaut 1.0). */
  lensingStrength?: number
  /** Acuité de l'anneau de photons autour de l'horizon des événements (0.4 à 2.0, défaut 1.0). */
  photonRingSharpness?: number
}

const LENS_MODE_MAP: Record<GravitationalLensMode, number> = {
  black_hole: 0,
  portal: 1,
  wormhole: 2,
  multilens: 3,
  weak_lensing: 4,
  attractor: 5,
}

export class GravitationalLensingInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'gravitational_lensing'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: GravitationalLensingProps
  private diskColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private coreColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: GravitationalLensingProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.diskColorVec = new THREE.Color(props.diskColor ?? '#fb923c')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#38bdf8')
    this.coreColorVec = new THREE.Color(props.coreColor ?? '#020308')

    const lensModeIdx = LENS_MODE_MAP[props.lensMode ?? 'black_hole'] ?? 0
    const coreRadius = props.coreRadius ?? 0.14
    const diskTilt = props.diskTilt ?? 0.22
    const einsteinRing = props.einsteinRing ?? 0.9
    const spiralTwist = props.spiralTwist ?? 1.2
    const rippleStrength = props.rippleStrength ?? 0.7
    const redshift = props.redshift ?? 0.25
    const arcCount = props.arcCount ?? 12
    const inflowSpeed = props.inflowSpeed ?? 0.6
    const chromaticSplit = props.chromaticSplit ?? 0.35
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.45
    const dopplerStrength = props.dopplerStrength ?? 1.0
    const lensingStrength = props.lensingStrength ?? 1.0
    const photonRingSharpness = props.photonRingSharpness ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uDiskColor: { value: this.diskColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uCoreColor: { value: this.coreColorVec },
        uUseCustomColors: { value: Boolean(props.diskColor || props.secondaryColor) },
        uLensMode: { value: lensModeIdx },
        uCoreRadius: { value: coreRadius },
        uDiskTilt: { value: diskTilt },
        uEinsteinRing: { value: einsteinRing },
        uSpiralTwist: { value: spiralTwist },
        uRippleStrength: { value: rippleStrength },
        uRedshift: { value: redshift },
        uArcCount: { value: arcCount },
        uInflowSpeed: { value: inflowSpeed },
        uChromaticSplit: { value: chromaticSplit },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uDopplerStrength: { value: dopplerStrength },
        uLensingStrength: { value: lensingStrength },
        uPhotonRingSharpness: { value: photonRingSharpness },
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
          gl_Position = vec4(position.xy, 0.9965, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uDiskColor;
        uniform vec3 uSecondaryColor;
        uniform vec3 uCoreColor;
        uniform bool uUseCustomColors;
        uniform int uLensMode;
        uniform float uCoreRadius;
        uniform float uDiskTilt;
        uniform float uEinsteinRing;
        uniform float uSpiralTwist;
        uniform float uRippleStrength;
        uniform float uRedshift;
        uniform float uArcCount;
        uniform float uInflowSpeed;
        uniform float uChromaticSplit;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uDopplerStrength;
        uniform float uLensingStrength;
        uniform float uPhotonRingSharpness;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}
        ${GLSL_VORONOI_2D}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        mat2 rot2(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        // Évalue une strate d'étoiles de fond dans le plan source (déformé par lentille gravitationnelle)
        // Retourne rgb = couleur stellaire (températures variées bleu-blanc / blanc / or)
        vec3 sampleStarField(vec2 srcP, float scale, float threshold, float t, float seed) {
          vec2 g = srcP * scale;
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float h = hash12(cell + seed);
          if (h < threshold) return vec3(0.0);

          vec2 j = hash22(cell + seed * 1.9 + 7.1) * 0.64 + 0.18;
          vec2 d = f - j;
          float dist2 = dot(d, d);
          float mag = pow(clamp((h - threshold) / max(0.01, 1.0 - threshold), 0.0, 1.0), 1.35);
          float core = exp(-dist2 * mix(420.0, 155.0, mag));
          float halo = exp(-dist2 * 45.0) * 0.22 * mag;
          float twinkle = 0.78 + 0.22 * sin(t * (1.2 + h * 2.1) + h * 37.0);

          // Température stellaire réaliste (bleu-blanc chaud, blanc pur, doré pâle)
          float temp = hash12(cell * 1.7 + seed + 31.4);
          vec3 starCol = mix(
            vec3(0.72, 0.86, 1.0),
            mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.82, 0.62), smoothstep(0.5, 1.0, temp)),
            smoothstep(0.0, 0.55, temp)
          );
          return starCol * (core + halo) * (0.45 + 0.85 * mag) * twinkle;
        }

        // Champ d'étoiles du fond courbé par l'équation de lentille gravitationnelle :
        // beta = theta - (R_E^2 / r^2) * theta -> étirement tangentiel naturel en arcs d'Einstein
        // + image secondaire inversée près de la sphère de photons
        vec3 lensedBackgroundStars(vec2 p, float r, float massR, float einsteinR, float lensPow, float t) {
          if (r < massR * 0.97) return vec3(0.0);
          float r2 = max(0.0008, r * r);
          float defl = clamp((einsteinR * einsteinR * lensPow) / r2, 0.0, 0.96);
          // Image primaire (extérieure à l'anneau d'Einstein)
          vec2 betaPrimary = p * (1.0 - defl);
          // Rotation très lente du fond stellaire
          vec2 drift = vec2(t * 0.008, -t * 0.004);

          vec3 col = sampleStarField(betaPrimary + drift, 16.0, 0.84, t, 13.7);
          if (uQualityLevel >= 2) {
            col += sampleStarField(betaPrimary * 1.37 - drift * 0.6, 25.0, 0.87, t, 47.3) * 0.72;
            // Arcs d'Einstein explicites : galaxies/étoiles lointaines alignées près de r ≈ einsteinR
            float ringZone = exp(-pow((r - einsteinR) / max(0.02, massR * 0.32), 2.0));
            if (ringZone > 0.02) {
              float ang = atan(p.y, p.x);
              // Petits arcs tangents asymétriques le long du rayon d'Einstein
              float arc1 = smoothstep(0.78, 0.98, sin(ang * 3.0 + 0.85 + snoise(vec2(ang * 2.0, t * 0.05)) * 0.35));
              float arc2 = smoothstep(0.84, 0.99, sin(ang * 5.0 - 2.1));
              float fineRad = exp(-pow((r - einsteinR * 1.02) / max(0.005, massR * 0.055), 2.0));
              float fineRad2 = exp(-pow((r - einsteinR * 0.96) / max(0.004, massR * 0.042), 2.0));
              col += vec3(0.78, 0.90, 1.0) * (arc1 * fineRad * 0.55 + arc2 * fineRad2 * 0.35) * uEinsteinRing * lensPow;
            }
          }

          // Amplification gravitationnelle (magnification proche de la courbe critique r ≈ einsteinR)
          float einsteinBoost = 1.0 + exp(-abs(r - einsteinR) * (10.5 / max(0.08, massR * 2.2))) * 1.15 * lensPow;
          float horizonFade = smoothstep(massR * 0.98, massR * 1.14, r);
          return col * einsteinBoost * horizonFade;
        }

        // Filaments képlériens cisaillés en spirales serrées dans le plasma du disque d'accrétion
        // Sans couture angulaire (évaluation sur cercle cos/sin) et rotation différentielle lente
        float keplerPlasma(float diskR, float diskAngle, float R, float t, float randAmt) {
          // Vitesse angulaire képlérienne : plus rapide au bord interne (ISCO), plus lente en périphérie
          float rNorm = max(0.35, diskR / max(0.06, R));
          float omega = 0.62 / pow(rNorm, 1.18);
          // Cisaillement différentiel modéré : étire les nuages de plasma en longs arcs concentriques
          float shearedAng = diskAngle - t * omega + log(rNorm) * (3.2 + randAmt * 1.8);

          // Bandes radiales multiples (anneaux d'accrétion chauds + sillons sombres de poussière)
          float logR = log(rNorm);
          float rings = 0.58 + 0.26 * sin(logR * 17.0 - t * 0.28) + 0.16 * sin(logR * 31.0 + 1.4);

          if (uQualityLevel == 0) {
            // Palier LOW : filaments cisaillés analytiques ultra-rapides (0 snoise)
            float fil1 = 0.5 + 0.5 * sin(shearedAng * 2.0 + logR * 5.0);
            float fil2 = 0.5 + 0.5 * sin(shearedAng * 3.0 - logR * 9.0 + t * 0.18);
            return clamp(rings * (0.55 + 0.55 * (fil1 * 0.65 + fil2 * 0.35)), 0.18, 1.35);
          }

          vec2 circCoord = vec2(cos(shearedAng), sin(shearedAng));
          vec2 p1 = circCoord * (1.55 + logR * 1.8) + vec2(logR * 2.8, t * 0.09);
          int octs = (uQualityLevel >= 2) ? 3 : 2;
          float n1 = fbm2D(p1, octs) * 0.5 + 0.5;

          float fineFil = 0.5;
          if (uQualityLevel >= 2) {
            vec2 p2 = vec2(cos(shearedAng * 2.0), sin(shearedAng * 2.0)) * (2.6 + logR * 2.4) + vec2(-t * 0.12, logR * 5.4);
            fineFil = snoise(p2) * 0.5 + 0.5;
            // Crêtes filamenteuses serrées
            fineFil = smoothstep(0.28, 0.85, fineFil);
          }

          float plasma = mix(0.55, 0.25 + n1 * 0.95 + fineFil * 0.42, 0.55 + randAmt * 0.45);
          return clamp(plasma * rings, 0.12, 1.55);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 centerShift = uMouse * (uDepth * 0.16) + vec2(0.0, -uScroll * uDepth * 0.08);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0) - centerShift;
          p /= max(0.4, uDensity);

          float r = length(p);
          float a = atan(p.y, p.x);
          // Rotation lente et organique
          float t = uTime * max(0.015, uSpeed);
          float lensPow = clamp(uLensingStrength, 0.0, 2.0);
          float doppPow = clamp(uDopplerStrength, 0.0, 1.8);
          float ringSharp = clamp(uPhotonRingSharpness, 0.4, 2.0);

          vec3 colDisk = uUseCustomColors ? uDiskColor : uPaletteAccent;
          vec3 colSec = uUseCustomColors ? uSecondaryColor : uPalettePrimary;
          vec3 hotWhite = vec3(1.0, 0.97, 0.92);
          vec3 hotBlueWhite = vec3(0.86, 0.94, 1.0);
          vec3 deepRedshift = vec3(0.72, 0.11, 0.04);

          // Échantillonnage du fond réel (FramebufferTexture en HIGH/MEDIUM) avec déflexion gravitationnelle
          vec4 warpedBg = vec4(0.0);
          bool useBgFbo = uHasScreenTex && uQualityLevel >= 1;
          if (useBgFbo) {
            float massR = max(0.06, uCoreRadius);
            float eRad = massR * (uLensMode == 0 ? 1.52 : 1.35);
            vec2 lensUv = uv;
            if (lensPow > 0.005 && uLensMode != 1) {
              float rSafe = max(massR * 0.88, r);
              // Déflexion gravitationnelle d'Einstein : courbe l'espace autour du centre de masse
              float pull = (eRad * eRad * 0.42 * lensPow) / (rSafe * rSafe + massR * massR * 0.18);
              pull = clamp(pull, 0.0, 0.82);
              vec2 screenDir = p * max(0.4, uDensity) / vec2(aspect, 1.0);
              lensUv = uv - screenDir * pull;
              // Légère torsion de l'espace (frame-dragging Kerr) en mode black_hole / wormhole
              if (uQualityLevel >= 2 && (uLensMode == 0 || uLensMode == 2)) {
                float drag = exp(-r / max(0.12, massR * 2.4)) * 0.12 * lensPow;
                vec2 tang = vec2(-screenDir.y * aspect, screenDir.x / aspect);
                lensUv += tang * drag;
              }
            }
            if (uQualityLevel >= 2 && uChromaticSplit > 0.02 && lensPow > 0.05 && uLensMode != 1) {
              vec2 dUv = (lensUv - uv) * (0.09 * uChromaticSplit);
              vec4 sR = texture2D(uScreenTex, clamp(lensUv + dUv, vec2(0.001), vec2(0.999)));
              vec4 sG = texture2D(uScreenTex, clamp(lensUv, vec2(0.001), vec2(0.999)));
              vec4 sB = texture2D(uScreenTex, clamp(lensUv - dUv, vec2(0.001), vec2(0.999)));
              warpedBg = vec4(sR.r, sG.g, sB.b, max(sG.a, max(sR.a, sB.a)));
            } else {
              warpedBg = texture2D(uScreenTex, clamp(lensUv, vec2(0.001), vec2(0.999)));
            }
          }

          vec3 finalCol = vec3(0.0);
          float finalAlpha = 0.0;
          float shadowOcc = 0.0;

          if (uLensMode == 0) {
            // === BLACK HOLE : Ombre relativiste + Anneau de photons + Disque courbé Doppler ===
            float R = max(0.06, uCoreRadius);
            float tilt = clamp(uDiskTilt, 0.06, 0.55);
            // Légère inclinaison cinématique de l'axe de rotation, réactive à la souris
            vec2 rp = rot2(-0.14 + uMouse.x * uDepth * 0.14) * p;
            float rr = length(rp);

            // 1. Disque équatorial principal (plan incliné)
            vec2 dp = vec2(rp.x, rp.y / tilt);
            float dr = length(dp);
            float da = atan(dp.y, dp.x);
            // Bord interne net (ISCO ~ 1.18 R), décroissance radiale douce vers 4.5 R
            float diskRadialEnv = smoothstep(R * 1.06, R * 1.38, dr) * smoothstep(R * 4.7, R * 1.75, dr);
            // Épaisseur verticale douce du disque (plus fin aux bords, plus dense au cœur)
            float diskHeightFade = exp(-pow(rp.y / max(0.012, R * tilt * 1.45), 2.0) * 0.35);
            // Partie avant du disque (rp.y <= 0 passe DEVANT l'ombre du trou noir)
            float frontMask = smoothstep(R * 0.08, -R * 0.10, rp.y);
            // Partie arrière hors ombre
            float backOutsideMask = smoothstep(R * 0.98, R * 1.15, rr) * (1.0 - frontMask);
            float eqDiskMask = diskRadialEnv * diskHeightFade * max(frontMask, backOutsideMask);

            // 2. Arches gravitationnelles supérieure et inférieure (face arrière du disque déviée par la gravité)
            // L'arche supérieure s'élève au-dessus de l'ombre ; l'arche inférieure (image inversée du dessous)
            // embrasse le bas de l'ombre plus étroitement, en continuité avec les ailes équatoriales.
            float upperFactor = smoothstep(-0.08, 0.22, rp.y / max(0.005, rr));
            float lowerFactor = smoothstep(0.08, -0.26, rp.y / max(0.005, rr));
            // Rayon apparent de l'arche au-dessus / au-dessous de la sphère de photons
            float archPeakR = mix(R * 1.12, R * (1.28 + tilt * 0.55), upperFactor);
            float archWidth = mix(R * 0.16, R * (0.34 + tilt * 0.45), upperFactor);
            float upperArch = exp(-pow((rr - archPeakR) / max(0.015, archWidth), 2.0))
              * smoothstep(R * 0.99, R * 1.07, rr)
              * upperFactor
              * (0.68 + 0.32 * smoothstep(0.0, 0.65, abs(rp.y) / max(0.01, rr)));
            // Arche inférieure plus fine et légèrement plus discrète
            float lowerArch = exp(-pow((rr - R * 1.09) / max(0.012, R * 0.14), 2.0))
              * smoothstep(R * 0.99, R * 1.05, rr)
              * lowerFactor
              * 0.52;
            float lensedArchMask = max(upperArch, lowerArch);

            // Coordonnées de plasma dans le disque (équatorial + face arrière lentillée)
            float plasmaFront = keplerPlasma(dr, da, R, t * 0.85, uRandomness);
            // Pour l'arche lentillée, on remappe rr vers un rayon radial de disque cohérent
            float backDiskR = R * 1.25 + max(0.0, rr - R * 1.02) * (2.6 / max(0.25, tilt * 2.5));
            float backDiskAng = atan(sign(rp.y) * max(0.15, abs(rp.y)), rp.x);
            float plasmaArch = (uQualityLevel >= 1)
              ? keplerPlasma(backDiskR, backDiskAng, R, t * 0.85, uRandomness)
              : plasmaFront;

            // 3. Effet Doppler relativiste (côté gauche en approche -> beaucoup plus lumineux et chaud ;
            // côté droit fuyant -> atténué et décalé vers le rouge)
            float xProj = clamp(-rp.x / max(R * 1.05, rr), -1.0, 1.0);
            // Plus fort près du rayon interne (vitesse orbitale relativiste plus élevée)
            float innerVelBoost = mix(0.65, 1.15, smoothstep(R * 3.8, R * 1.15, min(dr, rr)));
            float betaCos = xProj * (0.42 * doppPow) * innerVelBoost;
            // Relativistic beaming ~ (1 + beta*cos)^3 (calibré pour ne pas saturer l'UI)
            float dopplerLum = clamp(pow(max(0.32, 1.0 + betaCos), 2.55), 0.24, 2.25);

            // Décalage chromatique Doppler : côté approchant vers blanc-or / léger bleu-blanc,
            // côté fuyant vers ambre profond / rouge sombre
            float approachAmt = smoothstep(0.0, 0.85, xProj) * min(1.3, doppPow);
            float recedeAmt = smoothstep(0.0, 0.92, -xProj) * (0.35 + uRedshift * 0.95) * min(1.3, doppPow);
            vec3 diskTempCol = mix(colDisk, mix(hotWhite, hotBlueWhite, 0.28), clamp(approachAmt * 0.58, 0.0, 0.72));
            diskTempCol = mix(diskTempCol, deepRedshift, clamp(recedeAmt * 0.78, 0.0, 0.86));

            // Température radiale : cœur interne près de l'ISCO plus blanc-chaud que l'extérieur
            float innerHeat = smoothstep(R * 2.8, R * 1.12, min(dr, rr));
            diskTempCol = mix(diskTempCol, hotWhite, innerHeat * 0.34);

            float eqIntensity = eqDiskMask * plasmaFront * dopplerLum * 1.12;
            float archIntensity = lensedArchMask * plasmaArch * mix(1.0, dopplerLum, 0.72) * 0.95;
            float totalDisk = eqIntensity + archIntensity * (1.0 - clamp(eqIntensity * 0.55, 0.0, 0.75));

            // 4. Anneau de photons (photon ring) ultra-fin à la limite de l'ombre (r ≈ 1.015 R)
            float fw = max(0.0012, fwidth(rr));
            float sharpFactor = 1.0 / max(0.45, ringSharp);
            float photonCore = exp(-pow((rr - R * 1.018) / max(fw * 1.6, R * 0.022 * sharpFactor), 2.0));
            // Second sous-anneau n=1 légèrement asymétrique par effet Doppler
            float photonSub = exp(-pow((rr - R * 1.052) / max(fw * 2.6, R * 0.048 * sharpFactor), 2.0)) * 0.52;
            float photonRing = (photonCore * 1.45 + photonSub) * uEinsteinRing * mix(0.75, 1.38, clamp(dopplerLum * 0.55, 0.0, 1.0));

            // Couronne gravitationnelle diffuse
            float corona = exp(-max(0.0, rr - R) * (4.6 / max(0.10, R * 6.0))) * 0.26 * uEinsteinRing;

            // Dispersion chromatique prismatique sur l'anneau en HIGH
            vec3 chromaCol = vec3(0.0);
            if (uQualityLevel >= 2 && uChromaticSplit > 0.01) {
              float cShift = R * 0.028 * uChromaticSplit;
              float ringR = exp(-pow((rr - (R * 1.02 + cShift)) / max(fw * 2.2, R * 0.032), 2.0));
              float ringB = exp(-pow((rr - (R * 1.02 - cShift)) / max(fw * 2.2, R * 0.032), 2.0));
              chromaCol = vec3(ringR * 0.42, 0.0, ringB * 0.48) * uChromaticSplit * uEinsteinRing;
            }

            // 5. Étoiles du fond déformées en arcs d'Einstein autour de l'ombre
            float einsteinR = R * 1.54;
            vec3 lensedStars = lensedBackgroundStars(rp, rr, R, einsteinR, lensPow, t);

            // 6. Ombre de l'horizon des événements (occultation totale sauf la tranche avant du disque)
            float shadowEdge = 1.0 - smoothstep(R * 0.985, R * 1.015 + fw * 1.2, rr);
            // La bande avant du disque équatorial passe DEVANT l'ombre
            float frontDiskOcclude = clamp(frontMask * diskRadialEnv * plasmaFront * 1.35, 0.0, 0.96);
            shadowOcc = shadowEdge * (1.0 - frontDiskOcclude);

            vec3 plasmaCol = mix(diskTempCol, hotWhite, clamp(totalDisk * 0.36 + photonCore * 0.65, 0.0, 0.88));
            vec3 photonCol = mix(mix(colDisk, hotWhite, 0.72), hotBlueWhite, approachAmt * 0.35);
            vec3 coronaCol = mix(colDisk, colSec, 0.28) * corona;

            vec3 lightSum = (
              plasmaCol * totalDisk
              + photonCol * photonRing
              + coronaCol
              + chromaCol
              + lensedStars * 0.95
            ) * uIntensity;

            // Masque l'arrière-plan réel dans l'ombre du trou noir
            float bgMask = 1.0 - shadowEdge * 0.98;
            vec3 starVis = lensedStars * uIntensity * (1.0 - shadowEdge);
            float fgAlpha = clamp(
              max(
                shadowOcc * 0.99,
                clamp((totalDisk * 0.78 + photonRing * 0.95 + corona * 0.75 + length(starVis) * 0.45) * uIntensity, 0.0, 0.96)
              ),
              0.0,
              0.99
            );
            vec3 fgCol = mix(lightSum, uCoreColor, shadowOcc);

            if (useBgFbo) {
              // Composition prémultipliée cohérente avec NormalBlending (OneFactor / ZeroFactor)
              vec3 bgRgb = warpedBg.rgb * bgMask;
              float bgA = warpedBg.a * bgMask;
              float diskOcc = clamp(shadowOcc + totalDisk * 0.42, 0.0, 0.99);
              vec3 compRgb = bgRgb * (1.0 - diskOcc) + fgCol * fgAlpha;
              float outA = clamp(fgAlpha + bgA * (1.0 - fgAlpha), 0.0, 0.99);
              gl_FragColor = vec4(compRgb, outA);
              return;
            }

            finalCol = fgCol;
            finalAlpha = fgAlpha;

          } else if (uLensMode == 1) {
            // === PORTAL : Rideau aquatique Cherenkov circulaire (Stargate) ===
            float R = max(0.14, uCoreRadius);
            float inside = 1.0 - smoothstep(R - 0.014, R + 0.01, r);

            vec2 portalWarp = p + vec2(
              snoise(p * 7.5 + vec2(t * 0.4, 1.3)),
              snoise(p * 7.5 + vec2(-t * 0.35, 5.7))
            ) * (0.018 * uRippleStrength);
            float wr = length(portalWarp);
            float wave = sin(wr * 36.0 - t * 4.2) * 0.5 + 0.5;
            float caustic = wave * 0.38;
            if (uQualityLevel >= 1) {
              vec2 v = voronoi2D(portalWarp * 10.5 + vec2(0.0, t * 0.32), t * 1.3);
              float edge = smoothstep(0.02, 0.28, v.y - v.x);
              caustic = mix(1.0 - edge, wave, 0.32) * (0.55 + uRippleStrength * 0.55);
            }
            float radialDepth = smoothstep(0.0, R, r);
            float clampedCaustic = clamp(caustic, 0.0, 1.0);
            float rim = exp(-abs(r - R) * 44.0) * (0.95 + uEinsteinRing * 0.45);
            float outerAura = exp(-max(0.0, r - R) * 10.0) * 0.38;

            vec3 deepTone = colSec * 0.22;
            vec3 poolCol = mix(deepTone, colDisk * 0.85, clampedCaustic * (0.55 + 0.45 * radialDepth));
            poolCol = mix(poolCol, mix(colSec, hotWhite, 0.65), pow(clampedCaustic, 3.8) * 0.52);

            finalCol = (poolCol * inside * 0.90 + mix(colDisk, hotWhite, 0.42) * rim + colDisk * outerAura) * min(1.35, uIntensity);
            finalAlpha = clamp((inside * 0.86 + rim + outerAura) * uIntensity, 0.0, 0.94);

          } else if (uLensMode == 2) {
            // === WORMHOLE : Vortex spatio-temporel en spirale (TARDIS) ===
            float invR = 1.0 / max(0.06, r + 0.04);
            float spiralAngle = a + invR * (0.55 * uSpiralTwist) - t * 1.1;
            float arms = sin(spiralAngle * 4.0) * 0.5 + 0.5;
            float n = 0.5;
            if (uQualityLevel >= 1) {
              n = fbm2D(vec2(spiralAngle * 1.6, invR * 0.7 - t * 1.3), uQualityLevel >= 2 ? 3 : 2) * 0.5 + 0.5;
            }
            float tunnel = (arms * 0.55 + n * 0.75) * smoothstep(0.02, 0.14, r) * exp(-r * 1.45);
            float coreBeacon = exp(-r * 14.0) * (0.75 + 0.25 * sin(t * 3.2));
            vec3 stars = (uQualityLevel >= 1) ? lensedBackgroundStars(p, r, 0.08, 0.22, lensPow, t) * 0.75 : vec3(0.0);

            vec3 vortexCol = mix(colDisk, colSec, clamp(n * 1.15 - 0.15, 0.0, 1.0));
            finalCol = (vortexCol * tunnel * 1.15 + hotWhite * coreBeacon + stars) * uIntensity;
            finalAlpha = clamp((tunnel * 0.82 + coreBeacon + length(stars) * 0.4) * uIntensity, 0.0, 0.92);

          } else if (uLensMode == 3) {
            // === MULTILENS : Carrousel de lentilles dimensionnelles (Multiverse) ===
            vec3 acc = vec3(0.0);
            float aSum = 0.0;
            int lenses = (uQualityLevel == 0) ? 2 : 3;
            for (int i = 0; i < 3; i++) {
              if (i >= lenses) break;
              float fi = float(i);
              float orbitA = t * (0.35 + fi * 0.17) + fi * 2.094;
              float orbitR = 0.18 + fi * 0.06;
              vec2 lc = vec2(cos(orbitA) * orbitR * 1.3, sin(orbitA) * orbitR * 0.85);
              float lr = length(p - lc);
              float lRad = 0.11 + 0.025 * sin(t * 0.9 + fi * 2.0);

              float ring = exp(-abs(lr - lRad) * 44.0) * (0.85 + uEinsteinRing * 0.35);
              float splitR = exp(-abs(lr - (lRad + 0.008 * uChromaticSplit)) * 42.0) * uChromaticSplit * 0.55;
              float splitB = exp(-abs(lr - (lRad - 0.008 * uChromaticSplit)) * 42.0) * uChromaticSplit * 0.55;
              float glass = (1.0 - smoothstep(lRad - 0.01, lRad + 0.01, lr)) * 0.22;

              vec3 lCol = (mod(fi, 2.0) < 0.5) ? colDisk : colSec;
              acc += lCol * (ring + glass) + vec3(splitR, 0.0, splitB);
              aSum += ring * 0.78 + glass;
            }
            float centerVortex = exp(-r * 6.5) * 0.45;
            acc += mix(colDisk, colSec, 0.5) * centerVortex;
            aSum += centerVortex * 0.6;
            finalCol = acc * uIntensity;
            finalAlpha = clamp(aSum * uIntensity, 0.0, 0.9);

          } else if (uLensMode == 4) {
            // === WEAK_LENSING : Arcs d'Einstein & filaments sombres (Dark Matter) ===
            float arcs = 0.0;
            float count = max(4.0, uArcCount);
            for (int i = 0; i < 16; i++) {
              if (float(i) >= count) break;
              float fi = float(i);
              float h1 = hash12(vec2(fi, 3.7));
              float h2 = hash12(vec2(fi + 11.1, 8.3));
              float ringRad = 0.10 + h1 * 0.42;
              float startA = h2 * TAU + t * (0.14 + h1 * 0.14) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
              float angDiff = atan(sin(a - startA), cos(a - startA));
              float arcSpan = 0.28 + h2 * 0.45;
              float inSpan = 1.0 - smoothstep(arcSpan * 0.5, arcSpan, abs(angDiff));
              float inRad = exp(-abs(r - ringRad) * 65.0);
              arcs += inSpan * inRad * (0.6 + 0.4 * sin(t * 1.4 + fi * 2.1));
            }
            float web = 0.0;
            if (uQualityLevel >= 1) {
              float n = abs(snoise(p * 4.5 + vec2(t * 0.12, -t * 0.09)));
              web = exp(-n * 11.0) * exp(-r * 1.5) * 0.65;
            }
            vec3 stars = (uQualityLevel >= 1) ? lensedBackgroundStars(p, r, 0.08, 0.24, lensPow, t) * 0.9 : vec3(0.0);
            finalCol = (colDisk * (arcs * 0.9 + web) + mix(colSec, hotWhite, 0.4) * (arcs * 0.35) + stars) * uIntensity;
            finalAlpha = clamp((arcs * 0.72 + web * 0.55 + length(stars) * 0.4) * uIntensity, 0.0, 0.88);

          } else {
            // === ATTRACTOR : Flux centripète de superamas (The Great Attractor) ===
            float streamCount = max(6.0, uArcCount);
            float twistA = a + log(max(0.03, r)) * (0.85 * uSpiralTwist);
            float lanes = pow(0.5 + 0.5 * sin(twistA * streamCount * 0.5), 4.0);
            float inflow = fract(r * 3.2 + t * uInflowSpeed);
            float packets = pow(smoothstep(0.0, 0.5, inflow) * smoothstep(1.0, 0.45, inflow), 1.6);
            float fbmMod = 1.0;
            if (uQualityLevel >= 1) {
              fbmMod = 0.55 + 0.75 * (snoise(vec2(twistA * 2.0, r * 5.0 + t * uInflowSpeed * 2.0)) * 0.5 + 0.5);
            }
            float flow = lanes * (0.35 + 0.85 * packets) * fbmMod * smoothstep(0.02, 0.12, r) * exp(-r * 1.15);
            float coreGlow = exp(-r * 9.5) * 0.95;

            vec3 streamCol = mix(colDisk, colSec, clamp(r * 1.2, 0.0, 0.75));
            finalCol = (streamCol * flow * 1.25 + mix(colDisk, hotWhite, 0.55) * coreGlow) * uIntensity;
            finalAlpha = clamp((flow * 0.78 + coreGlow * 0.8) * uIntensity, 0.0, 0.92);
          }

          if (useBgFbo) {
            vec3 compRgb = warpedBg.rgb * (1.0 - finalAlpha) + finalCol * finalAlpha;
            float compA = clamp(finalAlpha + warpedBg.a * (1.0 - finalAlpha), 0.0, 1.0);
            gl_FragColor = vec4(compRgb, compA);
            return;
          }

          if (finalAlpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalCol, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -35

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

  public updateProps(newProps: Partial<GravitationalLensingProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.diskColor !== undefined) {
      this.diskColorVec.set(newProps.diskColor)
      this.material.uniforms.uDiskColor.value = this.diskColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.coreColor !== undefined) {
      this.coreColorVec.set(newProps.coreColor)
      this.material.uniforms.uCoreColor.value = this.coreColorVec
    }
    if (newProps.lensMode !== undefined) {
      this.material.uniforms.uLensMode.value = LENS_MODE_MAP[newProps.lensMode] ?? 0
    }
    if (newProps.coreRadius !== undefined)
      this.material.uniforms.uCoreRadius.value = newProps.coreRadius
    if (newProps.diskTilt !== undefined) this.material.uniforms.uDiskTilt.value = newProps.diskTilt
    if (newProps.einsteinRing !== undefined)
      this.material.uniforms.uEinsteinRing.value = newProps.einsteinRing
    if (newProps.spiralTwist !== undefined)
      this.material.uniforms.uSpiralTwist.value = newProps.spiralTwist
    if (newProps.rippleStrength !== undefined)
      this.material.uniforms.uRippleStrength.value = newProps.rippleStrength
    if (newProps.redshift !== undefined) this.material.uniforms.uRedshift.value = newProps.redshift
    if (newProps.arcCount !== undefined) this.material.uniforms.uArcCount.value = newProps.arcCount
    if (newProps.inflowSpeed !== undefined)
      this.material.uniforms.uInflowSpeed.value = newProps.inflowSpeed
    if (newProps.chromaticSplit !== undefined)
      this.material.uniforms.uChromaticSplit.value = newProps.chromaticSplit
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.dopplerStrength !== undefined)
      this.material.uniforms.uDopplerStrength.value = newProps.dopplerStrength
    if (newProps.lensingStrength !== undefined)
      this.material.uniforms.uLensingStrength.value = newProps.lensingStrength
    if (newProps.photonRingSharpness !== undefined)
      this.material.uniforms.uPhotonRingSharpness.value = newProps.photonRingSharpness
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    if (quality === 'LOW' && this.frameTex) {
      this.frameTex.dispose()
      this.frameTex = null
      this.material.uniforms.uScreenTex.value = null
      this.material.uniforms.uHasScreenTex.value = false
      this.material.blending = THREE.NormalBlending
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

export const GravitationalLensingDefinition: IBrickDefinition<GravitationalLensingProps> = {
  type: 'gravitational_lensing',
  category: 'special',
  create: (id, props, context) => new GravitationalLensingInstance(id, props, context),
}

BrickRegistry.register(GravitationalLensingDefinition)
