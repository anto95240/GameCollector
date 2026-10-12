/**
 * src/theme-engine/bricks/background/FbmCloudsBrick.ts
 *
 * Brique de fond Couverture Nuageuse FBM (Couche 1 : Background).
 * Simulation de nuages atmosphériques procéduraux multi-octaves avec
 * dérive organique non-linéaire (domain warping), diffusion de lumière volumétrique,
 * adaptation aux paliers HIGH (5 octaves), MEDIUM (3 octaves) et LOW (2 octaves).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Nuages FBM.
 */
export interface FbmCloudsProps {
  /** Couleur principale des masses nuageuses. Si absent, utilise uPaletteAccent ou blanc cassé. */
  cloudColor?: string
  /** Couleur du ciel en arrière-plan. Si absent, utilise uPaletteSecondary. */
  skyColor?: string
  /** Densité et couverture du ciel (0.1 = ciel dégagé, 0.9 = couverture orageuse, défaut 0.55). */
  density?: number
  /** Vitesse de dérive du vent (défaut 0.15). */
  speed?: number
  /** Altitude apparente et sensibilité à la parallaxe souris (défaut 0.3). */
  depth?: number
  /** Intensité du contraste ombre / crête ensoleillée (défaut 1.0). */
  intensity?: number
  /** Facteur de turbulence interne et distorsion organique (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Angle du vent en radians (défaut 0.15). */
  windAngle?: number
}

export class FbmCloudsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'fbm_clouds'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: FbmCloudsProps
  private cloudColorVec: THREE.Color
  private skyColorVec: THREE.Color

  constructor(id: string, props: FbmCloudsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.cloudColorVec = new THREE.Color(props.cloudColor ?? '#f1f5f9')
    this.skyColorVec = new THREE.Color(props.skyColor ?? '#0f172a')

    const speed = props.speed ?? 0.15
    const density = props.density ?? 0.55
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const windAngle = props.windAngle ?? 0.15

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uCloudColor: { value: this.cloudColorVec },
        uSkyColor: { value: this.skyColorVec },
        uUseCustomColors: {
          value: Boolean(props.cloudColor || props.skyColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uWindDir: { value: new THREE.Vector2(Math.cos(windAngle), Math.sin(windAngle)) },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9998, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCloudColor;
        uniform vec3 uSkyColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform vec2 uWindDir;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        // FBM adaptatif selon le palier de qualité
        float cloudFbm(vec2 p, int quality) {
          float v = 0.0;
          float a = 0.5;
          vec2 shift = vec2(100.0);
          // Rotation fixe pour briser l'alignement des axes
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));

          int maxOct = 2;
          if (quality == 1) maxOct = 3;
          if (quality == 2) maxOct = 5;

          for (int i = 0; i < 5; ++i) {
            if (i >= maxOct) break;
            v += a * snoise(p);
            p = rot * p * 2.0 + shift;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          // Correction du ratio d'aspect pour éviter l'étirement des nuages
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y) * 2.2;

          // Parallaxe amortie liée à la profondeur et la souris
          p += uMouse * (uDepth * 0.25);

          // Translation temporelle selon la direction du vent
          float t = uTime * uSpeed;
          p += uWindDir * t;

          // Distorsion organique (Domain Warping) pour casser toute rigidité
          vec2 q = vec2(0.0);
          vec2 r = vec2(0.0);

          if (uQualityLevel >= 1) {
            q.x = cloudFbm(p + vec2(0.0, 0.0), uQualityLevel);
            q.y = cloudFbm(p + vec2(5.2, 1.3), uQualityLevel);

            if (uQualityLevel >= 2) {
              r.x = cloudFbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t, uQualityLevel);
              r.y = cloudFbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t, uQualityLevel);
            }
          }

          // Échantillonnage final FBM avec distorsion
          vec2 warpedP = p + (uRandomness * 1.5) * (uQualityLevel >= 2 ? r : q);
          float f = cloudFbm(warpedP, uQualityLevel);

          // Normalisation [0, 1]
          f = clamp(f * 0.5 + 0.5, 0.0, 1.0);

          // Courbe de seuil selon la densité
          float cloudMask = smoothstep(1.0 - uDensity, 1.1 - uDensity * 0.4, f);

          // Ombrage interne volumétrique doux
          float shadow = 1.0;
          if (uQualityLevel >= 1) {
            float fShade = cloudFbm(warpedP + vec2(0.08, 0.08), uQualityLevel);
            fShade = clamp(fShade * 0.5 + 0.5, 0.0, 1.0);
            shadow = mix(0.55, 1.0, smoothstep(0.0, 0.8, fShade));
          }

          vec3 baseSky = uUseCustomColors ? uSkyColor : uPaletteSecondary;
          vec3 baseCloud = uUseCustomColors ? uCloudColor : mix(uPaletteAccent, vec3(0.95), 0.75);

          // Moduler la couleur du nuage selon la lumière et l'intensité
          vec3 shadedCloud = baseCloud * (shadow * uIntensity);

          // Composition finale ciel / nuages
          vec3 col = mix(baseSky, shadedCloud, cloudMask * min(1.0, uIntensity));

          gl_FragColor = vec4(col, 1.0);
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

  public updateProps(newProps: Partial<FbmCloudsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.cloudColor !== undefined) {
      this.cloudColorVec.set(newProps.cloudColor)
      this.material.uniforms.uCloudColor.value = this.cloudColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.skyColor !== undefined) {
      this.skyColorVec.set(newProps.skyColor)
      this.material.uniforms.uSkyColor.value = this.skyColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.windAngle !== undefined) {
      this.material.uniforms.uWindDir.value.set(Math.cos(newProps.windAngle), Math.sin(newProps.windAngle))
    }
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

export const FbmCloudsDefinition: IBrickDefinition<FbmCloudsProps> = {
  type: 'fbm_clouds',
  category: 'background',
  create: (id, props, context) => new FbmCloudsInstance(id, props, context),
}

BrickRegistry.register(FbmCloudsDefinition)
