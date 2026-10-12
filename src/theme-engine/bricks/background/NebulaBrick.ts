/**
 * src/theme-engine/bricks/background/NebulaBrick.ts
 *
 * Brique de fond Nébuleuse Interstellaire (Couche 1 : Background).
 * Simulation cosmique de volutes de gaz ionisé, filaments de plasma,
 * vortex organique non-linéaire et coeurs d'étoiles naissantes.
 * Adaptation aux paliers HIGH (4 octaves + vortex complet), MEDIUM (3 octaves) et LOW (2 octaves).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Nébuleuse.
 */
export interface NebulaProps {
  /** Teinte dominante des voiles de gaz chauds (défaut #d946ef ou uPalettePrimary). */
  primaryColor?: string
  /** Teinte secondaire des nébuleuses sombres et poussières (défaut #0f172a ou uPaletteSecondary). */
  secondaryColor?: string
  /** Teinte d'accent des coeurs d'ionisation intenses (défaut #00f0ff ou uPaletteAccent). */
  accentColor?: string
  /** Densité et compacité des filaments de gaz (0.1 à 1.0, défaut 0.6). */
  density?: number
  /** Vitesse de giration et de pulsation de la nébuleuse (défaut 0.12). */
  speed?: number
  /** Sensibilité à la parallaxe de profondeur (défaut 0.2). */
  depth?: number
  /** Intensité lumineuse et émission des coeurs gazeux (défaut 1.0). */
  intensity?: number
  /** Facteur d'asymétrie et de turbulence chaotique (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Échelle d'étalement du vortex cosmique (défaut 1.4). */
  coreScale?: number
}

export class NebulaInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'nebula'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: NebulaProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private accentColorVec: THREE.Color

  constructor(id: string, props: NebulaProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#c026d3')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#090d16')
    this.accentColorVec = new THREE.Color(props.accentColor ?? '#38bdf8')

    const speed = props.speed ?? 0.12
    const density = props.density ?? 0.6
    const depth = props.depth ?? 0.2
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.35
    const coreScale = props.coreScale ?? 1.4

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uPrimaryColor: { value: this.primaryColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uAccentColor: { value: this.accentColorVec },
        uUseCustomColors: {
          value: Boolean(props.primaryColor || props.secondaryColor || props.accentColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uCoreScale: { value: coreScale },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9997, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform vec3 uAccentColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uCoreScale;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        float nebulaFbm(vec2 p, int quality) {
          float v = 0.0;
          float a = 0.55;
          mat2 rot = mat2(cos(0.8), sin(0.8), -sin(0.8), cos(0.8));
          int octaves = 2;
          if (quality == 1) octaves = 3;
          if (quality == 2) octaves = 4;

          for (int i = 0; i < 4; i++) {
            if (i >= octaves) break;
            v += a * snoise(p);
            p = rot * p * 2.05 + vec2(1.7, 3.2);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * uCoreScale;

          // Parallaxe souris
          p += uMouse * (uDepth * 0.2);

          float t = uTime * uSpeed;

          // Giration cosmique non-linéaire
          float dist = length(p);
          float angle = atan(p.y, p.x);
          float swirl = sin(dist * 2.0 - t * 0.5) * (0.8 * uRandomness);
          vec2 pRot = vec2(cos(angle + swirl), sin(angle + swirl)) * dist;

          // Voiles de gaz 1 et 2
          float n1 = nebulaFbm(pRot * 1.8 + vec2(t * 0.03, -t * 0.02), uQualityLevel);
          float n2 = nebulaFbm(pRot * 2.5 - vec2(t * 0.04, t * 0.03) + n1 * (uRandomness * 1.2), uQualityLevel);

          // Normalisation et seuillage de densité
          float gas = clamp((n1 * 0.6 + n2 * 0.4) * 0.5 + 0.5, 0.0, 1.0);
          gas = pow(gas, 2.5 - uDensity * 1.5);

          // Sélection des couleurs
          vec3 colSec = uUseCustomColors ? uSecondaryColor : uPaletteSecondary;
          vec3 colPrim = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 colAcc = uUseCustomColors ? uAccentColor : uPaletteAccent;

          // Dégradé profond des volutes
          vec3 col = mix(colSec, colPrim, smoothstep(0.1, 0.7, gas));

          // Éclat d'ionisation au coeur
          float coreGlow = pow(gas, 3.2) * (1.6 * uIntensity);
          col = mix(col, colAcc, clamp(coreGlow, 0.0, 0.95));
          col += colAcc * pow(max(0.0, 1.0 - dist * 1.2), 3.0) * (0.25 * uIntensity);

          // Micro-étoiles incorporées si qualité HIGH
          if (uQualityLevel >= 2) {
            vec2 starGrid = floor(p * 35.0);
            float starHash = hash12(starGrid);
            if (starHash > 0.975) {
              vec2 starFract = fract(p * 35.0) - 0.5;
              float starD = length(starFract);
              float twinkle = sin(uTime * 3.0 + starHash * 30.0) * 0.5 + 0.5;
              float starBright = smoothstep(0.1, 0.01, starD) * twinkle * (0.6 * uIntensity);
              col += vec3(starBright);
            }
          }

          gl_FragColor = vec4(col * uIntensity, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -96
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<NebulaProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.accentColor !== undefined) {
      this.accentColorVec.set(newProps.accentColor)
      this.material.uniforms.uAccentColor.value = this.accentColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.coreScale !== undefined) this.material.uniforms.uCoreScale.value = newProps.coreScale
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

export const NebulaDefinition: IBrickDefinition<NebulaProps> = {
  type: 'nebula',
  category: 'background',
  create: (id, props, context) => new NebulaInstance(id, props, context),
}

BrickRegistry.register(NebulaDefinition)
