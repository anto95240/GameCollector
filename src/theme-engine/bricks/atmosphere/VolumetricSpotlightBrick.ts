/**
 * src/theme-engine/bricks/atmosphere/VolumetricSpotlightBrick.ts
 *
 * Brique d'ambiance Atmosphérique : Projecteur Volumétrique Orientable (Couche 4 : Atmosphere).
 * Simule 1 ou 2 faisceaux coniques volumétriques perçant la brume ou la nuit
 * (projecteur anti-aérien, phares jumeaux, lampe torche, faisceau d'hélicoptère,
 * cône de surveillance, gyrophare à travers stores).
 *
 * Mouvement non-linéaire (harmoniques irrationnelles + Simplex), poussières
 * volumétriques FBM éclairées dans le cône, réactivité souris/scroll,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type SpotlightOriginMode =
  | 'bottom'
  | 'top'
  | 'top_left'
  | 'top_right'
  | 'side'
  | 'front_spot'
  | 'mouse_follow'

export interface VolumetricSpotlightProps {
  /** Teinte principale du faisceau lumineux (défaut #facc15 ou uPaletteAccent). */
  beamColor?: string
  /** Teinte secondaire pour le 2e faisceau en mode double (ex: gyrophare rouge/bleu). */
  secondaryColor?: string
  /** Nombre de faisceaux (1 ou 2, défaut 1). */
  beamCount?: number
  /** Origine et comportement d'orientation du projecteur (défaut 'bottom'). */
  originMode?: SpotlightOriginMode
  /** Ouverture angulaire du cône en radians (0.10 à 0.60, défaut 0.26). */
  coneAngle?: number
  /** Amplitude du balayage angulaire en radians (0.0 à 0.9, défaut 0.35). */
  sweepRange?: number
  /** Cadence de balayage non-linéaire (0.0 à 2.0, défaut 0.25). */
  sweepSpeed?: number
  /** Douceur des bordures du cône (0.05 à 0.6, défaut 0.28). */
  edgeSoftness?: number
  /** Densité de la brume/poussière volumétrique éclairée dans le faisceau (0.0 à 1.0, défaut 0.55). */
  volumetricNoise?: number
  /** Intensité du vacillement organique type lampe torche (0.0 à 1.0, défaut 0.0). */
  flicker?: number
  /** Masque d'ombres de stores vénitiens / grilles (0.0 à 1.0, défaut 0.0). */
  slatMask?: number
  /** Densité et portée du faisceau (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Facteur de vitesse global (0.0 à 2.0, défaut 0.3). */
  speed?: number
  /** Profondeur et sensibilité à la parallaxe souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Irrégularité et turbulence organique (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Densité des grains de poussière illuminés en suspension dans le faisceau (0.0 à 1.5, défaut 0.65). */
  dustDensity?: number
  /** Intensité de la tache d'impact elliptique au sol cohérente avec le cône (0.0 à 1.5, défaut 0.85). */
  groundSpot?: number
  /** Hauteur relative du plan d'impact au sol pour les faisceaux descendants (-0.5 à 0.1, défaut -0.34). */
  groundLevel?: number
}

const ORIGIN_MODE_MAP: Record<SpotlightOriginMode, number> = {
  bottom: 0,
  top: 1,
  top_left: 2,
  top_right: 3,
  side: 4,
  front_spot: 5,
  mouse_follow: 6,
}

export class VolumetricSpotlightInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'volumetric_spotlight'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: VolumetricSpotlightProps
  private beamColorVec: THREE.Color
  private secondaryColorVec: THREE.Color

  constructor(id: string, props: VolumetricSpotlightProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.beamColorVec = new THREE.Color(props.beamColor ?? '#facc15')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? props.beamColor ?? '#facc15')

    const beamCount = Math.min(2, Math.max(1, Math.round(props.beamCount ?? 1)))
    const originModeIdx = ORIGIN_MODE_MAP[props.originMode ?? 'bottom'] ?? 0
    const coneAngle = props.coneAngle ?? 0.26
    const sweepRange = props.sweepRange ?? 0.35
    const sweepSpeed = props.sweepSpeed ?? 0.25
    const edgeSoftness = props.edgeSoftness ?? 0.28
    const volumetricNoise = props.volumetricNoise ?? 0.55
    const flicker = props.flicker ?? 0.0
    const slatMask = props.slatMask ?? 0.0
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const dustDensity = props.dustDensity ?? 0.65
    const groundSpot = props.groundSpot ?? 0.85
    const groundLevel = props.groundLevel ?? -0.34

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uBeamColor: { value: this.beamColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColor: { value: Boolean(props.beamColor) },
        uUseSecondaryColor: { value: Boolean(props.secondaryColor) },
        uBeamCount: { value: beamCount },
        uOriginMode: { value: originModeIdx },
        uConeAngle: { value: coneAngle },
        uSweepRange: { value: sweepRange },
        uSweepSpeed: { value: sweepSpeed },
        uEdgeSoftness: { value: edgeSoftness },
        uVolumetricNoise: { value: volumetricNoise },
        uFlicker: { value: flicker },
        uSlatMask: { value: slatMask },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uDustDensity: { value: dustDensity },
        uGroundSpot: { value: groundSpot },
        uGroundLevel: { value: groundLevel },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.981, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPaletteAccent;
        uniform vec3 uBeamColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColor;
        uniform bool uUseSecondaryColor;
        uniform int uBeamCount;
        uniform int uOriginMode;
        uniform float uConeAngle;
        uniform float uSweepRange;
        uniform float uSweepSpeed;
        uniform float uEdgeSoftness;
        uniform float uVolumetricNoise;
        uniform float uFlicker;
        uniform float uSlatMask;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uDustDensity;
        uniform float uGroundSpot;
        uniform float uGroundLevel;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Balayage lent et fluide avec décélération aux extrêmes (inertie de projecteur)
        float organicSweep(float t, float seed) {
          float w1 = sin(t * 0.72 + seed * 4.7);
          float w2 = sin(t * 1.1680 + seed * 9.1) * 0.42;
          float w3 = sin(t * 0.4142 - seed * 2.3) * 0.34;
          float n = snoise(vec2(t * 0.18 + seed * 5.0, seed * 3.1)) * (0.42 * uRandomness);
          float raw = (w1 + w2 + w3) * 0.56 + n;
          return clamp(raw - 0.14 * sin(raw * 1.85), -1.15, 1.15);
        }

        // Grains de poussière en suspension strictement confinés dans les cellules (sans coupure de bord)
        float dustMotes(vec2 coord, float cellScale, float tAir, float seed) {
          vec2 g = coord * cellScale;
          vec2 cell = floor(g);
          vec2 f = fract(g);
          vec2 rnd = hash22(cell + vec2(seed * 17.3, seed * 9.7));
          float exists = step(0.40, rnd.x);
          vec2 drift = vec2(
            sin(tAir * (0.42 + rnd.y * 0.55) + rnd.x * 6.2831),
            cos(tAir * (0.34 + rnd.x * 0.48) + rnd.y * 6.2831)
          ) * 0.16;
          vec2 pos = 0.28 + 0.44 * rnd + drift;
          float d = length(f - pos);
          float r = 0.036 + 0.056 * fract(rnd.x * 13.7);
          float glint = 0.28 + 0.72 * pow(0.5 + 0.5 * sin(tAir * (1.1 + rnd.y * 2.1) + rnd.x * 21.0), 3.0);
          return exists * smoothstep(r, r * 0.18, d) * glint;
        }

        // Évalue un faisceau conique (x = radiance volumétrique du cône, y = tache d'impact au sol)
        vec2 evaluateBeam(
          vec2 p,
          vec2 origin,
          float targetAngle,
          float coneHalf,
          float sweepT,
          float airT,
          float seed
        ) {
          vec2 axis = vec2(cos(targetAngle), sin(targetAngle));

          // Ouverture physique non-nulle du projecteur (évite la singularité ponctuelle)
          float aperture = 0.022 + coneHalf * 0.055;
          float apexDist = aperture / max(0.05, tan(coneHalf));
          vec2 virtualApex = origin - axis * apexDist;

          vec2 delta = p - virtualApex;
          float distFromApex = length(delta);
          float forwardDist = dot(p - origin, axis);

          // Masque devant l'optique
          float emitterFront = smoothstep(-0.018, 0.045, forwardDist);
          vec2 dir = delta / max(0.0001, distFromApex);
          float angDiff = acos(clamp(dot(dir, axis), -1.0, 1.0));

          // Bords doux qui s'élargissent progressivement avec la profondeur dans la brume
          float clampedDist = max(0.0, forwardDist);
          float distSpread = 1.0 + clamp(clampedDist, 0.0, 2.0) * 0.28;
          float softness = max(0.032, coneHalf * (0.30 + uEdgeSoftness * 1.15) * distSpread);
          float coneMask = 1.0 - smoothstep(max(0.005, coneHalf - softness * 0.85), coneHalf + softness, angDiff);

          // Profil radial doux sans plateau artificiel
          float radialNorm = clamp(angDiff / max(0.015, coneHalf), 0.0, 1.5);
          float coreSharpness = mix(2.4, 1.35, clamp(clampedDist * 0.65, 0.0, 1.0));
          float core = exp(-radialNorm * radialNorm * coreSharpness) * 0.72
            + (1.0 - smoothstep(0.0, 1.15, radialNorm)) * 0.28;

          // Dégradé de profondeur : décroissance inverse-carré douce + atténuation atmosphérique
          float reach = 0.62 / max(0.3, uDensity);
          float invFalloff = 1.0 / (1.0 + clampedDist * clampedDist * (1.15 / max(0.25, uDensity)));
          float distFade = exp(-clampedDist * reach * 0.68) * mix(1.0, invFalloff, 0.52) * emitterFront;

          // Intersection géométrique cohérente avec le plan du sol (pour faisceaux descendants)
          float groundSpotVal = 0.0;
          float groundClip = 1.0;
          if (uGroundSpot > 0.01 && axis.y < -0.06) {
            float sHit = (uGroundLevel - origin.y) / axis.y;
            if (sHit > 0.04 && sHit < 3.6) {
              vec2 hitPos = origin + axis * sHit;
              // Lissage doux sous la surface d'impact pour ne pas traverser le sol
              groundClip = smoothstep(uGroundLevel - 0.11, uGroundLevel + 0.025, p.y);

              float beamR = aperture + sHit * tan(coneHalf);
              float rx = beamR / max(0.28, abs(axis.y));
              float ry = beamR * (0.22 + 0.16 * abs(axis.y));
              vec2 dG = vec2((p.x - hitPos.x) / max(0.045, rx), (p.y - hitPos.y) / max(0.024, ry));
              float rG = length(dG);

              float gSoft = 0.22 + uEdgeSoftness * 0.55;
              float gPool = 1.0 - smoothstep(max(0.15, 0.68 - gSoft * 0.35), 1.12 + gSoft, rG);
              float gHot = exp(-rG * rG * 2.8) * 0.78;
              float gReach = exp(-sHit * (0.40 / max(0.3, uDensity)));
              float gTex = 1.0;
              if (uQualityLevel >= 2) {
                gTex = 0.78 + 0.35 * (snoise(vec2(p.x * 7.5, p.y * 18.0)) * 0.5 + 0.5);
              }
              groundSpotVal = (gPool * 0.62 + gHot) * gReach * gTex * uGroundSpot;
            }
          } else if (uGroundSpot > 0.01 && axis.y > 0.10) {
            // Faisceaux ascendants : halo d'impact doux sur la couche nuageuse haute + reflet à la base
            float sSky = (0.44 - origin.y) / axis.y;
            if (sSky > 0.1 && sSky < 2.8) {
              vec2 skyHit = origin + axis * sSky;
              float skyR = (aperture + sSky * tan(coneHalf)) * 1.15;
              vec2 dS = vec2((p.x - skyHit.x) / max(0.08, skyR * 1.35), (p.y - skyHit.y) / max(0.04, skyR * 0.45));
              float rS = length(dS);
              groundSpotVal = exp(-rS * rS * 1.8) * 0.24 * uGroundSpot;
            }
          }

          coneMask *= groundClip;
          float coneEnergy = coneMask * core * distFade;

          // Diffusion volumétrique et grains de poussière illuminés dans le faisceau
          float volHaze = 1.0;
          float dustGlow = 0.0;
          if (uQualityLevel >= 1 && coneEnergy > 0.002) {
            if (uVolumetricNoise > 0.01) {
              vec2 flowUv = p * 2.2 + vec2(-airT * 0.11 + seed * 3.0, airT * 0.07);
              float n1 = snoise(flowUv) * 0.5 + 0.5;
              float haze = n1;
              if (uQualityLevel >= 2) {
                float n2 = snoise(p * 4.8 + vec2(airT * 0.16, -airT * 0.12 + seed)) * 0.5 + 0.5;
                haze = n1 * 0.65 + n2 * 0.35;
              }
              volHaze = mix(1.0, 0.58 + haze * 0.85, uVolumetricNoise);
            }

            if (uDustDensity > 0.01) {
              float d1 = dustMotes(p + vec2(airT * 0.03, -airT * 0.02), 7.5, airT, seed + 1.0);
              float dSum = d1;
              if (uQualityLevel >= 2) {
                float d2 = dustMotes(p + vec2(-airT * 0.045, airT * 0.025), 14.0, airT * 1.15, seed + 4.2);
                dSum = d1 * 0.65 + d2 * 0.55;
              }
              // Poussière strictement révélée à l'intérieur du faisceau éclairé
              dustGlow = dSum * uDustDensity * coneMask * distFade * 1.45;
            }
          }

          // Halo d'éblouissement à la lentille du projecteur
          float emitterDist = length(p - origin);
          float emitterGlow = exp(-emitterDist * 8.5) * 0.72 * (0.35 + 0.65 * coneMask);

          float totalCone = coneEnergy * volHaze + dustGlow + emitterGlow;
          return vec2(totalCone, groundSpotVal);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float airTime = uTime * max(0.01, uSpeed);
          float sweepTime = airTime * (0.14 + uSweepSpeed * 0.85);
          vec2 mouseShift = uMouse * (uDepth * 0.22);

          // Vacillement organique optionnel (lampe torche, projecteur ancien)
          float flickerMod = 1.0;
          if (uFlicker > 0.01) {
            float fNoise = snoise(vec2(uTime * 8.5, 2.3)) * 0.5 + 0.5;
            float fSpasm = step(0.88, hash12(vec2(floor(uTime * 18.0), 7.1))) * 0.35;
            flickerMod = 1.0 - uFlicker * clamp((1.0 - fNoise) * 0.45 + fSpasm, 0.0, 0.72);
          }

          vec3 col1 = uUseCustomColor ? uBeamColor : uPaletteAccent;
          vec3 col2 = uUseSecondaryColor ? uSecondaryColor : col1;
          vec3 accumColor = vec3(0.0);

          if (uOriginMode == 5) {
            // === MODE FRONT_SPOT (Projecteur circulaire frontal type 007) ===
            float sx = organicSweep(sweepTime * 0.55, 1.1) * 0.32 * aspect;
            float sy = organicSweep(sweepTime * 0.42, 4.3) * 0.18;
            vec2 spotCenter = vec2(sx, sy) + mouseShift * 1.4;
            float r = length(p - spotCenter);
            float radius = uConeAngle * 1.15;
            float soft = max(0.04, radius * (0.25 + uEdgeSoftness * 0.75));
            float pool = 1.0 - smoothstep(radius - soft, radius + soft, r);
            float haze = 1.0;
            float dust = 0.0;
            if (uQualityLevel >= 1) {
              haze = 0.74 + 0.42 * (snoise(p * 2.8 + vec2(airTime * 0.12, -airTime * 0.08)) * 0.5 + 0.5);
              if (uDustDensity > 0.01) {
                dust = dustMotes(p, 8.5, airTime, 2.7) * uDustDensity * pool * 0.45;
              }
            }
            float val = (pool * haze * 0.62 + dust) * flickerMod * uIntensity;
            vec3 spotHot = mix(col1, vec3(1.0, 0.99, 0.94), clamp(pool * 0.35, 0.0, 0.55));
            accumColor = spotHot * val;
          } else {
            // === MODES CONIQUES (1 ou 2 faisceaux) ===
            int count = (uQualityLevel == 0 && uBeamCount > 1 && uOriginMode != 4) ? 1 : uBeamCount;

            for (int i = 0; i < 2; i++) {
              if (i >= count) break;
              float fi = float(i);
              float sideSign = (i == 0) ? -1.0 : 1.0;

              vec2 origin = vec2(0.0, -0.62);
              float baseAngle = 1.5708; // Vers le haut

              if (uOriginMode == 0) {
                // bottom : projecteur anti-aérien / scène
                origin = vec2(sideSign * (count == 2 ? 0.32 * aspect : 0.08 * aspect), -0.62);
                baseAngle = 1.5708 - sideSign * 0.18;
              } else if (uOriginMode == 1) {
                // top : OVNI / surveillance aérienne
                origin = vec2(sideSign * (count == 2 ? 0.30 * aspect : 0.0), 0.62);
                baseAngle = -1.5708 + sideSign * 0.15;
              } else if (uOriginMode == 2) {
                // top_left : lampe d'atelier Luxo
                origin = vec2(-0.56 * aspect, 0.56);
                baseAngle = -0.78;
              } else if (uOriginMode == 3) {
                // top_right : hélicoptère Nakatomi
                origin = vec2(0.58 * aspect, 0.56);
                baseAngle = -2.35;
              } else if (uOriginMode == 4) {
                // side : phares jumeaux ou gyrophares latéraux
                if (uUseSecondaryColor && count == 2) {
                  origin = vec2(sideSign * 0.62 * aspect, 0.14 + fi * 0.08);
                  baseAngle = (i == 0) ? 0.18 : (3.14159 - 0.18);
                } else {
                  origin = vec2(-0.62 * aspect, 0.08 + fi * 0.20);
                  baseAngle = 0.16 - fi * 0.12;
                }
              } else if (uOriginMode == 6) {
                // mouse_follow : lampe torche dirigée vers la souris
                origin = vec2(-0.22 * aspect, -0.58);
                vec2 target = vec2(uMouse.x * aspect * 0.45, uMouse.y * 0.45);
                baseAngle = atan(target.y - origin.y, target.x - origin.x);
              }

              // Parallaxe souris sur l'origine et balayage lent
              origin += mouseShift * (uOriginMode == 6 ? 0.35 : 0.8);
              float sweepOffset = organicSweep(sweepTime, 1.3 + fi * 3.7) * uSweepRange;
              if (uOriginMode == 6) {
                sweepOffset *= 0.20;
              } else {
                sweepOffset += uMouse.x * uDepth * 0.26 * (i == 0 ? 1.0 : -0.7);
              }

              vec2 res = evaluateBeam(p, origin, baseAngle + sweepOffset, uConeAngle, sweepTime, airTime, fi * 2.1);
              float beamVal = res.x * flickerMod * uIntensity;
              float groundVal = res.y * flickerMod * uIntensity;

              vec3 bCol = (i == 0) ? col1 : col2;
              vec3 hotCol = mix(bCol, vec3(1.0, 0.99, 0.94), clamp(beamVal * 0.38, 0.0, 0.58));
              vec3 groundCol = mix(bCol, vec3(1.0, 0.98, 0.90), clamp(groundVal * 0.42, 0.0, 0.62));
              accumColor += hotCol * (beamVal * 0.62) + groundCol * (groundVal * 0.58);
            }
          }

          // Masque optionnel de stores vénitiens / grilles (ex: NYPD)
          if (uSlatMask > 0.01) {
            float slatWave = sin((uv.y + uScroll * 0.08) * 58.0 + uMouse.y * 1.5);
            float slats = smoothstep(-0.35, 0.25, slatWave);
            float mask = mix(1.0, 0.18 + 0.82 * slats, uSlatMask);
            accumColor *= mask;
          }

          // Compression douce HDR pour conserver la douceur des bords en fusion additive
          accumColor = accumColor / (1.0 + accumColor * 0.25);

          float maxLum = max(accumColor.r, max(accumColor.g, accumColor.b));
          if (maxLum <= 0.002) {
            discard;
          }

          gl_FragColor = vec4(accumColor, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -11
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<VolumetricSpotlightProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.beamColor !== undefined) {
      this.beamColorVec.set(newProps.beamColor)
      this.material.uniforms.uBeamColor.value = this.beamColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseSecondaryColor.value = true
    }
    if (newProps.beamCount !== undefined) {
      this.material.uniforms.uBeamCount.value = Math.min(
        2,
        Math.max(1, Math.round(newProps.beamCount))
      )
    }
    if (newProps.originMode !== undefined) {
      this.material.uniforms.uOriginMode.value = ORIGIN_MODE_MAP[newProps.originMode] ?? 0
    }
    if (newProps.coneAngle !== undefined)
      this.material.uniforms.uConeAngle.value = newProps.coneAngle
    if (newProps.sweepRange !== undefined)
      this.material.uniforms.uSweepRange.value = newProps.sweepRange
    if (newProps.sweepSpeed !== undefined)
      this.material.uniforms.uSweepSpeed.value = newProps.sweepSpeed
    if (newProps.edgeSoftness !== undefined)
      this.material.uniforms.uEdgeSoftness.value = newProps.edgeSoftness
    if (newProps.volumetricNoise !== undefined)
      this.material.uniforms.uVolumetricNoise.value = newProps.volumetricNoise
    if (newProps.flicker !== undefined) this.material.uniforms.uFlicker.value = newProps.flicker
    if (newProps.slatMask !== undefined) this.material.uniforms.uSlatMask.value = newProps.slatMask
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.dustDensity !== undefined)
      this.material.uniforms.uDustDensity.value = newProps.dustDensity
    if (newProps.groundSpot !== undefined)
      this.material.uniforms.uGroundSpot.value = newProps.groundSpot
    if (newProps.groundLevel !== undefined)
      this.material.uniforms.uGroundLevel.value = newProps.groundLevel
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

export const VolumetricSpotlightDefinition: IBrickDefinition<VolumetricSpotlightProps> = {
  type: 'volumetric_spotlight',
  category: 'atmosphere',
  create: (id, props, context) => new VolumetricSpotlightInstance(id, props, context),
}

BrickRegistry.register(VolumetricSpotlightDefinition)
