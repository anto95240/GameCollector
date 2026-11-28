/**
 * src/theme-engine/bricks/atmosphere/HeatDistortionBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Distorsion thermique et mirage subtil au-dessus des sources de chaleur :
 * - Colonnes convectives localisées au-dessus des foyers chauds (sable, magma, réacteur)
 * - Ondulation verticale dont l'amplitude croît avec la hauteur avant dissipation douce
 * - Bruit à deux fréquences (panaches lents basse fréquence + rides fines haute fréquence)
 * - Effet optique subtil de filaments réfractifs (Schlieren / mirage) sans voile opaque
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Distorsion de Chaleur.
 */
export interface HeatDistortionProps {
  /** Teinte subtile du miroitement thermique (défaut #fb923c ou uPaletteAccent). */
  tintColor?: string
  /** Fréquence spatiale et finesse des ondes thermiques (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'ascension verticale de la colonne thermique (0.0 à 1.0, défaut 0.3). */
  speed?: number
  /** Profondeur et réactivité à la parallaxe caméra (0.0 à 1.0, défaut 0.25). */
  depth?: number
  /** Amplitude subtile du miroitement et de la distorsion (0.1 à 2.5, défaut 1.0). */
  intensity?: number
  /** Turbulence chaotique et dispersion des foyers secondaires (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Hauteur d'élévation de la colonne de chaleur au-dessus de la source (0.2 à 1.0, défaut 0.65). */
  heatHeight?: number
  /** Séparation spectrale chromatique RVB sur les filaments (0.0 à 0.05, défaut 0.015). */
  chromaticAberration?: number
  /** Position horizontale X normalisée de la source principale de chaleur (-1.0 à 1.0, défaut 0.0). */
  sourceX?: number
  /** Altitude verticale Y de la source de chaleur en UV (0.0 à 0.8, défaut 0.12). */
  sourceY?: number
  /** Largeur horizontale des panaches localisés (0.15 à 1.5, défaut 0.55). */
  plumeWidth?: number
}

export class HeatDistortionInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'heat_distortion'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: HeatDistortionProps
  private tintColorVec: THREE.Color

  constructor(id: string, props: HeatDistortionProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.tintColorVec = new THREE.Color(props.tintColor ?? '#fb923c')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const heatHeight = props.heatHeight ?? 0.65
    const chromaticAberration = props.chromaticAberration ?? 0.015
    const sourceX = props.sourceX ?? 0.0
    const sourceY = props.sourceY ?? 0.12
    const plumeWidth = props.plumeWidth ?? 0.55

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
        uTintColor: { value: this.tintColorVec },
        uUseCustomColor: { value: Boolean(props.tintColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHeatHeight: { value: heatHeight },
        uChromaticAberration: { value: chromaticAberration },
        uSourceX: { value: sourceX },
        uSourceY: { value: sourceY },
        uPlumeWidth: { value: plumeWidth },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.978, 1.0);
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
        uniform vec3 uTintColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHeatHeight;
        uniform float uChromaticAberration;
        uniform float uSourceX;
        uniform float uSourceY;
        uniform float uPlumeWidth;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Bruit thermique à deux fréquences : panache convectif lent + rides fines ascensionnelles
        float twoFreqThermal(vec2 coord, float h, float t) {
          // Basse fréquence : colonnes ondulantes qui s'amplifient avec la hauteur h
          float lowFreq = snoise(vec2(coord.x * 2.3, coord.y * 1.1 - t * 0.95));
          float sway = lowFreq * (0.04 + 0.22 * h) * (0.65 + 0.7 * uRandomness);
          float vertRipple = snoise(vec2(coord.x * 4.5, coord.y * 2.2 - t * 1.5)) * 0.06;
          // Haute fréquence : rides fines brisées verticalement pour éviter l'aspect rayures régulières
          float highFreq = snoise(vec2((coord.x + sway + vertRipple) * 9.5 * uDensity, coord.y * 4.6 * uDensity - t * 2.4));
          return lowFreq * 0.44 + highFreq * 0.56;
        }

        // Enveloppe d'une colonne localisée au-dessus d'un foyer (s'élargit avec la hauteur)
        float plumeEnvelope(vec2 p, vec2 srcPos, float width, float heightSpan, float t) {
          float dy = p.y - srcPos.y;
          if (dy <= -0.02 || dy >= heightSpan) return 0.0;

          float h = clamp(dy / max(0.05, heightSpan), 0.0, 1.0);
          // L'amplitude et l'ouverture croissent avec la hauteur au-dessus de la source, puis s'estompent
          float growthAmp = smoothstep(0.0, 0.24, h) * pow(h, 0.60) * smoothstep(1.0, 0.62, h);

          // Légère dérive sinueuse de l'axe de la colonne croissante avec h
          float axisSway = sin(dy * 7.5 - t * 1.9 + srcPos.x * 5.0) * (0.02 + 0.09 * h) * (0.5 + uRandomness);
          float dx = p.x - (srcPos.x + axisSway);
          float localWidth = width * (0.42 + 1.05 * h);
          float radialMask = exp(-(dx * dx) / max(0.004, localWidth * localWidth));

          return growthAmp * radialMask;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;
          vec2 mouseOffset = uMouse * (uDepth * 0.10);
          p += mouseOffset;
          p.y += uScroll * 0.00025 * uDepth;

          float srcYWorld = uSourceY - 0.5;
          vec2 mainSrc = vec2(uSourceX * aspect * 0.5, srcYWorld);
          float heightSpan = max(0.18, uHeatHeight * 0.95);

          // Localisation au-dessus de la source principale + 1 à 2 foyers chauds secondaires
          float env = plumeEnvelope(p, mainSrc, uPlumeWidth * 0.42, heightSpan, t);

          if (uQualityLevel >= 1) {
            vec2 secA = vec2((uSourceX - 0.52) * aspect * 0.5, srcYWorld - 0.03);
            env += plumeEnvelope(p, secA, uPlumeWidth * 0.34, heightSpan * 0.85, t * 1.12) * (0.55 + 0.35 * uRandomness);
          }
          if (uQualityLevel >= 2) {
            vec2 secB = vec2((uSourceX + 0.56) * aspect * 0.5, srcYWorld + 0.02);
            env += plumeEnvelope(p, secB, uPlumeWidth * 0.32, heightSpan * 0.80, t * 0.93) * (0.50 + 0.35 * uRandomness);
          }

          env = clamp(env, 0.0, 1.0);
          if (env <= 0.004) {
            discard;
          }

          float hNorm = clamp((p.y - srcYWorld) / max(0.05, heightSpan), 0.0, 1.0);
          // Amplification verticale : la distorsion croît au-dessus de la source
          float heightAmp = 0.25 + 0.95 * hNorm;

          vec3 shimmerRgb = vec3(0.0);
          float causticIntensity = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Gradient optique à 2 fréquences + dispersion RVB subtile sur filaments ===
            float eps = 0.014;
            float nL = twoFreqThermal(p - vec2(eps, 0.0), hNorm, t);
            float nR = twoFreqThermal(p + vec2(eps, 0.0), hNorm, t);
            float nC = twoFreqThermal(p, hNorm, t);

            // Gradient horizontal adouci (ondulations optiques subtiles sans rayures marquées)
            float gradX = abs(nR - nL) / (2.0 * eps);
            float filament = smoothstep(1.5, 11.0, gradX) * 0.75;
            float softRipple = smoothstep(-0.05, 0.78, nC) * 0.30;

            // Dispersion chromatique subtile uniquement sur la crête des filaments
            float chroma = uChromaticAberration * 0.55 * heightAmp * uIntensity;
            float nChromaR = twoFreqThermal(p + vec2(chroma, 0.0), hNorm, t);
            float nChromaB = twoFreqThermal(p - vec2(chroma, 0.0), hNorm, t);
            vec3 refractionTint = vec3(
              0.94 + 0.14 * smoothstep(0.0, 0.7, nChromaR),
              0.92 + 0.12 * smoothstep(0.0, 0.7, nC),
              0.86 + 0.14 * smoothstep(0.0, 0.7, nChromaB)
            );

            causticIntensity = (filament * 0.78 + softRipple) * heightAmp * env;
            vec3 baseTint = uUseCustomColor ? uTintColor : uPaletteAccent;
            shimmerRgb = mix(refractionTint, baseTint, 0.30);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Bruit à 2 fréquences avec gradient rapide ===
            float eps = 0.018;
            float nC = twoFreqThermal(p, hNorm, t);
            float nR = twoFreqThermal(p + vec2(eps, 0.0), hNorm, t);
            float gradX = abs(nR - nC) / eps;
            float filament = smoothstep(1.5, 11.0, gradX) * 0.72;

            causticIntensity = (filament * 0.75 + smoothstep(-0.05, 0.78, nC) * 0.25) * heightAmp * env;
            vec3 baseTint = uUseCustomColor ? uTintColor : uPaletteAccent;
            shimmerRgb = mix(vec3(1.0, 0.96, 0.88), baseTint, 0.28);

          } else {
            // === PALIER LOW : 2 fréquences trigonométriques verticales (0 snoise, ultra-rapide) ===
            float lowWave = sin(p.x * 7.5 + p.y * 3.0 - t * 2.2);
            float sway = lowWave * (0.04 + 0.16 * hNorm);
            float highWave = sin((p.x + sway) * 26.0 * uDensity + p.y * 7.0 * uDensity - t * 5.2);
            float combinedWave = pow(max(0.0, highWave * 0.65 + lowWave * 0.35), 2.0);

            causticIntensity = combinedWave * 0.72 * heightAmp * env;
            vec3 baseTint = uUseCustomColor ? uTintColor : uPaletteAccent;
            shimmerRgb = mix(vec3(1.0, 0.97, 0.92), baseTint, 0.20);
          }

          // Effet volontairement subtil : jamais de nappe orange opaque
          float alpha = clamp(causticIntensity * (uIntensity * 0.15), 0.0, 0.18);
          if (alpha <= 0.003) {
            discard;
          }

          gl_FragColor = vec4(shimmerRgb * (0.85 + causticIntensity * 0.55), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -8 // Entre les lumières (-10) et les overlays
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<HeatDistortionProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.tintColor !== undefined) {
      this.tintColorVec.set(newProps.tintColor)
      this.material.uniforms.uTintColor.value = this.tintColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.heatHeight !== undefined)
      this.material.uniforms.uHeatHeight.value = newProps.heatHeight
    if (newProps.chromaticAberration !== undefined)
      this.material.uniforms.uChromaticAberration.value = newProps.chromaticAberration
    if (newProps.sourceX !== undefined) this.material.uniforms.uSourceX.value = newProps.sourceX
    if (newProps.sourceY !== undefined) this.material.uniforms.uSourceY.value = newProps.sourceY
    if (newProps.plumeWidth !== undefined)
      this.material.uniforms.uPlumeWidth.value = newProps.plumeWidth
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

export const HeatDistortionDefinition: IBrickDefinition<HeatDistortionProps> = {
  type: 'heat_distortion',
  category: 'atmosphere',
  create: (id, props, context) => new HeatDistortionInstance(id, props, context),
}

BrickRegistry.register(HeatDistortionDefinition)
