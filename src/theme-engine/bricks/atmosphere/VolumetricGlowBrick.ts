/**
 * src/theme-engine/bricks/atmosphere/VolumetricGlowBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Lueur volumétrique atmosphérique et diffusion céleste réaliste :
 * - Décroissance physique douce (loi inverse-carré adoucie au cœur + Mie + Rayleigh)
 * - Cœur incandescent nettement plus chaud que le halo et la périphérie
 * - Bloom multi-échelle progressif sans cassure ni saturation brutale
 * - Respiration organique légère et interaction volumétrique avec la brume dérivante
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Lueur Volumétrique.
 */
export interface VolumetricGlowProps {
  /** Teinte du cœur incandescent de la lueur (défaut #fef08a ou uPalettePrimary). */
  coreColor?: string
  /** Teinte intermédiaire de diffusion atmosphérique (défaut #38bdf8 ou uPaletteSecondary). */
  glowColor?: string
  /** Teinte de la frange périphérique lointaine (défaut #1e1b4b ou uPaletteAccent). */
  outerColor?: string
  /** Rayon d'action et étalement spatial du dôme (0.3 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse de pulsation et respiration organique (0.0 à 0.8, défaut 0.15). */
  speed?: number
  /** Profondeur et décalage de parallaxe avec la caméra (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance et émission lumineuse centrale (0.2 à 2.5, défaut 1.2). */
  intensity?: number
  /** Perturbation atmosphérique et irrégularité de la brume (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Position horizontale X du centre normalisée (-1.0 à 1.0, défaut 0.0). */
  glowX?: number
  /** Position verticale Y du centre normalisée (-1.0 à 1.0, défaut 0.15). */
  glowY?: number
  /** Intensité du halo de bloom doux multi-échelle (0.0 à 2.0, défaut 0.85). */
  bloomStrength?: number
  /** Interaction volumétrique avec la brume dérivante (0.0 à 1.5, défaut 0.65). */
  fogInteraction?: number
  /** Température et incandescence du cœur par rapport au halo plus froid (0.0 à 1.5, défaut 0.85). */
  coreWarmth?: number
}

export class VolumetricGlowInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'volumetric_glow'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: VolumetricGlowProps
  private coreColorVec: THREE.Color
  private glowColorVec: THREE.Color
  private outerColorVec: THREE.Color

  constructor(id: string, props: VolumetricGlowProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.coreColorVec = new THREE.Color(props.coreColor ?? '#fef08a')
    this.glowColorVec = new THREE.Color(props.glowColor ?? '#38bdf8')
    this.outerColorVec = new THREE.Color(props.outerColor ?? '#1e1b4b')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.15
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.3
    const glowX = props.glowX ?? 0.0
    const glowY = props.glowY ?? 0.15
    const bloomStrength = props.bloomStrength ?? 0.85
    const fogInteraction = props.fogInteraction ?? 0.65
    const coreWarmth = props.coreWarmth ?? 0.85

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
        uCoreColor: { value: this.coreColorVec },
        uGlowColor: { value: this.glowColorVec },
        uOuterColor: { value: this.outerColorVec },
        uUseCustomColors: {
          value: Boolean(props.coreColor || props.glowColor || props.outerColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uGlowX: { value: glowX },
        uGlowY: { value: glowY },
        uBloomStrength: { value: bloomStrength },
        uFogInteraction: { value: fogInteraction },
        uCoreWarmth: { value: coreWarmth },
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
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCoreColor;
        uniform vec3 uGlowColor;
        uniform vec3 uOuterColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uGlowX;
        uniform float uGlowY;
        uniform float uBloomStrength;
        uniform float uFogInteraction;
        uniform float uCoreWarmth;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Centre de la lueur avec parallaxe souris et léger décalage scroll
          vec2 center = vec2(uGlowX * aspect * 0.5, uGlowY * 0.5);
          center += uMouse * (uDepth * 0.16);
          center.y += uScroll * 0.00025 * uDepth;

          float baseDist = length(p - center);

          // Respiration organique très légère (~2.5% sur le rayon et la radiance)
          float breathWave = sin(t * 1.15) * 0.62 + cos(t * 1.87 + 1.1) * 0.38;
          float radiusBreath = 1.0 + breathWave * 0.025;
          float radianceBreath = 1.0 + breathWave * 0.045;

          float radius = max(0.12, 0.72 * uDensity * radiusBreath);
          float r = baseDist / radius;

          // Découpe lointaine douce pour éviter tout bord net
          float farFade = smoothstep(2.45, 0.55, r);
          if (farFade <= 0.002) {
            discard;
          }

          // Décroissance physique réaliste avec la distance :
          // 1. Cœur incandescent adouci (gaussienne centrale + inverse-carré sans rebord de disque)
          float coreProfile = exp(-r * r * 36.0) * 0.55 + (1.0 / (1.0 + pow(r / 0.12, 1.85))) * 0.65;
          // 2. Halo de bloom doux multi-échelle (diffusion de Mie)
          float mieBloom = (1.0 / (1.0 + pow(r / 0.34, 2.25))) * (0.72 + 0.28 * exp(-r * 2.1));
          // 3. Périphérie atmosphérique étendue (diffusion de Rayleigh)
          float rayleighHalo = (exp(-r * r * 1.55) * 0.54 + (1.0 / (1.0 + pow(r / 0.85, 2.0))) * 0.46) * farFade;

          // Interaction volumétrique avec la brume dérivante (diffusion vers l'avant + volutes occultantes)
          float fogScatter = 1.0;
          float fogVeil = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Brume 2 octaves interagissant avec le halo ===
            vec2 fogCoord = p * 1.85 + vec2(t * 0.22, t * 0.05) + uMouse * (uDepth * 0.06);
            float f1 = snoise(fogCoord);
            float f2 = snoise(fogCoord * 2.4 - vec2(t * 0.28, -t * 0.11));
            float fogField = f1 * 0.64 + f2 * 0.36;

            float mistZone = smoothstep(0.06, 0.50, r) * (0.68 + 0.32 * smoothstep(0.55, -0.35, p.y));
            float scatterBoost = smoothstep(-0.18, 0.62, fogField) * (0.44 + uRandomness * 0.28) * uFogInteraction * mistZone;
            float fogShadow = smoothstep(0.18, 0.82, -fogField) * (0.46 + uRandomness * 0.24) * uFogInteraction * mistZone;
            fogScatter = max(0.30, 1.0 + scatterBoost - fogShadow);
            fogVeil = max(0.0, scatterBoost) * 0.26;

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Brume 1 octave en interaction avec le halo ===
            vec2 fogCoord = p * 1.7 + vec2(t * 0.18, t * 0.04);
            float fogField = snoise(fogCoord);
            float mistZone = smoothstep(0.10, 0.55, r);
            float scatterBoost = fogField * (0.28 + uRandomness * 0.20) * uFogInteraction * mistZone;
            fogScatter = clamp(1.0 + scatterBoost, 0.45, 1.45);
          }

          vec3 cCore = uUseCustomColors ? uCoreColor : uPalettePrimary;
          vec3 cGlow = uUseCustomColors ? uGlowColor : uPaletteSecondary;
          vec3 cOuter = uUseCustomColors ? uOuterColor : uPaletteAccent;

          // Cœur nettement plus chaud et incandescent que le halo plus froid
          vec3 hotCoreTint = mix(cCore, vec3(1.0, 0.96, 0.85), clamp(0.42 * uCoreWarmth, 0.0, 0.88));
          vec3 bloomTint = mix(mix(cCore, hotCoreTint, 0.25), cGlow, smoothstep(0.06, 0.48, r));
          vec3 outerTint = mix(cGlow, cOuter, smoothstep(0.22, 1.15, r));

          float intensityScale = uIntensity * radianceBreath;
          vec3 coreRgb = hotCoreTint * coreProfile * (1.18 + 0.38 * uCoreWarmth) * intensityScale;
          vec3 bloomRgb = bloomTint * mieBloom * (0.68 * uBloomStrength) * intensityScale * fogScatter;
          vec3 outerRgb = outerTint * rayleighHalo * (0.42 + fogVeil) * intensityScale * fogScatter;

          vec3 rawRgb = coreRgb + bloomRgb + outerRgb;
          // Compression douce façon filmic/HDR pour préserver la richesse du dégradé sans écraser en blanc plat
          vec3 finalRgb = rawRgb / (1.0 + rawRgb * 0.32);

          float luminance = max(finalRgb.r, max(finalRgb.g, finalRgb.b));
          float alpha = clamp((coreProfile * 0.85 + mieBloom * 0.65 * uBloomStrength + rayleighHalo * 0.45) * fogScatter * uIntensity * 0.72, 0.0, 0.95);

          if (luminance <= 0.004 || alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -11 // Devant les rayons (-12), sous le vacillement (-10)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<VolumetricGlowProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.coreColor !== undefined) {
      this.coreColorVec.set(newProps.coreColor)
      this.material.uniforms.uCoreColor.value = this.coreColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.glowColor !== undefined) {
      this.glowColorVec.set(newProps.glowColor)
      this.material.uniforms.uGlowColor.value = this.glowColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.outerColor !== undefined) {
      this.outerColorVec.set(newProps.outerColor)
      this.material.uniforms.uOuterColor.value = this.outerColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.glowX !== undefined) this.material.uniforms.uGlowX.value = newProps.glowX
    if (newProps.glowY !== undefined) this.material.uniforms.uGlowY.value = newProps.glowY
    if (newProps.bloomStrength !== undefined)
      this.material.uniforms.uBloomStrength.value = newProps.bloomStrength
    if (newProps.fogInteraction !== undefined)
      this.material.uniforms.uFogInteraction.value = newProps.fogInteraction
    if (newProps.coreWarmth !== undefined)
      this.material.uniforms.uCoreWarmth.value = newProps.coreWarmth
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

export const VolumetricGlowDefinition: IBrickDefinition<VolumetricGlowProps> = {
  type: 'volumetric_glow',
  category: 'atmosphere',
  create: (id, props, context) => new VolumetricGlowInstance(id, props, context),
}

BrickRegistry.register(VolumetricGlowDefinition)
