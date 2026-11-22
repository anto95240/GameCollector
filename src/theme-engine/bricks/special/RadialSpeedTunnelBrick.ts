/**
 * src/theme-engine/bricks/special/RadialSpeedTunnelBrick.ts
 *
 * Brique Spéciale : Tunnel Cinétique & Hyperespace Radial (Couche : Spéciaux).
 * Shader en coordonnées polaires sans couture angulaire centré sur un point de fuite
 * interactif, générant des traînées perspective à vitesses différentielles :
 * - 'hyperspace' : étirement stellaire blanc-bleuté vers le point de fuite (Galaxy Far Away)
 * - 'speed_lines' : lignes cinétiques de vitesse ou éclairs de tunnel (French Blue, Speed Force)
 * - 'vortex_ribbon' : ruban de plasma hélicoïdal rapide en vrille logarithmique (Flux)
 *
 * Zone centrale dégagée pour la lisibilité UI, point de fuite piloté par la souris,
 * légère aberration chromatique périphérique en HIGH, et paliers HIGH / MEDIUM / LOW.
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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        // Évalue une strate de traînées radiales sans aucune couture à -PI / +PI
        vec2 evalStreakLayer(
          float r,
          float angle,
          float sectorCount,
          float radialScale,
          float speedMult,
          float twistAmt,
          float t,
          float seed
        ) {
          float logR = log(max(r, 0.008));
          float twistedAngle = angle + logR * twistAmt;

          // Légère ondulation organique pour les speed_lines / vortex sans casser la périodicité 2*PI
          if (uQualityLevel >= 1 && uTunnelMode >= 1 && uRandomness > 0.05) {
            float jitterWave = sin(twistedAngle * 6.0 + logR * 3.5 - t * 2.2) * 0.015 * uRandomness;
            twistedAngle += jitterWave;
          }

          float angNorm = fract((twistedAngle + PI) / TAU);
          float cellA = mod(floor(angNorm * sectorCount), sectorCount);
          float localA = fract(angNorm * sectorCount) - 0.5;

          float hA = hash12(vec2(cellA, seed));
          float speedJitter = 0.72 + hA * 0.65 * (0.4 + uRandomness * 0.6);
          float rCoord = logR * radialScale - t * speedMult * speedJitter + hA * 17.3;

          float cellR = floor(rCoord);
          float fR = fract(rCoord);

          float hR = hash12(vec2(cellA + 11.3, cellR + seed * 5.0));
          float hR2 = hash12(vec2(cellA * 1.7, cellR * 2.3 + seed));

          // Taux d'occupation stochastique des secteurs
          float threshold = (uTunnelMode == 1) ? 0.36 : 0.44;
          if (hR < threshold) return vec2(0.0);

          // Profil radial de la traînée (queue effilée vers le centre, pointe fine et brillante vers l'extérieur)
          float dashLen = clamp(0.30 + uStreakLength * 0.36 * (0.65 + 0.35 * hR2), 0.22, 0.84);
          float tailStart = 0.90 - dashLen;
          float headEnd = 0.92;
          float rEnv = smoothstep(tailStart, headEnd - 0.10, fR) * smoothstep(headEnd + 0.03, headEnd - 0.05, fR);

          // Profil angulaire gaussien effilé (évite les barres épaisses aux coins extérieurs)
          float taper = 0.42 + 0.58 * pow(clamp((fR - tailStart) / max(0.05, headEnd - tailStart), 0.0, 1.0), 0.7);
          float halfW = mix(0.035, 0.125, hR2) * taper;
          float aEnv = exp(-pow(abs(localA) / max(0.016, halfW), 2.0));

          float headTip = smoothstep(headEnd - 0.14, headEnd - 0.03, fR) * aEnv;
          return vec2(rEnv * aEnv * (0.58 + 0.65 * hR2), headTip);
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
          float centerMask = smoothstep(uCenterClearRadius * 0.48, uCenterClearRadius * 1.48, r);
          if (centerMask <= 0.003) {
            discard;
          }

          // Accélération temporelle non-linéaire (respiration d'élan)
          float surge = 1.0 + 0.14 * sin(uTime * 0.82) + 0.08 * snoise(vec2(uTime * 0.35, 1.9)) * uRandomness;
          float t = uTime * max(0.05, uSpeed) * surge;

          vec3 col1 = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 col2 = uUseCustomColors ? uSecondaryColor : uPaletteAccent;

          float radialScale = 2.0 / max(0.35, uStreakLength);
          float twistAmt = (uTunnelMode == 2) ? max(0.45, uTwist) : uTwist;

          int layers = (uQualityLevel == 0) ? 1 : ((uQualityLevel == 1) ? 2 : 3);
          float streakAccum = 0.0;
          float tipAccum = 0.0;
          float chromaShift = 0.0;

          for (int l = 0; l < 3; l++) {
            if (l >= layers) break;
            float fl = float(l);
            float sectors = floor((42.0 + fl * 26.0) * clamp(uDensity, 0.4, 2.2));
            float speedMult = 1.15 + fl * 0.55;
            float layerWeight = 1.0 - fl * 0.22;

            vec2 res = evalStreakLayer(
              r,
              a,
              sectors,
              radialScale * (0.95 + fl * 0.25),
              speedMult,
              twistAmt * (1.0 + fl * 0.15),
              t,
              3.7 + fl * 13.1
            );
            streakAccum += res.x * layerWeight;
            tipAccum += res.y * layerWeight;

            // Micro-aberration chromatique périphérique en HIGH
            if (uQualityLevel >= 2 && l == 0 && r > uCenterClearRadius * 1.1) {
              vec2 resShift = evalStreakLayer(
                r * 0.985,
                a + 0.008,
                sectors,
                radialScale * 0.95,
                speedMult,
                twistAmt,
                t,
                3.7
              );
              chromaShift = resShift.x;
            }
          }

          // Mode vortex_ribbon : rubans plasma hélicoïdaux continus en spirale logarithmique
          float ribbonGlow = 0.0;
          if (uTunnelMode == 2) {
            float logR = log(max(r, 0.01));
            float spiralPhase1 = a * 3.0 + logR * (twistAmt * 2.8) - t * 2.4;
            float spiralPhase2 = a * 5.0 + logR * (twistAmt * 3.4) - t * 3.1;
            if (uQualityLevel >= 1) {
              spiralPhase1 += snoise(vec2(cos(a) * 2.0 + logR * 1.4, sin(a) * 2.0 - t * 0.8)) * 0.65 * uRandomness;
            }
            float r1 = pow(max(0.0, cos(spiralPhase1) * 0.5 + 0.5), 4.0);
            float r2 = pow(max(0.0, cos(spiralPhase2) * 0.5 + 0.5), 6.0) * 0.65;
            ribbonGlow = (r1 + r2) * smoothstep(0.08, 0.45, r) * 0.72;
          }

          // Atténuation douce près du point de fuite et légère intensification en perspective extérieure
          float radialBoost = smoothstep(0.05, 0.75, r) * 0.6 + 0.4;
          float coreMix = clamp(tipAccum * 0.9 + streakAccum * 0.35, 0.0, 1.0);

          vec3 baseCol = mix(col1, col2, coreMix);
          if (uQualityLevel >= 2 && chromaShift > 0.01) {
            // Frange spectrale subtile sur les bords du champ de vitesse
            baseCol.r += chromaShift * 0.22 * smoothstep(0.25, 0.75, r);
            baseCol.b += streakAccum * 0.14 * smoothstep(0.25, 0.75, r);
          }

          vec3 finalCol = baseCol * (streakAccum * 0.95 + tipAccum * 0.75) * radialBoost
            + mix(col1, col2, 0.45) * ribbonGlow;
          finalCol *= centerMask * uIntensity;

          float alpha = clamp((streakAccum * 0.65 + tipAccum * 0.55 + ribbonGlow * 0.6) * centerMask * uIntensity, 0.0, 0.92);
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
