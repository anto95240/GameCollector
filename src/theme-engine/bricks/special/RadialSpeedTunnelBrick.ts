/**
 * src/theme-engine/bricks/special/RadialSpeedTunnelBrick.ts
 *
 * Brique Spéciale : Tunnel Cinétique & Hyperespace Radial (Couche : Spéciaux).
 * Shader en coordonnées polaires sans couture angulaire centré sur un point de fuite
 * interactif, générant des traînées stellaires perspective réalistes :
 * - 'hyperspace' : étoiles étirées en traînées perspective avec accélération continue,
 *   transition chromatique selon la vitesse (bleu profond -> cyan -> blanc incandescent),
 *   variations fortes de longueur et flou radial lumineux (Galaxy Far Away)
 * - 'speed_lines' : lignes cinétiques de vitesse ou éclairs de tunnel (French Blue, Speed Force)
 * - 'vortex_ribbon' : ruban de plasma hélicoïdal rapide en vrille logarithmique (Flux)
 *
 * Zone centrale dégagée pour la lisibilité UI, point de fuite piloté par la souris,
 * dispersion chromatique radiale périphérique en HIGH, et paliers HIGH / MEDIUM / LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type RadialTunnelMode = 'hyperspace' | 'speed_lines' | 'vortex_ribbon'

export interface RadialSpeedTunnelProps {
  /** Teinte principale des traînées et rubans (défaut #38bdf8 ou uPalettePrimary). */
  primaryColor?: string
  /** Teinte secondaire d'accélération et des pointes chaudes (défaut #e0f2fe ou uPaletteAccent). */
  secondaryColor?: string
  /** Style du tunnel radial (défaut 'hyperspace'). */
  tunnelMode?: RadialTunnelMode
  /** Longueur d'étirement perspective des traînées (0.3 à 1.8, défaut 1.0). */
  streakLength?: number
  /** Torsion hélicoïdale logarithmique (0.0 à 2.0, défaut 0.0). */
  twist?: number
  /** Rayon central dégagé pour préserver la lisibilité des textes UI (0.12 à 0.35, défaut 0.20). */
  centerClearRadius?: number
  /** Décalage horizontal initial du point de fuite (-0.4 à 0.4, défaut 0.0). */
  vanishingOffsetX?: number
  /** Décalage vertical initial du point de fuite (-0.4 à 0.4, défaut 0.0). */
  vanishingOffsetY?: number
  /** Densité angulaire des traînées (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Vitesse d'accélération radiale (0.1 à 2.5, défaut 1.2). */
  speed?: number
  /** Profondeur et réactivité du point de fuite à la souris (0.0 à 1.0, défaut 0.45). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Irrégularité et dispersion stochastique (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Amplitude des poussées d'accélération hyperespace non-linéaires (0.0 à 1.5, défaut 0.55). */
  acceleration?: number
  /** Intensité du flou radial cinétique et du voile de vitesse (0.0 à 1.5, défaut 0.55). */
  radialBlur?: number
  /** Intensité du glissement chromatique lié à la vitesse bleu -> blanc (0.0 à 1.5, défaut 0.75). */
  colorShift?: number
}

const TUNNEL_MODE_MAP: Record<RadialTunnelMode, number> = {
  hyperspace: 0,
  speed_lines: 1,
  vortex_ribbon: 2,
}

export class RadialSpeedTunnelInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'radial_speed_tunnel'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: RadialSpeedTunnelProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color

  constructor(id: string, props: RadialSpeedTunnelProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#38bdf8')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#e0f2fe')

    const modeIdx = TUNNEL_MODE_MAP[props.tunnelMode ?? 'hyperspace'] ?? 0
    const streakLength = props.streakLength ?? 1.0
    const twist = props.twist ?? 0.0
    const centerClearRadius = props.centerClearRadius ?? 0.2
    const vanishingOffsetX = props.vanishingOffsetX ?? 0.0
    const vanishingOffsetY = props.vanishingOffsetY ?? 0.0
    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.2
    const depth = props.depth ?? 0.45
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.5
    const acceleration = props.acceleration ?? 0.55
    const radialBlur = props.radialBlur ?? 0.55
    const colorShift = props.colorShift ?? 0.75

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uPrimaryColor: { value: this.primaryColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColors: { value: Boolean(props.primaryColor || props.secondaryColor) },
        uTunnelMode: { value: modeIdx },
        uStreakLength: { value: streakLength },
        uTwist: { value: twist },
        uCenterClearRadius: { value: centerClearRadius },
        uVanishingOffsetX: { value: vanishingOffsetX },
        uVanishingOffsetY: { value: vanishingOffsetY },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uAcceleration: { value: acceleration },
        uRadialBlur: { value: radialBlur },
        uColorShift: { value: colorShift },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.995, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColors;
        uniform int uTunnelMode;
        uniform float uStreakLength;
        uniform float uTwist;
        uniform float uCenterClearRadius;
        uniform float uVanishingOffsetX;
        uniform float uVanishingOffsetY;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uAcceleration;
        uniform float uRadialBlur;
        uniform float uColorShift;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        // Évalue une strate de traînées stellaires en perspective sans couture à -PI/+PI
        // Retourne vec3(énergie traînée, tête stellaire brillante, vitesse apparente normalisée 0..1)
        vec3 evalStreakLayer(
          float r,
          float angle,
          float sectorCount,
          float radialScale,
          float speedMult,
          float twistAmt,
          float tPhase,
          float instVel,
          float seed
        ) {
          float logR = log(max(r, 0.008));
          float twistedAngle = angle + logR * twistAmt;

          // Légère ondulation organique pour les modes speed_lines / vortex_ribbon
          if (uQualityLevel >= 1 && uTunnelMode >= 1 && uRandomness > 0.05) {
            float jitterWave = sin(twistedAngle * 6.0 + logR * 3.5 - tPhase * 2.0) * 0.014 * uRandomness;
            twistedAngle += jitterWave;
          }

          float angNorm = fract((twistedAngle + PI) / TAU);
          float cellA = mod(floor(angNorm * sectorCount), sectorCount);
          float localA = fract(angNorm * sectorCount) - 0.5;

          float hA = hash12(vec2(cellA, seed));
          float hA2 = hash12(vec2(cellA * 2.13 + 3.7, seed + 19.1));
          // Décalage angulaire stochastique dans le secteur (casse tout alignement en rayons de roue)
          float angJitter = (hA2 - 0.5) * 0.52 * (0.4 + uRandomness * 0.6);
          float shiftedLocalA = localA - angJitter;

          // Vitesse différentielle marquée par étoile (étoiles proches plus rapides)
          float starSpeed = 0.58 + hA * 0.92 * (0.45 + uRandomness * 0.55);
          float rCoord = logR * radialScale - tPhase * speedMult * starSpeed + hA * 23.7;

          float cellR = floor(rCoord);
          float fR = fract(rCoord);

          float hR = hash12(vec2(cellA + 11.3, cellR + seed * 5.0));
          float hLen = hash12(vec2(cellA * 1.7 + 2.9, cellR * 2.3 + seed));
          float hMag = hash12(vec2(cellA * 3.1 + 7.4, cellR * 1.3 + seed * 2.7));

          // Taux d'occupation stochastique des secteurs
          float threshold = (uTunnelMode == 1) ? 0.34 : 0.42;
          if (hR < threshold) return vec3(0.0);

          // Perspective : les étoiles s'allongent fortement en s'éloignant du point de fuite
          // + variation importante de longueur entre traînées courtes (étoiles faibles) et longues (proches)
          float perspStretch = mix(0.42, 1.35, smoothstep(0.08, 0.78, r));
          float lenVar = mix(0.24, 1.32, pow(hLen, 0.85));
          float dashLen = clamp(
            (0.18 + uStreakLength * 0.46) * lenVar * perspStretch * mix(0.85, 1.28, instVel),
            0.10,
            0.88
          );

          // Position de tête décalée aléatoirement dans la cellule (supprime tout rythme de battement)
          float headEnd = mix(0.68, 0.96, hMag);
          float tailStart = max(0.02, headEnd - dashLen);
          float progress = clamp((fR - tailStart) / max(0.04, headEnd - tailStart), 0.0, 1.0);

          // Profil longitudinal : queue progressive façon motion blur, tête lumineuse nette
          float tailFade = pow(progress, 1.45) * smoothstep(tailStart, tailStart + 0.04, fR);
          float headCut = smoothstep(headEnd + 0.025, headEnd - 0.035, fR);
          float rEnv = tailFade * headCut;

          // Épaisseur compensée en perspective écran : évite l'élargissement artificiel en part de tarte
          // aux coins tout en grossissant légèrement les étoiles qui nous frôlent en périphérie
          float screenComp = 1.0 / (0.42 + r * 2.15);
          float taper = mix(0.28, 1.0, pow(progress, 0.65));
          float baseW = mix(0.024, 0.105, hMag * hMag) * (0.75 + 0.45 * smoothstep(0.15, 0.85, r));
          float halfW = clamp(baseW * screenComp * taper, 0.012, 0.22);

          // Cœur fin + halo doux anti-aliasing
          float aCore = exp(-pow(abs(shiftedLocalA) / max(0.009, halfW), 2.0));
          float aSoft = exp(-pow(abs(shiftedLocalA) / max(0.024, halfW * 2.6), 2.0)) * 0.34;
          float aEnv = aCore + aSoft;

          // Pointe stellaire incandescente en tête de traînée
          float headTip = smoothstep(headEnd - 0.13, headEnd - 0.025, fR) * headCut * aCore * (0.65 + 0.75 * hMag);
          float magWeight = 0.38 + 0.95 * pow(hMag, 1.15);

          // Vitesse apparente normalisée (pilote le décalage bleu -> cyan -> blanc)
          float vApparent = clamp(
            (starSpeed * 0.45 + smoothstep(0.10, 0.75, r) * 0.45 + progress * 0.38) * mix(0.8, 1.25, instVel) - 0.18,
            0.0,
            1.0
          );

          return vec3(rEnv * aEnv * magWeight, headTip, vApparent);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Point de fuite interactif piloté par la souris et le défilement
          vec2 vanish = vec2(uVanishingOffsetX, uVanishingOffsetY)
            + uMouse * (uDepth * 0.22)
            + vec2(0.0, -uScroll * (uDepth * 0.06));

          vec2 p = (uv - 0.5 - vanish * 0.5) * vec2(aspect, 1.0);
          float r = length(p);
          float a = atan(p.y, p.x);

          // Zone centrale dégagée pour la lisibilité de l'interface
          float centerMask = smoothstep(uCenterClearRadius * 0.42, uCenterClearRadius * 1.42, r);
          if (centerMask <= 0.003) {
            discard;
          }

          // Accélération temporelle STRICTEMENT MONOTONE (jamais de marche arrière à grand uTime)
          // Intégrale analytique : tPhase croît toujours ; instVel reflète les poussées d'accélération
          float baseSpd = max(0.05, uSpeed);
          float accAmp = clamp(uAcceleration, 0.0, 1.5);
          float w1 = uTime * 0.58;
          float w2 = uTime * 0.97 + 1.7;
          float tPhase = uTime * baseSpd + (sin(w1) * 0.36 + sin(w2) * 0.14) * accAmp * baseSpd;
          float instVel = clamp(
            0.5 + 0.35 * (cos(w1) * 0.65 + cos(w2) * 0.35) * accAmp,
            0.15,
            1.0
          );

          vec3 col1 = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 col2 = uUseCustomColors ? uSecondaryColor : uPaletteAccent;
          vec3 deepWarpBlue = mix(col1 * vec3(0.38, 0.62, 1.25), vec3(0.12, 0.42, 1.0), 0.45);
          vec3 pureWhite = vec3(0.97, 0.99, 1.0);
          float shiftAmt = clamp(uColorShift, 0.0, 1.5);
          float blurAmt = clamp(uRadialBlur, 0.0, 1.5);

          float radialScale = 1.95 / max(0.35, uStreakLength);
          float twistAmt = (uTunnelMode == 2) ? max(0.45, uTwist) : uTwist;

          // 1 strate en LOW, 3 strates en MEDIUM, 4 strates en HIGH
          int layers = (uQualityLevel == 0) ? 1 : ((uQualityLevel == 1) ? 3 : 4);
          vec3 streakColAccum = vec3(0.0);
          float streakLum = 0.0;
          float tipAccum = 0.0;
          float blurAccum = 0.0;
          float chromaR = 0.0;
          float chromaB = 0.0;

          for (int l = 0; l < 4; l++) {
            if (l >= layers) break;
            float fl = float(l);
            // Couches profondes (l=0,1) : fines et denses ; couches proches (l=2,3) : rapides et éclatantes
            float sectors = floor((38.0 + fl * 20.0) * clamp(uDensity, 0.4, 2.2));
            float speedMult = 0.85 + fl * 0.52;
            float layerWeight = mix(0.68, 1.05, fl / max(1.0, float(layers - 1)));
            if (layers == 1) layerWeight = 1.0;

            vec3 res = evalStreakLayer(
              r,
              a,
              sectors,
              radialScale * (0.88 + fl * 0.22),
              speedMult,
              twistAmt * (1.0 + fl * 0.14),
              tPhase,
              instVel,
              3.7 + fl * 13.7
            );

            // Couleur selon la vitesse apparente : bleu profond (lent/loin) -> cyan -> blanc (rapide/proche)
            float velNorm = clamp(res.z * (0.72 + fl * 0.14), 0.0, 1.0);
            vec3 lowVelCol = (uTunnelMode == 0) ? mix(col1, deepWarpBlue, clamp(shiftAmt * 0.72, 0.0, 0.9)) : col1;
            vec3 midVelCol = mix(lowVelCol, col2, smoothstep(0.18, 0.72, velNorm));
            vec3 highVelCol = mix(midVelCol, pureWhite, smoothstep(0.52, 0.98, velNorm) * clamp(shiftAmt * 0.85, 0.0, 1.0));

            streakColAccum += highVelCol * res.x * layerWeight;
            streakLum += res.x * layerWeight;
            tipAccum += res.y * layerWeight;

            // Flou radial cinétique (multi-taps le long du vecteur radial vers le point de fuite)
            if (uQualityLevel >= 1 && blurAmt > 0.05 && l < 2) {
              float radialStep = (0.045 + 0.035 * instVel) * blurAmt * smoothstep(0.08, 0.65, r);
              vec3 b1 = evalStreakLayer(
                max(0.01, r * (1.0 - radialStep)),
                a,
                sectors,
                radialScale * (0.88 + fl * 0.22),
                speedMult,
                twistAmt * (1.0 + fl * 0.14),
                tPhase,
                instVel,
                3.7 + fl * 13.7
              );
              blurAccum += b1.x * layerWeight * 0.45;
              if (uQualityLevel >= 2) {
                vec3 b2 = evalStreakLayer(
                  max(0.01, r * (1.0 - radialStep * 2.1)),
                  a,
                  sectors,
                  radialScale * (0.88 + fl * 0.22),
                  speedMult,
                  twistAmt * (1.0 + fl * 0.14),
                  tPhase,
                  instVel,
                  3.7 + fl * 13.7
                );
                blurAccum += b2.x * layerWeight * 0.25;
              }
            }

            // Dispersion chromatique purement radiale en périphérie (HIGH)
            if (uQualityLevel >= 2 && l == 1 && r > uCenterClearRadius * 1.15) {
              float cRad = 0.018 * smoothstep(0.22, 0.85, r);
              chromaR = evalStreakLayer(r * (1.0 + cRad), a, sectors, radialScale * 1.10, speedMult, twistAmt * 1.14, tPhase, instVel, 3.7 + 13.7).x;
              chromaB = evalStreakLayer(max(0.01, r * (1.0 - cRad)), a, sectors, radialScale * 1.10, speedMult, twistAmt * 1.14, tPhase, instVel, 3.7 + 13.7).x;
            }
          }

          // Voile de tunnel hyperespace diffus (flou radial atmosphérique périphérique)
          float tunnelMist = 0.0;
          if (uQualityLevel >= 1 && blurAmt > 0.05) {
            float logR = log(max(r, 0.01));
            float angStream = sin(a * 11.0 + logR * 2.5 - tPhase * 1.4) * 0.5 + 0.5;
            float angStream2 = sin(a * 19.0 - logR * 3.8 + tPhase * 1.9) * 0.5 + 0.5;
            tunnelMist = (angStream * 0.6 + angStream2 * 0.4)
              * smoothstep(uCenterClearRadius * 0.85, 0.68, r)
              * (0.14 + 0.12 * instVel)
              * blurAmt;
          }

          // Mode vortex_ribbon : rubans plasma hélicoïdaux continus en spirale logarithmique
          float ribbonGlow = 0.0;
          if (uTunnelMode == 2) {
            float logR = log(max(r, 0.01));
            float spiralPhase1 = a * 3.0 + logR * (twistAmt * 2.8) - tPhase * 2.2;
            float spiralPhase2 = a * 5.0 + logR * (twistAmt * 3.4) - tPhase * 2.9;
            if (uQualityLevel >= 1) {
              spiralPhase1 += snoise(vec2(cos(a) * 2.0 + logR * 1.4, sin(a) * 2.0 - tPhase * 0.7)) * 0.65 * uRandomness;
            }
            float r1 = pow(max(0.0, cos(spiralPhase1) * 0.5 + 0.5), 4.0);
            float r2 = pow(max(0.0, cos(spiralPhase2) * 0.5 + 0.5), 6.0) * 0.65;
            ribbonGlow = (r1 + r2) * smoothstep(0.08, 0.45, r) * 0.72;
          }

          // Intensification en perspective extérieure + poussée d'accélération
          float radialBoost = (smoothstep(0.05, 0.78, r) * 0.65 + 0.35) * (0.88 + 0.24 * instVel);

          vec3 blurCol = mix(deepWarpBlue, col1, 0.55) * (blurAccum * 0.68 + tunnelMist);
          vec3 tipCol = mix(col2, pureWhite, clamp(0.55 + shiftAmt * 0.4, 0.0, 0.96)) * tipAccum * 0.92;
          vec3 finalCol = (streakColAccum * 0.88 + tipCol + blurCol) * radialBoost
            + mix(col1, col2, 0.45) * ribbonGlow;

          if (uQualityLevel >= 2 && (chromaR + chromaB) > 0.01) {
            float edgeW = smoothstep(0.26, 0.82, r) * 0.24;
            finalCol.r += chromaR * edgeW;
            finalCol.b += chromaB * edgeW * 1.15;
          }

          finalCol *= centerMask * uIntensity;

          float alpha = clamp(
            (streakLum * 0.58 + tipAccum * 0.62 + blurAccum * 0.32 + tunnelMist * 0.55 + ribbonGlow * 0.6)
              * centerMask
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
    this.mesh.renderOrder = -55
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<RadialSpeedTunnelProps>): void {
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
    if (newProps.tunnelMode !== undefined) {
      this.material.uniforms.uTunnelMode.value = TUNNEL_MODE_MAP[newProps.tunnelMode] ?? 0
    }
    if (newProps.streakLength !== undefined)
      this.material.uniforms.uStreakLength.value = newProps.streakLength
    if (newProps.twist !== undefined) this.material.uniforms.uTwist.value = newProps.twist
    if (newProps.centerClearRadius !== undefined)
      this.material.uniforms.uCenterClearRadius.value = newProps.centerClearRadius
    if (newProps.vanishingOffsetX !== undefined)
      this.material.uniforms.uVanishingOffsetX.value = newProps.vanishingOffsetX
    if (newProps.vanishingOffsetY !== undefined)
      this.material.uniforms.uVanishingOffsetY.value = newProps.vanishingOffsetY
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.acceleration !== undefined)
      this.material.uniforms.uAcceleration.value = newProps.acceleration
    if (newProps.radialBlur !== undefined)
      this.material.uniforms.uRadialBlur.value = newProps.radialBlur
    if (newProps.colorShift !== undefined)
      this.material.uniforms.uColorShift.value = newProps.colorShift
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

export const RadialSpeedTunnelDefinition: IBrickDefinition<RadialSpeedTunnelProps> = {
  type: 'radial_speed_tunnel',
  category: 'special',
  create: (id, props, context) => new RadialSpeedTunnelInstance(id, props, context),
}

BrickRegistry.register(RadialSpeedTunnelDefinition)
