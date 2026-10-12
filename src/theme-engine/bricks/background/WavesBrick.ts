/**
 * src/theme-engine/bricks/background/WavesBrick.ts
 *
 * Brique de fond Vagues & Houle Océanique (Couche 1 : Background).
 * Simulation de trains d'ondes de Gerstner croisés en perspective,
 * crêtes aiguisées avec formation d'écume dynamique, reflets spéculaires et dégradé abyssal.
 * Adaptation aux paliers HIGH (4 trains d'ondes + écume texturée), MEDIUM (2 trains) et LOW (1 train).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Vagues.
 */
export interface WavesProps {
  /** Couleur des crêtes et de l'écume (défaut #f8fafc ou uPaletteAccent). */
  crestColor?: string
  /** Couleur des creux et des profondeurs abyssales (défaut #091729 ou uPaletteSecondary). */
  deepColor?: string
  /** Fréquence spatiale des trains de vagues (défaut 1.0). */
  density?: number
  /** Vitesse de déferlement et de propagation (défaut 0.3). */
  speed?: number
  /** Inclinaison perspective et parallaxe avec la souris (défaut 0.35). */
  depth?: number
  /** Hauteur relative des crêtes et contraste (défaut 1.0). */
  intensity?: number
  /** Houle croisée et turbulence irrégulière (défaut 0.4). */
  randomness?: number
  /** Acuité et cambrure des crêtes de vagues (défaut 0.6). */
  waveSteepness?: number
}

export class WavesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'waves'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WavesProps
  private crestColorVec: THREE.Color
  private deepColorVec: THREE.Color

  constructor(id: string, props: WavesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.crestColorVec = new THREE.Color(props.crestColor ?? '#f8fafc')
    this.deepColorVec = new THREE.Color(props.deepColor ?? '#091729')

    const speed = props.speed ?? 0.3
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const waveSteepness = props.waveSteepness ?? 0.6

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uCrestColor: { value: this.crestColorVec },
        uDeepColor: { value: this.deepColorVec },
        uUseCustomColors: {
          value: Boolean(props.crestColor || props.deepColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSteepness: { value: waveSteepness },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9994, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCrestColor;
        uniform vec3 uDeepColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSteepness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        // Calcule la hauteur d'une onde Gerstner 2D approchée
        float gerstnerWave(vec2 p, vec2 dir, float steepness, float wavelength, float speed, float time) {
          float k = 6.28318 / wavelength;
          float c = sqrt(9.8 / k);
          float proj = dot(dir, p);
          float f = k * (proj - c * speed * time);
          // Fonction en crête aiguë (sharpened peaks)
          return 2.0 * pow((sin(f) + 1.0) * 0.5, steepness);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Perspective simulée : plus on monte dans l'écran, plus on est loin vers l'horizon
          float persp = max(0.08, uv.y * 1.5 + 0.1);
          vec2 p = vec2((uv.x - 0.5) * aspect / persp, 1.0 / persp) * (3.5 * uDensity);

          // Parallaxe souris
          p += uMouse * (uDepth * 0.3);

          float t = uTime * uSpeed;

          // 1er train d'onde majeur
          vec2 d1 = normalize(vec2(0.3, 1.0));
          float h1 = gerstnerWave(p, d1, 1.5 + uSteepness, 4.0, 1.0, t);

          float totalHeight = h1 * 0.5;

          // 2ème train d'onde croisé (MEDIUM & HIGH)
          if (uQualityLevel >= 1) {
            vec2 d2 = normalize(vec2(-0.4, 0.9 + uRandomness * 0.3));
            float h2 = gerstnerWave(p, d2, 1.8 + uSteepness, 2.5, 1.25, t * 1.1);
            totalHeight += h2 * 0.3;

            // 3ème & 4ème trains d'ondes fines (HIGH)
            if (uQualityLevel >= 2) {
              vec2 d3 = normalize(vec2(0.8, 0.6));
              float h3 = gerstnerWave(p, d3, 2.2, 1.2, 1.6, t * 1.35);
              totalHeight += h3 * 0.15;

              float n = snoise(p * 2.0 + vec2(t * 0.5, t * 0.3));
              totalHeight += n * (0.08 * uRandomness);
            }
          }

          // Écume sur les sommets
          float foamThreshold = 0.72 - (0.15 * uIntensity);
          float foam = smoothstep(foamThreshold, foamThreshold + 0.2, totalHeight);

          // Réflection spéculaire douce
          float specular = pow(max(0.0, totalHeight - 0.3), 3.0) * 0.45;

          // Couleurs
          vec3 deep = uUseCustomColors ? uDeepColor : uPaletteSecondary;
          vec3 crest = uUseCustomColors ? uCrestColor : mix(uPaletteAccent, vec3(1.0), 0.7);
          vec3 midWater = mix(deep, uPalettePrimary, 0.45);

          // Dégradé selon la hauteur de la vague
          vec3 waterCol = mix(deep, midWater, clamp(totalHeight, 0.0, 1.0));
          waterCol += crest * (foam * uIntensity);
          waterCol += vec3(specular * uIntensity);

          // Brume atmosphérique vers l'horizon (haut de l'écran)
          float horizonFade = smoothstep(0.9, 0.4, uv.y);
          vec3 finalCol = mix(deep * 0.7, waterCol, horizonFade);

          gl_FragColor = vec4(finalCol, 1.0);
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

  public updateProps(newProps: Partial<WavesProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.crestColor !== undefined) {
      this.crestColorVec.set(newProps.crestColor)
      this.material.uniforms.uCrestColor.value = this.crestColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.deepColor !== undefined) {
      this.deepColorVec.set(newProps.deepColor)
      this.material.uniforms.uDeepColor.value = this.deepColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.waveSteepness !== undefined) this.material.uniforms.uSteepness.value = newProps.waveSteepness
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

export const WavesDefinition: IBrickDefinition<WavesProps> = {
  type: 'waves',
  category: 'background',
  create: (id, props, context) => new WavesInstance(id, props, context),
}

BrickRegistry.register(WavesDefinition)
