/**
 * src/theme-engine/bricks/background/WaterCausticsBrick.ts
 *
 * Brique de fond Eau & Caustiques Sous-Marines (Couche 1 : Background).
 * Simulation de réseau de lumière réfractée au fond de l'eau via interférence Voronoi,
 * absorption lumineuse selon la profondeur et dispersion chromatique en palier HIGH.
 * Adaptation aux paliers HIGH (double Voronoi + aberration chromatique), MEDIUM (Voronoi direct) et LOW.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D, GLSL_VORONOI_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour Eau & Caustiques.
 */
export interface WaterCausticsProps {
  /** Teinte de l'eau profonde (défaut #021a2f ou uPaletteSecondary). */
  waterColor?: string
  /** Teinte des filaments de lumière réfractée (défaut #38bdf8 ou uPalettePrimary). */
  causticColor?: string
  /** Finesse de la maille et compacité (défaut 1.0). */
  density?: number
  /** Vitesse de clapotis et d'ondulation aquatique (défaut 0.25). */
  speed?: number
  /** Profondeur d'immersion et sensibilité à la parallaxe (défaut 0.2). */
  depth?: number
  /** Netteté et contraste des arcs caustiques (défaut 1.2). */
  intensity?: number
  /** Facteur de turbulence liquide (défaut 0.35). */
  randomness?: number
  /** Échelle spatiale du maillage caustique (défaut 3.5). */
  causticScale?: number
}

export class WaterCausticsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'water_caustics'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WaterCausticsProps
  private waterColorVec: THREE.Color
  private causticColorVec: THREE.Color

  constructor(id: string, props: WaterCausticsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.waterColorVec = new THREE.Color(props.waterColor ?? '#021a2f')
    this.causticColorVec = new THREE.Color(props.causticColor ?? '#38bdf8')

    const speed = props.speed ?? 0.25
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.2
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.35
    const causticScale = props.causticScale ?? 3.5

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uWaterColor: { value: this.waterColorVec },
        uCausticColor: { value: this.causticColorVec },
        uUseCustomColors: {
          value: Boolean(props.waterColor || props.causticColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uCausticScale: { value: causticScale },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9995, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uWaterColor;
        uniform vec3 uCausticColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uCausticScale;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_VORONOI_2D}

        float sampleCaustics(vec2 p, float t, int quality) {
          // Turbulence de vagues de surface
          vec2 flow = vec2(snoise(p * 0.8 + t * 0.1), snoise(p * 0.8 - t * 0.12)) * (uRandomness * 0.6);
          vec2 p1 = p * uDensity + flow;
          vec2 p2 = p * (uDensity * 1.3) - flow + vec2(1.5, 3.2);

          vec2 v1 = voronoi2D(p1, t * 1.2);
          float c1 = pow(abs(v1.y - v1.x), 0.7);

          if (quality == 0) {
            return (1.0 - c1) * 1.4;
          }

          vec2 v2 = voronoi2D(p2, t * 0.9);
          float c2 = pow(abs(v2.y - v2.x), 0.7);

          // Interférence constructive des deux motifs caustiques
          float combined = min(c1, c2);
          return pow(1.0 - combined, 2.2) * 1.8;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y) * uCausticScale;

          // Parallaxe sous-marine
          p += uMouse * (uDepth * 0.25);

          float t = uTime * uSpeed;

          // Couleurs
          vec3 water = uUseCustomColors ? uWaterColor : uPaletteSecondary;
          vec3 caust = uUseCustomColors ? uCausticColor : uPalettePrimary;

          // Dégradé vertical d'absorption de la lumière par l'eau
          float depthGradient = smoothstep(0.0, 1.0, uv.y * 1.15);
          vec3 baseWater = mix(water * 0.5, water * 1.2, depthGradient);

          // Échantillonnage avec ou sans dispersion chromatique
          vec3 causticRgb = vec3(0.0);

          if (uQualityLevel >= 2) {
            // HIGH : Légère dispersion chromatique (aberration optique de l'eau)
            float rVal = sampleCaustics(p - vec2(0.015, 0.0), t, uQualityLevel);
            float gVal = sampleCaustics(p, t, uQualityLevel);
            float bVal = sampleCaustics(p + vec2(0.015, 0.0), t, uQualityLevel);
            causticRgb = vec3(rVal, gVal, bVal) * caust;
          } else {
            float val = sampleCaustics(p, t, uQualityLevel);
            causticRgb = caust * val;
          }

          // Modulation par l'intensité et la profondeur
          causticRgb *= (uIntensity * (0.6 + 0.4 * depthGradient));

          // Composition finale
          vec3 finalColor = baseWater + causticRgb;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -95
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<WaterCausticsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.waterColor !== undefined) {
      this.waterColorVec.set(newProps.waterColor)
      this.material.uniforms.uWaterColor.value = this.waterColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.causticColor !== undefined) {
      this.causticColorVec.set(newProps.causticColor)
      this.material.uniforms.uCausticColor.value = this.causticColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.causticScale !== undefined) this.material.uniforms.uCausticScale.value = newProps.causticScale
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

export const WaterCausticsDefinition: IBrickDefinition<WaterCausticsProps> = {
  type: 'water_caustics',
  category: 'background',
  create: (id, props, context) => new WaterCausticsInstance(id, props, context),
}

BrickRegistry.register(WaterCausticsDefinition)
