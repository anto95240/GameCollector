/**
 * src/theme-engine/bricks/background/GradientSkyBrick.ts
 *
 * Brique de fond plein écran (Couche 1 : Background).
 * Ciel dégradé atmosphérique dynamique avec transition zénith/horizon,
 * lueur d'horizon, variations organiques non-linéaires via bruit de Simplex GLSL,
 * et adaptation dynamique aux paliers HIGH, MEDIUM et LOW.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Ciel Dégradé.
 */
export interface GradientSkyProps {
  /** Couleur au zénith (haut du ciel). Si absent, utilise uPaletteSecondary. */
  topColor?: string
  /** Couleur au nadir/sol (bas du ciel). Si absent, utilise uPalettePrimary. */
  bottomColor?: string
  /** Couleur de la lueur d'horizon. Si absent, utilise uPaletteAccent. */
  horizonColor?: string
  /** Courbure et densité du dégradé (0.5 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de dérive et de pulsation atmosphérique (défaut 0.2). */
  speed?: number
  /** Profondeur et réactivité à la parallaxe de la caméra (défaut 0.1). */
  depth?: number
  /** Intensité lumineuse et contraste général (défaut 1.0). */
  intensity?: number
  /** Facteur d'aléatoire et de turbulence organique (0.0 à 1.0, défaut 0.15). */
  randomness?: number
  /** Échelle du bruit de fond (défaut 1.2). */
  noiseScale?: number
}

export class GradientSkyInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'gradient_sky'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: GradientSkyProps
  private topColorVec: THREE.Color
  private bottomColorVec: THREE.Color
  private horizonColorVec: THREE.Color

  constructor(id: string, props: GradientSkyProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.topColorVec = new THREE.Color(props.topColor ?? '#0f172a')
    this.bottomColorVec = new THREE.Color(props.bottomColor ?? '#001428')
    this.horizonColorVec = new THREE.Color(props.horizonColor ?? '#00f0ff')

    const speed = props.speed ?? 0.2
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.1
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.15
    const noiseScale = props.noiseScale ?? 1.2

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uTopColor: { value: this.topColorVec },
        uBottomColor: { value: this.bottomColorVec },
        uHorizonColor: { value: this.horizonColorVec },
        uUseCustomColors: {
          value: Boolean(props.topColor || props.bottomColor || props.horizonColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uNoiseScale: { value: noiseScale },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uHorizonColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uNoiseScale;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          float t = uTime * uSpeed;

          // Influence amortie de la souris pour la parallaxe
          vec2 mouseOffset = uMouse * (uDepth * 0.15);
          vec2 p = uv + mouseOffset;

          float organicNoise = 0.0;
          if (uQualityLevel >= 1) {
            // HIGH ou MEDIUM : perturbation organique
            float n1 = snoise(p * uNoiseScale + vec2(t * 0.04, t * 0.02));
            organicNoise = n1 * uRandomness;

            if (uQualityLevel >= 2) {
              // HIGH : 2ème octave de détail fin
              float n2 = snoise(p * (uNoiseScale * 2.5) - vec2(t * 0.03, t * 0.07));
              organicNoise += n2 * (uRandomness * 0.4);
            }
          }

          // Courbure non-linéaire du dégradé vertical
          float gradY = clamp(pow(uv.y, uDensity) + organicNoise, 0.0, 1.0);

          vec3 colTop = uUseCustomColors ? uTopColor : uPaletteSecondary;
          vec3 colBottom = uUseCustomColors ? uBottomColor : uPalettePrimary;
          vec3 colHorizon = uUseCustomColors ? uHorizonColor : uPaletteAccent;

          // Dégradé principal
          vec3 col = mix(colBottom, colTop, smoothstep(0.0, 1.0, gradY));

          // Lueur d'horizon organique
          float horizonDist = abs(uv.y - 0.28 + organicNoise * 0.5);
          float horizonGlow = exp(-horizonDist * 5.0) * (0.35 * uIntensity);
          col += colHorizon * horizonGlow;

          // Modulation subtile d'intensité globale
          col *= uIntensity;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -100
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<GradientSkyProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.topColor !== undefined) {
      this.topColorVec.set(newProps.topColor)
      this.material.uniforms.uTopColor.value = this.topColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.bottomColor !== undefined) {
      this.bottomColorVec.set(newProps.bottomColor)
      this.material.uniforms.uBottomColor.value = this.bottomColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.horizonColor !== undefined) {
      this.horizonColorVec.set(newProps.horizonColor)
      this.material.uniforms.uHorizonColor.value = this.horizonColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.noiseScale !== undefined) this.material.uniforms.uNoiseScale.value = newProps.noiseScale
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

export const GradientSkyDefinition: IBrickDefinition<GradientSkyProps> = {
  type: 'gradient_sky',
  category: 'background',
  create: (id, props, context) => new GradientSkyInstance(id, props, context),
}

BrickRegistry.register(GradientSkyDefinition)
