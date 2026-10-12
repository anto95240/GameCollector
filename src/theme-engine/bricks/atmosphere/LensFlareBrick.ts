/**
 * src/theme-engine/bricks/atmosphere/LensFlareBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere / Effet Optique).
 * Éblouissement optique cinématique de lentille de caméra (Lens Flare anamorphique),
 * comprenant coeur spéculaire, aigrettes de diffraction (starburst), halo spectral,
 * trait anamorphique horizontal étiré, et disques fantômes alignés sur l'axe optique
 * pivotant en direct avec le déplacement de la souris.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Lens Flare.
 */
export interface LensFlareProps {
  /** Teinte dominante de l'éblouissement optique (défaut #fde047 ou uPalettePrimary). */
  flareColor?: string
  /** Teinte secondaire / éclat anamorphique cinéma (défaut #06b6d4 ou uPaletteAccent). */
  accentColor?: string
  /** Échelle et épaisseur des artefacts et fantômes (0.3 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse de micro-scintillement des aigrettes (0.0 à 1.0, défaut 0.2). */
  speed?: number
  /** Sensibilité du pivotement de l'axe optique à la souris (0.0 à 1.0, défaut 0.5). */
  depth?: number
  /** Brillance et radiance globale de l'éblouissement (0.2 à 2.5, défaut 1.3). */
  intensity?: number
  /** Asymétrie et turbulence des aigrettes de diffraction (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Position horizontale X de la source de lumière (-1.0 à 1.0, défaut 0.4). */
  sourceX?: number
  /** Position verticale Y de la source de lumière (-1.0 à 1.0, défaut 0.5). */
  sourceY?: number
  /** Longueur de l'éclat anamorphique horizontal (0.2 à 2.5, défaut 1.2). */
  streakLength?: number
}

export class LensFlareInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'lens_flare'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: LensFlareProps
  private flareColorVec: THREE.Color
  private accentColorVec: THREE.Color

  constructor(id: string, props: LensFlareProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.flareColorVec = new THREE.Color(props.flareColor ?? '#fde047')
    this.accentColorVec = new THREE.Color(props.accentColor ?? '#06b6d4')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.5
    const intensity = props.intensity ?? 1.3
    const randomness = props.randomness ?? 0.35
    const sourceX = props.sourceX ?? 0.4
    const sourceY = props.sourceY ?? 0.5
    const streakLength = props.streakLength ?? 1.2

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
        uFlareColor: { value: this.flareColorVec },
        uAccentColor: { value: this.accentColorVec },
        uUseCustomColors: {
          value: Boolean(props.flareColor || props.accentColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSourceX: { value: sourceX },
        uSourceY: { value: sourceY },
        uStreakLength: { value: streakLength },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.970, 1.0);
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
        uniform vec3 uFlareColor;
        uniform vec3 uAccentColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSourceX;
        uniform float uSourceY;
        uniform float uStreakLength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule un disque fantôme optique (ghost flare)
        float ghostArtifact(vec2 p, vec2 center, float radius, float edge) {
          float d = length(p - center);
          return smoothstep(radius, radius * edge, d);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Position de la source lumineuse avec parallaxe dynamique à la souris
          vec2 sourcePos = vec2(uSourceX * aspect * 0.5, uSourceY * 0.5);
          vec2 mouseOffset = uMouse * (uDepth * 0.25);
          sourcePos += mouseOffset;

          // Vecteur vers la source et axe optique passant par le centre optique (0, 0)
          vec2 toSource = p - sourcePos;
          float distToSource = length(toSource);

          // 1. Cœur d'éblouissement central (Sunburst bloom)
          float coreBloom = exp(-distToSource * 7.0 / max(0.1, uDensity)) * 1.8;
          float wideBloom = exp(-distToSource * 2.2 / max(0.1, uDensity)) * 0.5;
          float bloom = coreBloom + wideBloom;

          // 2. Éclat anamorphique horizontal (horizontal streak cinématographique)
          float dY = abs(toSource.y);
          float dX = abs(toSource.x);
          float streakThickness = 0.015 * uDensity;
          float streakH = exp(-dY / max(0.001, streakThickness));
          float streakFalloff = exp(-dX * 1.5 / max(0.1, uStreakLength));
          float anamorphicStreak = streakH * streakFalloff * 1.6;

          // 3. Aigrettes de diffraction (Starburst 6 branches avec lente rotation optique)
          float starburst = 0.0;
          if (uQualityLevel >= 1) {
            float angle = atan(toSource.y, toSource.x) + t * 0.04;
            // 6 branches fines avec déphasage
            float spike = pow(abs(cos(angle * 3.0 + 0.2)), 28.0);
            float spikeCross = pow(abs(sin(angle * 3.0 + 0.2)), 28.0) * 0.5;
            float shimmer = 1.0 + snoise(vec2(angle * 4.0, t * 1.5)) * (uRandomness * 0.3);
            starburst = (spike + spikeCross) * exp(-distToSource * 3.5 / max(0.1, uDensity)) * shimmer * 0.85;
          }

          // 4. Anneau de diffraction spectral (Diffraction halo ring)
          float ring = 0.0;
          if (uQualityLevel >= 1) {
            float ringRadius = 0.38 * uDensity;
            float ringDist = abs(distToSource - ringRadius);
            ring = exp(-ringDist * 22.0) * 0.45;
          }

          // 5. Fantômes optiques sur l'axe optique (Ghost artifacts)
          float ghosts = 0.0;
          vec2 opticalAxis = -sourcePos; // Vecteur de la source vers le centre opposé

          if (uQualityLevel >= 2) {
            // HIGH : 4 fantômes étagés
            vec2 g1 = sourcePos + opticalAxis * 0.4;
            vec2 g2 = sourcePos + opticalAxis * 0.75;
            vec2 g3 = sourcePos + opticalAxis * 1.3;
            vec2 g4 = sourcePos + opticalAxis * 1.75;

            ghosts += ghostArtifact(p, g1, 0.12 * uDensity, 0.7) * 0.45;
            ghosts += ghostArtifact(p, g2, 0.22 * uDensity, 0.85) * 0.35;
            ghosts += ghostArtifact(p, g3, 0.07 * uDensity, 0.4) * 0.55;
            ghosts += ghostArtifact(p, g4, 0.32 * uDensity, 0.9) * 0.25;
          } else if (uQualityLevel >= 1) {
            // MEDIUM : 2 fantômes
            vec2 g1 = sourcePos + opticalAxis * 0.55;
            vec2 g2 = sourcePos + opticalAxis * 1.2;
            ghosts += ghostArtifact(p, g1, 0.15 * uDensity, 0.75) * 0.4;
            ghosts += ghostArtifact(p, g2, 0.25 * uDensity, 0.85) * 0.3;
          }

          // Total de l'intensité optique
          float totalFlare = (bloom + anamorphicStreak + starburst + ring + ghosts) * uIntensity;

          if (totalFlare <= 0.005) {
            discard;
          }

          vec3 baseFlare = uUseCustomColors ? uFlareColor : uPalettePrimary;
          vec3 streakTint = uUseCustomColors ? uAccentColor : uPaletteAccent;

          // Composition des couleurs cinéma : le trait horizontal et les fantômes prennent l'accent bleu/cyan
          vec3 finalColor = baseFlare * (bloom + starburst);
          finalColor += streakTint * (anamorphicStreak * 1.4 + ring * 1.1 + ghosts * 1.2);

          // Cœur chaud étincelant blanc
          float superCore = exp(-distToSource * 22.0) * 1.5;
          finalColor += vec3(1.0, 0.98, 0.95) * superCore * uIntensity;

          gl_FragColor = vec4(finalColor, clamp(totalFlare * 0.85, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 5 // Couche atmosphère / optique de premier plan
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<LensFlareProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.flareColor !== undefined) {
      this.flareColorVec.set(newProps.flareColor)
      this.material.uniforms.uFlareColor.value = this.flareColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.accentColor !== undefined) {
      this.accentColorVec.set(newProps.accentColor)
      this.material.uniforms.uAccentColor.value = this.accentColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.sourceX !== undefined) this.material.uniforms.uSourceX.value = newProps.sourceX
    if (newProps.sourceY !== undefined) this.material.uniforms.uSourceY.value = newProps.sourceY
    if (newProps.streakLength !== undefined)
      this.material.uniforms.uStreakLength.value = newProps.streakLength
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

export const LensFlareDefinition: IBrickDefinition<LensFlareProps> = {
  type: 'lens_flare',
  category: 'atmosphere',
  create: (id, props, context) => new LensFlareInstance(id, props, context),
}

BrickRegistry.register(LensFlareDefinition)
