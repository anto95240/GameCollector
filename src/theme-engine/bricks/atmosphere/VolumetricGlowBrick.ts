/**
 * src/theme-engine/bricks/atmosphere/VolumetricGlowBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Lueur volumétrique atmosphérique et diffusion céleste (halo de lune géante, orbe mystique, soleil voilé),
 * simulant la diffusion de Mie et Rayleigh avec coeur incandescent saturé,
 * respiration lente non-linéaire, frange atmosphérique perturbée par bruit Simplex,
 * et transition spectrale 3 teintes (coeur / halo / périphérie).
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
  /** Perturbation atmosphérique de la frange circulaire (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Position horizontale X du centre normalisée (-1.0 à 1.0, défaut 0.0). */
  glowX?: number
  /** Position verticale Y du centre normalisée (-1.0 à 1.0, défaut 0.15). */
  glowY?: number
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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Centre du dôme avec parallaxe souris
          vec2 center = vec2(uGlowX * aspect * 0.5, uGlowY * 0.5);
          vec2 mouseOffset = uMouse * (uDepth * 0.16);
          center += mouseOffset;

          vec2 dir = p - center;
          float baseDist = length(dir);

          // Respiration lente et asynchrone du dôme atmosphérique
          float pulse = 1.0 + sin(t * 1.6) * 0.06 + cos(t * 2.3) * 0.04;

          float radius = 0.7 * uDensity * pulse;
          float dist = baseDist;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Frange atmosphérique ondulante par Simplex FBM ===
            float angle = atan(dir.y, dir.x);
            float rimNoise = snoise(vec2(cos(angle) * 3.5 + t * 0.3, sin(angle) * 3.5 - t * 0.2)) * (uRandomness * 0.12);
            float microHaze = snoise(p * 4.0 + vec2(t * 0.1, t * 0.05)) * (uRandomness * 0.08);
            dist = baseDist + rimNoise * smoothstep(0.1, 0.8, baseDist / radius) + microHaze;
          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Perturbation angulaire douce ===
            float angle = atan(dir.y, dir.x);
            float rimNoise = snoise(vec2(cos(angle) * 2.0 + t * 0.2, sin(angle) * 2.0)) * (uRandomness * 0.08);
            dist = baseDist + rimNoise;
          }

          // Profil de diffusion volumétrique Mie + Rayleigh
          // 1. Coeur incandescent très dense (Mie forward scattering)
          float coreFactor = exp(-dist * 9.5 / max(0.1, radius)) * 2.2;
          // 2. Halo intermédiaire diffus
          float glowFactor = exp(-dist * 3.4 / max(0.1, radius)) * 0.95;
          // 3. Voile atmosphérique lointain (Rayleigh)
          float outerFactor = exp(-dist * 1.5 / max(0.1, radius)) * 0.45;

          float totalGlow = (coreFactor + glowFactor + outerFactor) * uIntensity;

          if (totalGlow <= 0.005) {
            discard;
          }

          vec3 cCore = uUseCustomColors ? uCoreColor : uPalettePrimary;
          vec3 cGlow = uUseCustomColors ? uGlowColor : uPaletteSecondary;
          vec3 cOuter = uUseCustomColors ? uOuterColor : uPaletteAccent;

          // Interpolation chromatique 3 paliers
          float normDist = clamp(dist / max(0.1, radius), 0.0, 1.0);
          vec3 col;
          if (normDist < 0.35) {
            col = mix(cCore, cGlow, normDist / 0.35);
            // Rehausse de sur-saturation au coeur
            col = mix(col, vec3(1.0, 0.98, 0.92), (1.0 - normDist / 0.35) * 0.5);
          } else {
            col = mix(cGlow, cOuter, (normDist - 0.35) / 0.65);
          }

          vec3 finalRgb = col * totalGlow;

          gl_FragColor = vec4(finalRgb, clamp(totalGlow * 0.75, 0.0, 1.0));
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
