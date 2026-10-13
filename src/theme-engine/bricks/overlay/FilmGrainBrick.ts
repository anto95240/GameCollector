/**
 * src/theme-engine/bricks/overlay/FilmGrainBrick.ts
 *
 * Brique de style et d'overlay : Grain Argentique Cinéma (Couche 5 : Overlay).
 * Rendu procédural de grain argentique 35mm / 16mm photochimique haute fréquence,
 * avec émulsion à micro-agrégats (clumpiness) par Simplex 2D, défilement cadencé à 24 FPS
 * avec gigue temporelle (jitter), dispersion chromatique subtile, sensibilité parallaxe,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Grain Argentique.
 */
export interface FilmGrainProps {
  /** Teinte personnalisée des cristaux de grain. Si non spécifié, utilise blanc pur/argentique. */
  grainColor?: string
  /** Densité spatiale et finesse des cristaux (0.4 à 3.0, défaut 1.2). */
  density?: number
  /** Vitesse de défilement temporel du grain argentique (0.1 à 2.5, défaut 0.8). */
  speed?: number
  /** Profondeur focale et sensibilité à la parallaxe souris (0.0 à 1.0, défaut 0.2). */
  depth?: number
  /** Intensité et contraste du grain argentique (0.02 à 0.45, défaut 0.12). */
  intensity?: number
  /** Facteur d'agrégation d'émulsion et gigue stochastique (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Grain monochrome (true) ou micro-bruit chromatique argentique (false, défaut true). */
  monochrome?: boolean
  /** Taille des amas d'émulsion argentique (0.5 à 3.0, défaut 1.0). */
  clumpSize?: number
}

export class FilmGrainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'grain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: FilmGrainProps
  private grainColorVec: THREE.Color

  constructor(id: string, props: FilmGrainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.grainColorVec = new THREE.Color(props.grainColor ?? '#ffffff')

    const density = props.density ?? 1.2
    const speed = props.speed ?? 0.8
    const depth = props.depth ?? 0.2
    const intensity = props.intensity ?? 0.12
    const randomness = props.randomness ?? 0.5
    const monochrome = props.monochrome !== false
    const clumpSize = props.clumpSize ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uGrainColor: { value: this.grainColorVec },
        uUseCustomColor: { value: Boolean(props.grainColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uMonochrome: { value: monochrome },
        uClumpSize: { value: clumpSize },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Couche d'overlay au premier plan immédiat (clip space z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uGrainColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform bool uMonochrome;
        uniform float uClumpSize;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}
        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          vec2 p = gl_FragCoord.xy;

          // Parallaxe subtile de lentille et scroll
          vec2 mouseOffset = uMouse * (uDepth * 15.0);
          p += mouseOffset + vec2(0.0, uScroll * 20.0);

          // Cadence cinématographique (24 fps au lieu de 60 fps pour un grain argentique réaliste)
          float fps = uQualityLevel == 0 ? 15.0 : 24.0;
          float frameIndex = floor(uTime * uSpeed * fps);
          vec2 frameJitter = hash22(vec2(frameIndex, frameIndex * 1.618033));

          float grainVal = 0.0;
          vec3 rgbNoise = vec3(0.0);

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Grain haute fréquence + Clumpiness Simplex + Jitter temporel ===
            vec2 grainCoord = p * (0.85 * uDensity) + frameJitter * 256.0;
            float fineGrain = hash12(grainCoord) - 0.5;

            // Micro-agrégats d'émulsion argentique (clumpiness)
            vec2 clumpCoord = uv * (85.0 * (uDensity / max(0.3, uClumpSize))) + frameJitter * 8.0;
            float emulsionClump = snoise(clumpCoord) * (uRandomness * 0.45);

            // Modulation organique combinée
            grainVal = fineGrain * 1.5 + emulsionClump;

            if (!uMonochrome) {
              // Micro-dispersion chromatique (color dye clouds)
              float rNoise = (hash12(grainCoord + vec2(13.1, 7.3)) - 0.5) * 1.3 + emulsionClump;
              float gNoise = (hash12(grainCoord + vec2(27.4, 19.8)) - 0.5) * 1.3 + emulsionClump;
              float bNoise = (hash12(grainCoord + vec2(43.7, 31.2)) - 0.5) * 1.3 + emulsionClump;
              rgbNoise = vec3(rNoise, gNoise, bNoise);
            }
          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Grain haute fréquence optimisé avec jitter temporel ===
            vec2 grainCoord = p * (0.75 * uDensity) + frameJitter * 128.0;
            grainVal = (hash12(grainCoord) - 0.5) * 1.35;
          } else {
            // === PALIER LOW : Pseudo-noise direct rapide (15 fps) ===
            vec2 grainCoord = floor(p * 0.5) * (0.6 * uDensity) + frameJitter * 64.0;
            grainVal = (fract(sin(dot(grainCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 1.25;
          }

          // Seuil de découpe pour micro-cristaux
          float absGrain = abs(grainVal);
          float alpha = clamp(absGrain * (uIntensity * 2.8), 0.0, 0.72);

          if (alpha <= 0.003) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uGrainColor : vec3(1.0);
          vec3 finalRgb = vec3(0.0);

          if (!uMonochrome && uQualityLevel >= 2) {
            finalRgb = mix(baseColor * 0.4, baseColor * 1.4, rgbNoise * 0.5 + 0.5);
          } else {
            // Grain bipolaire (cristaux clairs argentiques et micro-grains d'ombre)
            finalRgb = grainVal > 0.0 ? baseColor : vec3(0.02, 0.02, 0.03);
          }

          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 90 // Couche 5 (Overlay)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<FilmGrainProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.grainColor !== undefined) {
      this.grainColorVec.set(newProps.grainColor)
      this.material.uniforms.uGrainColor.value = this.grainColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.monochrome !== undefined)
      this.material.uniforms.uMonochrome.value = newProps.monochrome
    if (newProps.clumpSize !== undefined)
      this.material.uniforms.uClumpSize.value = newProps.clumpSize
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

export const FilmGrainDefinition: IBrickDefinition<FilmGrainProps> = {
  type: 'grain',
  category: 'overlay',
  create: (id, props, context) => new FilmGrainInstance(id, props, context),
}

export const FilmGrainAliasDefinition: IBrickDefinition<FilmGrainProps> = {
  type: 'film_grain',
  category: 'overlay',
  create: (id, props, context) => new FilmGrainInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(FilmGrainDefinition)
BrickRegistry.register(FilmGrainAliasDefinition)
