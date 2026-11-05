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

        // FBM atmosphérique avec rotation anti-coutures
        float fogFbm(vec2 coord, int octaves) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
          for (int i = 0; i < 4; i++) {
            if (i >= octaves) break;
            v += a * snoise(coord);
            coord = rot * coord * 2.02 + vec2(100.0);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          // Échelle spatiale basse fréquence pour une brume douce et vaporeuse
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 0.70;

          // Déplacement lent et continu du vent
          float t = uTime * uSpeed * 0.20;
          vec2 windDir = vec2(cos(uWindAngle), sin(uWindAngle)) * t;

          // Parallaxe souris avec inertie douce
          vec2 mouseOffset = uMouse * (uDepth * 0.15);
          p += mouseOffset + windDir;

          // Effet de sillage et dispersion au passage de la souris (mouse wake)
          vec2 mCoord = (uMouse * 0.5) * vec2(aspect, 1.0) * 0.70;
          float distToMouse = length(p - mCoord);
          float mouseWake = smoothstep(0.40, 0.05, distToMouse) * (uDepth * 0.35);

          float fogDensity = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : 4 octaves FBM + double domain warping doux ===
            float warpFactor = uRandomness * 0.45;
            vec2 q = vec2(
              fogFbm(p + vec2(t * 0.08, t * 0.04), 2),
              fogFbm(p + vec2(5.2, 1.3) - vec2(t * 0.05, t * 0.09), 2)
            );

            vec2 r = vec2(
              fogFbm(p + 1.0 * q + vec2(1.7, 9.2) + vec2(t * 0.04, -t * 0.06), 2),
              fogFbm(p + 1.0 * q + vec2(8.3, 2.8) + vec2(-t * 0.05, t * 0.03), 2)
            );

            float fbmVal = fogFbm(p + warpFactor * r, 4);
            // Micro-tendrils vaporeux très légers sans bruit agressif
            float detailNoise = snoise(p * 2.2 - vec2(t * 0.12, t * 0.06)) * (0.07 * uRandomness);
            fogDensity = fbmVal + detailNoise - mouseWake;
          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : 2 octaves FBM + warping simple ===
            float warpFactor = uRandomness * 0.35;
            vec2 q = vec2(
              fogFbm(p + vec2(t * 0.07, t * 0.03), 2),
              fogFbm(p + vec2(3.1, 1.5) - t * 0.05, 2)
            );
            float fbmVal = fogFbm(p + warpFactor * q, 2);
            fogDensity = fbmVal - mouseWake;
          } else {
            // === PALIER LOW : 1 octave Simplex étirée avec dérive douce (ultra-léger, 0 couture) ===
            float n = snoise(vec2(p.x * 0.8, p.y * 1.1) + vec2(t * 0.06, t * 0.03));
            fogDensity = n * 0.55;
          }

          // Atténuation d'élévation réaliste (nappe rampante au sol qui s'évapore vers le haut)
          float heightMask = exp(-max(0.0, uv.y) * uHeightFalloff);
          // Résiduel d'ambiance atmosphérique très doux en altitude
          heightMask = mix(0.10, 1.0, heightMask);

          // Normalisation progressive et opacité vaporeuse translucide
          float normDensity = clamp((fogDensity + 0.35) * 1.0, 0.0, 1.0);
          float fogAlpha = smoothstep(0.08, 0.75, normDensity);

          // Faible opacité pour garantir la translucidité (on voit clairement à travers le décor)
          float alpha = fogAlpha * heightMask * (uDensity * 0.55);
          alpha = clamp(alpha * uIntensity, 0.0, 0.60);

          if (alpha <= 0.003) {
            discard;
          }

          // Teinte de la brume avec absorption lumineuse atmosphérique douce
          vec3 baseFog = uUseCustomColor ? uFogColor : uPaletteSecondary;
          // Éclat d'horizon et lueur diffuse sans saturation excessive
          float crestLight = clamp(normDensity * 0.35 + (1.0 - uv.y) * 0.25, 0.0, 1.0);
          vec3 lightTint = mix(baseFog, mix(baseFog, uPaletteAccent, 0.20), crestLight * 0.40);
          // Rehausse de clarté diffuse
          lightTint += vec3(0.05, 0.06, 0.07) * smoothstep(0.3, 0.9, normDensity);

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
