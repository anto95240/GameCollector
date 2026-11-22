/**
 * src/theme-engine/bricks/special/GravitationalLensingBrick.ts
 *
 * Brique Spéciale : Lentille Gravitationnelle, Trou Noir & Vortex (Couche : Spéciaux).
 * Shader analytique autonome SANS FBO (1 seul draw call GPU) simulant :
 * - Trou noir + disque d'accrétion courbé + anneau d'Einstein + effet Doppler/redshift ('black_hole')
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
  private scene: THREE.Scene
  private props: GravitationalLensingProps
  private diskColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private coreColorVec: THREE.Color

  constructor(id: string, props: GravitationalLensingProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}
        ${GLSL_VORONOI_2D}

        mat2 rot2(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        // Micro-champ d'étoiles interne déformé en arcs d'Einstein autour d'une masse
        float lensedStarArcs(vec2 p, float r, float massR, float t) {
          if (r < massR * 0.95) return 0.0;
          float deflect = (massR * massR) / max(0.012, r * r);
          vec2 warped = p * (1.0 - clamp(deflect * 0.65, 0.0, 0.85));
          vec2 grid = warped * 14.0;
          vec2 cell = floor(grid);
          float h = hash12(cell + 19.3);
          if (h < 0.84) return 0.0;
          vec2 jitter = hash22(cell + 41.7) * 0.6 + 0.2;
          float d = length(fract(grid) - jitter);
          float twinkle = 0.65 + 0.35 * sin(t * 2.5 + h * 25.0);
          // Étirement tangentiel près de l'anneau d'Einstein
          float ringBoost = 1.0 + exp(-abs(r - massR * 1.45) * 14.0) * 1.4;
          return smoothstep(0.11, 0.0, d) * twinkle * ringBoost * smoothstep(massR * 0.95, massR * 1.2, r);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Déplacement de l'épicentre avec la souris et le scroll
          vec2 centerShift = uMouse * (uDepth * 0.16) + vec2(0.0, -uScroll * uDepth * 0.08);
          p -= centerShift;
          p /= max(0.4, uDensity);

          float r = length(p);
          float a = atan(p.y, p.x);
          float t = uTime * max(0.02, uSpeed);

          vec3 colDisk = uUseCustomColors ? uDiskColor : uPaletteAccent;
          vec3 colSec = uUseCustomColors ? uSecondaryColor : uPalettePrimary;
          vec3 hotWhite = vec3(1.0, 0.97, 0.9);

          vec3 finalCol = vec3(0.0);
          float finalAlpha = 0.0;

          if (uLensMode == 0) {
            // === BLACK HOLE : Horizon + Sphère de photons + Disque d'accrétion courbé ===
            float R = max(0.06, uCoreRadius);
            vec2 rp = rot2(-0.14 + uMouse.x * uDepth * 0.15) * p;
            float rr = length(rp);

            // Disque équatorial incliné (devant et côtés)
            vec2 dp = vec2(rp.x, rp.y / max(0.08, uDiskTilt));
            float dr = length(dp);
            float da = atan(dp.y, dp.x);
            float diskBand = smoothstep(R * 1.05, R * 1.55, dr) * smoothstep(R * 4.4, R * 1.85, dr);

            // Arche gravitationnelle supérieure & inférieure (face arrière du disque courbée par la lentille)
            float archR = abs(rr - R * 1.24);
            float archMask = exp(-archR * (22.0 / max(0.4, uDiskTilt * 4.0))) * smoothstep(0.0, 0.35, abs(rp.y) / max(0.01, rr));

            // Turbulence képlérienne FBM dans le plasma du disque
            float swirl = 1.0;
            if (uQualityLevel >= 1) {
              float spinAngle = da - t * (1.8 / max(0.25, dr));
              vec2 noiseCoord = vec2(cos(spinAngle) * dr * 5.0, sin(spinAngle) * dr * 5.0 + t * 0.4);
              int octs = (uQualityLevel >= 2) ? 3 : 2;
              float n = fbm2D(noiseCoord, octs) * 0.5 + 0.5;
              swirl = mix(0.6, 0.35 + n * 1.35, 0.55 + uRandomness * 0.45);
            }

            // Asymétrie Doppler (côté gauche en approche plus lumineux, côté droit redshifté)
            float doppler = clamp(0.75 - rp.x * (1.1 + uRedshift * 0.9), 0.35, 1.55);
            vec3 shiftedDisk = mix(colDisk, vec3(0.85, 0.12, 0.08), clamp(uRedshift * (0.4 + rp.x * 1.4), 0.0, 0.85));

            float diskGlow = (diskBand * 1.15 + archMask * 0.95) * swirl * doppler;

            // Anneau d'Einstein / sphère de photons ultra-net
            float photonRing = exp(-abs(rr - R * 1.04) * 58.0) * uEinsteinRing * 1.45;
            // Halo de couronne lointaine
            float corona = exp(-max(0.0, rr - R) * 4.2) * 0.35 * uEinsteinRing;

            // Masque d'occlusion de la sphère noire (laisse passer la portion avant du disque)
            float frontDisk = smoothstep(-0.04, 0.06, -rp.y) * smoothstep(R * 1.4, R * 0.8, abs(rp.y / max(0.08, uDiskTilt)));
            float shadow = 1.0 - smoothstep(R * 0.96, R * 1.03, rr);

            vec3 plasmaCol = mix(shiftedDisk, hotWhite, clamp(diskGlow * 0.55 + photonRing * 0.65, 0.0, 0.88));
            vec3 ringCol = mix(colDisk, colSec, 0.25) * corona;

            // Dispersion chromatique sur l'anneau en HIGH
            if (uQualityLevel >= 2 && uChromaticSplit > 0.01) {
              float ringR = exp(-abs(rr - R * 1.07) * 52.0) * uChromaticSplit * 0.5;
              float ringB = exp(-abs(rr - R * 1.01) * 52.0) * uChromaticSplit * 0.5;
              ringCol += vec3(ringR, 0.0, ringB) * uEinsteinRing;
            }

            // Micro-étoiles déformées autour du trou noir
            float stars = (uQualityLevel >= 1) ? lensedStarArcs(rp, rr, R, t) * 0.7 : 0.0;

            vec3 lightSum = (plasmaCol * diskGlow + hotWhite * photonRing + ringCol + mix(hotWhite, colSec, 0.4) * stars) * uIntensity;
            // Le cœur noir occulte l'arrière-plan sauf sur la bande frontale du disque
            float occludeShadow = shadow * (1.0 - clamp(frontDisk * diskBand * 1.3, 0.0, 0.92));
            finalCol = mix(lightSum, uCoreColor, occludeShadow);
            finalAlpha = clamp(max(occludeShadow * 0.98, clamp((diskGlow * 0.75 + photonRing + corona + stars * 0.5) * uIntensity, 0.0, 0.95)), 0.0, 0.98);

          } else if (uLensMode == 1) {
            // === PORTAL : Rideau aquatique Cherenkov circulaire (Stargate) ===
            float R = max(0.14, uCoreRadius);
            float inside = 1.0 - smoothstep(R - 0.014, R + 0.01, r);

            // Caustiques Voronoi + ondes concentriques organiques (domain warp anti-symétrie)
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
            // Contraste aquatique maîtrisé (évite la surexposition blanche au centre)
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
            float spiralAngle = a + invR * (0.55 * uSpiralTwist) - t * 1.4;
            float arms = sin(spiralAngle * 4.0) * 0.5 + 0.5;
            float n = 0.5;
            if (uQualityLevel >= 1) {
              n = fbm2D(vec2(spiralAngle * 1.6, invR * 0.7 - t * 1.6), uQualityLevel >= 2 ? 3 : 2) * 0.5 + 0.5;
            }
            float tunnel = (arms * 0.55 + n * 0.75) * smoothstep(0.02, 0.14, r) * exp(-r * 1.45);
            float coreBeacon = exp(-r * 14.0) * (0.75 + 0.25 * sin(t * 3.8));
            float stars = (uQualityLevel >= 2) ? lensedStarArcs(p, r, 0.12, t) * 0.65 : 0.0;

            vec3 vortexCol = mix(colDisk, colSec, clamp(n * 1.15 - 0.15, 0.0, 1.0));
            finalCol = (vortexCol * tunnel * 1.15 + hotWhite * coreBeacon + colSec * stars) * uIntensity;
            finalAlpha = clamp((tunnel * 0.82 + coreBeacon + stars * 0.5) * uIntensity, 0.0, 0.92);

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
            // Vortex central discret
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
              float startA = h2 * 6.283 + t * (0.18 + h1 * 0.18) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
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
            float stars = (uQualityLevel >= 2) ? lensedStarArcs(p, r, 0.16, t) * 0.85 : 0.0;
            finalCol = (colDisk * (arcs * 0.9 + web) + mix(colSec, hotWhite, 0.4) * (arcs * 0.35 + stars)) * uIntensity;
            finalAlpha = clamp((arcs * 0.72 + web * 0.55 + stars * 0.5) * uIntensity, 0.0, 0.88);

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

export const GravitationalLensingDefinition: IBrickDefinition<GravitationalLensingProps> = {
  type: 'gravitational_lensing',
  category: 'special',
  create: (id, props, context) => new GravitationalLensingInstance(id, props, context),
}

BrickRegistry.register(GravitationalLensingDefinition)
