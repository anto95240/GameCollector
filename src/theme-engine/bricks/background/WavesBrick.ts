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
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
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

        // Calcule la hauteur normalisée [0, 1] et la pente directionnelle d'un train d'onde Gerstner
        void addGerstnerWave(
          vec2 p,
          vec2 dir,
          float steepness,
          float wavelength,
          float speed,
          float time,
          float weight,
          inout float totalHeight,
          inout float totalSlope
        ) {
          float k = 6.2831853 / wavelength;
          float c = sqrt(9.80665 / k);
          float proj = dot(dir, p);
          float phase = k * (proj - c * speed * time);
          float sinP = sin(phase);
          float cosP = cos(phase);
          // Hauteur en crête aiguisée normalisée [0, 1]
          float h = pow(clamp((sinP + 1.0) * 0.5, 0.0, 1.0), steepness);
          totalHeight += h * weight;
          // Pente de vague projetée pour l'orientation des reflets spéculaires
          float slope = cosP * pow(clamp((sinP + 1.0) * 0.5, 0.0, 1.0), max(0.5, steepness - 1.0));
          totalSlope += max(0.0, slope) * weight;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Perspective réaliste d'un plan océanique infini :
          // uv.y = 0.0 (bas de l'écran) -> premier plan (grandes vagues déferlantes)
          // uv.y = 0.80+ (haut de l'écran) -> horizon lointain (vagues fines resserrées)
          float horizonY = 0.82;
          float v = clamp(uv.y / horizonY, 0.0, 1.0);
          float zDist = 1.0 / mix(1.0, 0.12, pow(v, 1.25));

          vec2 p = vec2((uv.x - 0.5) * aspect * zDist, zDist * 2.2) * (1.1 * uDensity);

          // Parallaxe souris avec amorti de profondeur
          p += uMouse * (uDepth * 0.45 * (1.0 + zDist * 0.08));

          float t = uTime * (uSpeed * 0.8);

          float totalHeight = 0.0;
          float totalSlope = 0.0;

          // Palier LOW (0) : 1 train d'onde dominant (optimisé mobile éco)
          if (uQualityLevel == 0) {
            vec2 d1 = normalize(vec2(0.25, 0.97));
            addGerstnerWave(p, d1, 1.2 + uSteepness, 4.5, 1.0, t, 1.0, totalHeight, totalSlope);
          }
          // Palier MEDIUM (1) : 2 trains d'ondes croisés
          else if (uQualityLevel == 1) {
            vec2 d1 = normalize(vec2(0.25, 0.97));
            addGerstnerWave(p, d1, 1.3 + uSteepness, 4.5, 1.0, t, 0.65, totalHeight, totalSlope);

            vec2 d2 = normalize(vec2(-0.45, 0.89 + uRandomness * 0.25));
            addGerstnerWave(p, d2, 1.6 + uSteepness, 2.6, 1.25, t * 1.15, 0.35, totalHeight, totalSlope);
          }
          // Palier HIGH (2) : 4 trains d'ondes croisés + micro-bruit organique
          else {
            vec2 d1 = normalize(vec2(0.25, 0.97));
            addGerstnerWave(p, d1, 1.4 + uSteepness, 4.8, 1.0, t, 0.48, totalHeight, totalSlope);

            vec2 d2 = normalize(vec2(-0.45, 0.89 + uRandomness * 0.25));
            addGerstnerWave(p, d2, 1.6 + uSteepness, 2.7, 1.22, t * 1.12, 0.28, totalHeight, totalSlope);

            vec2 d3 = normalize(vec2(0.75, 0.66));
            addGerstnerWave(p, d3, 2.0, 1.4, 1.45, t * 1.32, 0.15, totalHeight, totalSlope);

            vec2 d4 = normalize(vec2(-0.65, 0.76));
            addGerstnerWave(p, d4, 2.4, 0.8, 1.75, t * 1.55, 0.09, totalHeight, totalSlope);

            // Micro-turbulence organique de surface
            float micro = snoise(p * 2.5 + vec2(t * 0.4, t * 0.2)) * (0.04 * uRandomness);
            totalHeight = clamp(totalHeight + micro, 0.0, 1.0);
          }

          // Palette et nuances d'eau
          vec3 deep = uUseCustomColors ? uDeepColor : uPaletteSecondary;
          vec3 crest = uUseCustomColors ? uCrestColor : mix(uPaletteAccent, vec3(0.96), 0.75);
          vec3 midWater = mix(deep, uPalettePrimary, 0.45);
          vec3 shallowWater = mix(midWater, mix(uPalettePrimary, crest, 0.35), 0.50);

          // Dégradé océanique selon la hauteur : creux profonds -> flancs translucides
          vec3 waterCol = mix(deep, midWater, smoothstep(0.05, 0.50, totalHeight));
          waterCol = mix(waterCol, shallowWater, smoothstep(0.45, 0.82, totalHeight) * 0.55);

          // Écume dynamique (foam) uniquement sur la pointe des crêtes aiguisées
          float foamThreshold = mix(0.82, 0.62, clamp(uIntensity * 0.5, 0.0, 1.0));
          float foam = smoothstep(foamThreshold, foamThreshold + 0.16, totalHeight);

          if (uQualityLevel >= 2) {
            // HIGH : écume découpée et texturée par bruit Simplex (embruns et dentelle d'écume)
            float foamNoise = snoise(p * 4.5 + vec2(t * 0.6, -t * 0.3));
            foam *= smoothstep(-0.25, 0.35, foamNoise);
          }

          // Mélange physique de l'écume : remplace la teinte sans jamais surexposer
          float foamFactor = clamp(foam * uIntensity * 0.90, 0.0, 1.0);
          waterCol = mix(waterCol, crest, foamFactor);

          // Reflets spéculaires directionnels sur la pente exposée des crêtes
          if (uQualityLevel >= 1) {
            float specPower = uQualityLevel >= 2 ? 8.0 : 5.0;
            float specIntensity = uQualityLevel >= 2 ? 0.38 : 0.20;
            float spec = pow(clamp(totalSlope, 0.0, 1.0), specPower) * specIntensity;
            // Atténuation sur l'écume déjà lumineuse
            spec *= (1.0 - foamFactor * 0.75);
            vec3 specColor = mix(crest, vec3(1.0), 0.55);
            waterCol += specColor * (spec * clamp(uIntensity, 0.2, 1.4));
          }

          // Fondu atmosphérique vers l'horizon (haut de l'écran)
          float horizonFade = smoothstep(0.55, 0.88, uv.y);
          vec3 horizonMist = mix(deep * 0.85, midWater * 0.65, 0.40);
          vec3 finalCol = mix(waterCol, horizonMist, horizonFade);

          gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
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
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.waveSteepness !== undefined)
      this.material.uniforms.uSteepness.value = newProps.waveSteepness
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
