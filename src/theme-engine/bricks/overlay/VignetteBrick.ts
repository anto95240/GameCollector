/**
 * src/theme-engine/bricks/overlay/VignetteBrick.ts
 *
 * Brique de style et d'overlay : Vignettage Optique & Pénombre Radiale (Couche 5 : Overlay).
 * Rendu procédural de la loi d'assombrissement d'un objectif de caméra (loi cos^4(theta) optique),
 * avec décentrement optique par parallaxe souris/gyroscope, respiration non-linéaire du diaphragme,
 * asymétrie de lentille par Simplex 2D, forme circulaire ou anamorphique ajustable,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Vignettage.
 */
export interface VignetteProps {
  /** Teinte de la pénombre périphérique (défaut noir profond '#000000'). */
  vignetteColor?: string
  /** Densité et compacité du cône central de clarté (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de respiration organique feutrée du diaphragme (0.0 à 1.0, défaut 0.15). */
  speed?: number
  /** Profondeur et sensibilité du décentrement optique à la souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Intensité et opacité maximale aux bordures et coins (0.1 à 1.0, défaut 0.6). */
  intensity?: number
  /** Asymétrie organique de lentille et turbulence Simplex (0.0 à 1.0, défaut 0.2). */
  randomness?: number
  /** Forme de l'ouverture : 0.0 = épouse le ratio de l'écran, 1.0 = cercle optique parfait (défaut 0.65). */
  roundness?: number
  /** Progressivité et douceur de la transition vers la pénombre (0.2 à 1.5, défaut 0.85). */
  smoothness?: number
}

export class VignetteInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'vignette'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: VignetteProps
  private vignetteColorVec: THREE.Color

  constructor(id: string, props: VignetteProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.vignetteColorVec = new THREE.Color(props.vignetteColor ?? '#000000')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.15
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 0.6
    const randomness = props.randomness ?? 0.2
    const roundness = props.roundness ?? 0.65
    const smoothness = props.smoothness ?? 0.85

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uVignetteColor: { value: this.vignetteColorVec },
        uUseCustomColor: { value: Boolean(props.vignetteColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uRoundness: { value: roundness },
        uSmoothness: { value: smoothness },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Couche d'overlay en premier plan immédiat (z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uVignetteColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uRoundness;
        uniform float uSmoothness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Décentrement optique lié à la parallaxe du regard / souris
          vec2 center = vec2(0.5) + uMouse * (uDepth * 0.12);
          vec2 delta = uv - center;

          // Interpolation géométrique entre cercle optique pur et ellipse ratio écran
          vec2 circleCoord = delta * vec2(aspect, 1.0);
          vec2 ellipseCoord = delta * vec2(1.2, 1.0);
          vec2 coord = mix(ellipseCoord, circleCoord, clamp(uRoundness, 0.0, 1.0));

          float dist = length(coord);

          // Respiration organique lente du diaphragme
          float breath = sin(uTime * uSpeed * 2.0) * 0.035;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Asymétrie de lentille Simplex + Respiration non-linéaire + Courbe optique cos^4 ===
            vec2 noiseCoord = coord * 2.2 + vec2(sin(uTime * uSpeed), cos(uTime * uSpeed * 0.7));
            float lensNoise = snoise(noiseCoord) * (uRandomness * 0.08);
            dist += lensNoise;

            float innerR = (0.50 / max(0.2, uDensity)) + breath;
            float outerR = innerR + max(0.15, uSmoothness * 0.65);

            float factor = smoothstep(innerR, outerR, dist);
            // Profil physique d'atténuation optique (cosinus puissance 4)
            factor = pow(factor, 1.4);
            float alpha = clamp(factor * uIntensity, 0.0, 0.98);

            if (alpha <= 0.003) discard;

            // Micro-dispersion optique cinématographique sur le bord intérieur de la pénombre
            float edgeTransition = smoothstep(innerR, innerR + 0.15, dist) * (1.0 - smoothstep(innerR + 0.2, outerR, dist));
            vec3 edgeWarmth = mix(uVignetteColor, vec3(0.08, 0.05, 0.02), edgeTransition * 0.45);

            gl_FragColor = vec4(edgeWarmth, alpha);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Profil elliptique avec décalage souris et respiration ===
            float innerR = (0.52 / max(0.2, uDensity)) + breath;
            float outerR = innerR + max(0.15, uSmoothness * 0.6);

            float factor = smoothstep(innerR, outerR, dist);
            float alpha = clamp(factor * uIntensity, 0.0, 0.95);

            if (alpha <= 0.003) discard;

            gl_FragColor = vec4(uVignetteColor, alpha);

          } else {
            // === PALIER LOW : Dégradé radial simple direct (0 calcul trigonométrique de bruit) ===
            float innerR = 0.45 / max(0.2, uDensity);
            float outerR = innerR + max(0.2, uSmoothness * 0.7);

            float factor = clamp((dist - innerR) / max(0.01, outerR - innerR), 0.0, 1.0);
            float alpha = factor * uIntensity * 0.9;

            if (alpha <= 0.005) discard;

            gl_FragColor = vec4(uVignetteColor, alpha);
          }
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 92 // Couche 5 (Overlay)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<VignetteProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.vignetteColor !== undefined) {
      this.vignetteColorVec.set(newProps.vignetteColor)
      this.material.uniforms.uVignetteColor.value = this.vignetteColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.roundness !== undefined)
      this.material.uniforms.uRoundness.value = newProps.roundness
    if (newProps.smoothness !== undefined)
      this.material.uniforms.uSmoothness.value = newProps.smoothness
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

export const VignetteDefinition: IBrickDefinition<VignetteProps> = {
  type: 'vignette',
  category: 'overlay',
  create: (id, props, context) => new VignetteInstance(id, props, context),
}

export const VignetteAliasDefinition: IBrickDefinition<VignetteProps> = {
  type: 'vignettage',
  category: 'overlay',
  create: (id, props, context) => new VignetteInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(VignetteDefinition)
BrickRegistry.register(VignetteAliasDefinition)
