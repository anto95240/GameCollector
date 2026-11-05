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
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
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

        // FBM atmosphérique à persistance décroissante (privilégie les basses fréquences)
        float cloudFbm(vec2 p, int octaves) {
          float v = 0.0;
          float a = 0.55;
          float total = 0.0;
          mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);

          for (int i = 0; i < 5; ++i) {
            if (i >= octaves) break;
            v += a * snoise(p);
            total += a;
            p = rot * p * 2.05 + vec2(17.2, 43.7);
            a *= 0.45; // Décroissance rapide pour étouffer les micro-fréquences
          }
          return v / max(total, 0.001);
        }

        void main() {
          vec2 uv = vUv;
          // Ratio d'aspect pour conserver des nuages d'aspect circulaire/vaporeux
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y) * 1.6;

          // Parallaxe douce avec la souris
          p += uMouse * (uDepth * 0.15);

          // Déplacement temporel lent et majestueux
          float t = uTime * (uSpeed * 0.15);
          p += uWindDir * t;

          // Distorsion organique (Domain Warping) douce et basse fréquence
          vec2 q = vec2(0.0);
          vec2 r = vec2(0.0);

          if (uQualityLevel >= 1) {
            // Warping restreint à 2 octaves pour éviter les froissures haute fréquence
            q.x = cloudFbm(p + vec2(0.0, 0.0) + t * 0.05, 2);
            q.y = cloudFbm(p + vec2(5.2, 1.3) - t * 0.04, 2);

            if (uQualityLevel >= 2) {
              r.x = cloudFbm(p + 1.2 * q + vec2(1.7, 9.2) + t * 0.03, 2);
              r.y = cloudFbm(p + 1.2 * q + vec2(8.3, 2.8) - t * 0.03, 2);
            }
          }

          // Échantillonnage FBM final avec amplitude de warping modérée
          float warpFactor = uRandomness * 0.40;
          vec2 warpedP = p + warpFactor * (uQualityLevel >= 2 ? r : q);

          int octaves = 2;
          if (uQualityLevel == 1) octaves = 3;
          if (uQualityLevel >= 2) octaves = 5;

          float f = cloudFbm(warpedP, octaves);

          // Normalisation [0, 1]
          float n = clamp(f * 0.5 + 0.5, 0.0, 1.0);

          // Seuil progressif adouci selon la couverture nuageuse
          float threshold = 1.0 - uDensity * 0.90;
          float cloudMask = smoothstep(threshold - 0.22, threshold + 0.22, n);
          cloudMask = smoothstep(0.0, 1.0, cloudMask); // Lissage en S des bords

          // Éclairage directionnel depuis le dessus (+y / zénith)
          vec2 lightDir = normalize(vec2(0.15, 0.90));
          vec2 lightOffset = lightDir * 0.08;

          float sunLight = 1.0;
          float rimLight = 0.0;

          if (uQualityLevel >= 1) {
            // Échantillonnage léger (2 octaves) vers le haut pour détecter les crêtes exposées
            float fAbove = cloudFbm(warpedP + lightOffset, 2);
            float nAbove = clamp(fAbove * 0.5 + 0.5, 0.0, 1.0);

            // Crête supérieure éclairée si la masse nuageuse s'arrête au-dessus
            rimLight = clamp((n - nAbove) * 2.2, 0.0, 1.0);
            // Ombrage interne volumétrique sous la masse
            sunLight = clamp(1.0 - nAbove * 0.70 + rimLight * 0.50, 0.25, 1.35);
          } else {
            // Palier LOW : formule analytique sans échantillonnage supplémentaire
            sunLight = clamp(0.70 + 0.30 * (uv.y - 0.5) + 0.30 * smoothstep(threshold, 1.0, n), 0.35, 1.25);
            rimLight = clamp(smoothstep(threshold + 0.10, 1.0, n) * uv.y, 0.0, 0.80);
          }

          vec3 baseSky = uUseCustomColors ? uSkyColor : uPaletteSecondary;
          vec3 baseCloud = uUseCustomColors ? uCloudColor : mix(uPaletteAccent, vec3(0.96), 0.80);

          // Teintes harmonieuses : sous-ventre ombré doux et crêtes ensoleillées
          vec3 shadowColor = mix(baseSky * 0.65, baseCloud * 0.60, 0.55);
          vec3 sunHighlight = mix(baseCloud, vec3(1.0), 0.40);
          vec3 sunTint = mix(sunHighlight, uPaletteAccent, 0.15);

          // Modulation de la lumière sur le nuage
          float lightFactor = mix(1.0, sunLight, clamp(uIntensity, 0.0, 1.5));
          vec3 shadedCloud = mix(shadowColor, baseCloud, clamp(lightFactor, 0.0, 1.0));
          // Rehausse lumineuse sur le dessus
          shadedCloud = mix(shadedCloud, sunTint, rimLight * 0.45 * uIntensity);

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
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.windAngle !== undefined) {
      this.material.uniforms.uWindDir.value.set(
        Math.cos(newProps.windAngle),
        Math.sin(newProps.windAngle)
      )
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
