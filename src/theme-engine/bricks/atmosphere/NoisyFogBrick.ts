/**
 * src/theme-engine/bricks/atmosphere/NoisyFogBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Brume bruitée volumétrique avec nappe rampante et volutes dérivantes,
 * animée par FBM multi-octaves avec distorsion de domaine (domain warping),
 * atténuation d'élévation réaliste (height falloff), sillage dynamique
 * créé par le déplacement de la souris, et 3 paliers de qualité adaptatifs.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Brume Bruitée.
 */
export interface NoisyFogProps {
  /** Teinte dominante de la brume vaporeuse. Si absent, utilise uPaletteSecondary. */
  fogColor?: string
  /** Densité et opacité des bancs de brume (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent et turbulence atmosphérique (0.0 à 1.0, défaut 0.2). */
  speed?: number
  /** Profondeur d'étagement et réactivité à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Radiance et diffusion lumineuse dans la brume (0.2 à 2.0, défaut 1.0). */
  intensity?: number
  /** Facteur d'asymétrie et de domain warping chaotique (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Gradient d'atténuation vertical : brume rampante au sol vs diffuse (0.3 à 3.0, défaut 1.5). */
  heightFalloff?: number
  /** Angle de direction du vent en radians (-3.14 à 3.14, défaut 0.15). */
  windAngle?: number
}

export class NoisyFogInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'noisy_fog'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: NoisyFogProps
  private fogColorVec: THREE.Color

  constructor(id: string, props: NoisyFogProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.fogColorVec = new THREE.Color(props.fogColor ?? '#94a3b8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.35
    const heightFalloff = props.heightFalloff ?? 1.5
    const windAngle = props.windAngle ?? 0.15

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
        uFogColor: { value: this.fogColorVec },
        uUseCustomColor: { value: Boolean(props.fogColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHeightFalloff: { value: heightFalloff },
        uWindAngle: { value: windAngle },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.985, 1.0);
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
        uniform vec3 uFogColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHeightFalloff;
        uniform float uWindAngle;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Vecteur vent directionnel
          vec2 windDir = vec2(cos(uWindAngle), sin(uWindAngle)) * (t * 0.25);

          // Parallaxe souris et inertie
          vec2 mouseOffset = uMouse * (uDepth * 0.18);
          p += mouseOffset + windDir;

          // Effet de sillage et dispersion au passage de la souris (mouse wake)
          vec2 mCoord = (uMouse * 0.5) * vec2(aspect, 1.0);
          float distToMouse = length(p - mCoord);
          float mouseWake = smoothstep(0.45, 0.05, distToMouse) * (uDepth * 0.4);

          float fogDensity = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : 4 octaves FBM + double domain warping ===
            vec2 q = vec2(
              snoise(p * 1.2 + vec2(t * 0.12, t * 0.06)),
              snoise(p * 1.2 + vec2(4.8, 2.1) - vec2(t * 0.08, t * 0.14))
            );

            vec2 r = vec2(
              snoise(p * 2.0 + 3.0 * q + vec2(t * 0.05, -t * 0.08)),
              snoise(p * 2.0 + 3.0 * q + vec2(1.7, 9.2) + vec2(-t * 0.07, t * 0.04))
            );

            float fbmVal = fbm2D(p * 1.5 + r * (uRandomness * 1.8), 4);
            // Micro-tendrils vaporeux
            float detailNoise = snoise(p * 5.0 - vec2(t * 0.2, t * 0.1)) * 0.15;
            fogDensity = fbmVal + detailNoise - mouseWake;
          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : 2 octaves FBM + warping simple ===
            vec2 q = vec2(
              snoise(p * 1.3 + vec2(t * 0.1, t * 0.05)),
              snoise(p * 1.3 + vec2(3.1, 1.5) - t * 0.07)
            );
            float fbmVal = fbm2D(p * 1.4 + q * (uRandomness * 1.2), 2);
            fogDensity = fbmVal - mouseWake;
          } else {
            // === PALIER LOW : 1 octave Simplex étirée (ultra-léger) ===
            float n = snoise(p * 1.1 + vec2(t * 0.08, t * 0.04));
            fogDensity = n * 0.65;
          }

          // Atténuation d'élévation réaliste (nappe rampante au sol qui s'évapore vers le haut)
          float heightMask = exp(-uv.y * uHeightFalloff);
          // Voile d'ambiance résiduel sur l'ensemble de la scène
          heightMask = mix(0.22, 1.0, heightMask);

          // Calcule l'opacité finale organique
          float alpha = smoothstep(-0.25, 0.75, fogDensity) * heightMask * uDensity * 0.7;
          alpha = clamp(alpha * uIntensity, 0.0, 0.88);

          if (alpha <= 0.005) {
            discard;
          }

          // Teinte de la brume avec absorption lumineuse céleste
          vec3 baseFog = uUseCustomColor ? uFogColor : uPaletteSecondary;
          // Éclat d'horizon / lueur diffuse dans les crêtes de brume
          float crestLight = clamp(fogDensity * 0.45 + (1.0 - uv.y) * 0.25, 0.0, 1.0);
          vec3 lightTint = mix(baseFog, uPaletteAccent, crestLight);
          // Rehausse de clarté zénithale
          lightTint += vec3(0.08, 0.09, 0.11) * smoothstep(0.4, 0.9, fogDensity);

          gl_FragColor = vec4(lightTint, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -15 // Au-dessus des silhouettes (-20), sous les rayons (-12)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<NoisyFogProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.fogColor !== undefined) {
      this.fogColorVec.set(newProps.fogColor)
      this.material.uniforms.uFogColor.value = this.fogColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.heightFalloff !== undefined)
      this.material.uniforms.uHeightFalloff.value = newProps.heightFalloff
    if (newProps.windAngle !== undefined)
      this.material.uniforms.uWindAngle.value = newProps.windAngle
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

export const NoisyFogDefinition: IBrickDefinition<NoisyFogProps> = {
  type: 'noisy_fog',
  category: 'atmosphere',
  create: (id, props, context) => new NoisyFogInstance(id, props, context),
}

BrickRegistry.register(NoisyFogDefinition)
