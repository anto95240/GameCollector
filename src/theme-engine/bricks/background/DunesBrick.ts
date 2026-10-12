/**
 * src/theme-engine/bricks/background/DunesBrick.ts
 *
 * Brique de fond Dunes Désertiques (Couche 1 : Background).
 * Simulation de crêtes de dunes sculptées par le vent avec éclairage rasant,
 * versants ensoleillés dorés vs versants à l'ombre froids, micro-rides de sable (sand ripples)
 * et brume atmosphérique d'horizon.
 * Adaptation aux paliers HIGH (3 crêtes + micro-rides haute fréquence), MEDIUM (2 crêtes) et LOW (1 crête).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Dunes.
 */
export interface DunesProps {
  /** Teinte du sable au soleil (défaut #f59e0b ou uPalettePrimary). */
  sandColor?: string
  /** Teinte des versants à l'ombre (défaut #2d1810 ou uPaletteSecondary). */
  shadowColor?: string
  /** Teinte du ciel à l'horizon (défaut #78350f ou uPaletteSecondary). */
  skyColor?: string
  /** Fréquence et espacement des crêtes de dunes (défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent et scintillement thermique (défaut 0.15). */
  speed?: number
  /** Profondeur d'étagement et parallaxe avec la souris (défaut 0.3). */
  depth?: number
  /** Contraste d'éclairage rasant et éclat (défaut 1.0). */
  intensity?: number
  /** Méandres organiques et irrégularité des crêtes (défaut 0.4). */
  randomness?: number
  /** Angle d'incidence de la lumière solaire en radians (défaut 0.8). */
  sunAngle?: number
}

export class DunesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'dunes'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: DunesProps
  private sandColorVec: THREE.Color
  private shadowColorVec: THREE.Color
  private skyColorVec: THREE.Color

  constructor(id: string, props: DunesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.sandColorVec = new THREE.Color(props.sandColor ?? '#f59e0b')
    this.shadowColorVec = new THREE.Color(props.shadowColor ?? '#2d1810')
    this.skyColorVec = new THREE.Color(props.skyColor ?? '#78350f')

    const speed = props.speed ?? 0.15
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const sunAngle = props.sunAngle ?? 0.8

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uSandColor: { value: this.sandColorVec },
        uShadowColor: { value: this.shadowColorVec },
        uSkyColor: { value: this.skyColorVec },
        uUseCustomColors: {
          value: Boolean(props.sandColor || props.shadowColor || props.skyColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSunAngle: { value: sunAngle },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9992, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uSandColor;
        uniform vec3 uShadowColor;
        uniform vec3 uSkyColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSunAngle;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        // Calcule la silhouette et l'éclairage d'une crête de dune
        vec4 evaluateDuneRidge(vec2 uv, float baseHeight, float freq, float speedShift, float time, vec2 mouse, float depthFactor) {
          float x = uv.x + mouse.x * depthFactor;
          // Courbure sinueuse de la ligne de crête
          float ridgeNoise = snoise(vec2(x * freq * 0.8 + speedShift, baseHeight * 3.0)) * uRandomness;
          float ridgeY = baseHeight + sin(x * freq + speedShift) * 0.08 + ridgeNoise * 0.07;

          // Est-on sur ou sous la dune ?
          if (uv.y > ridgeY) {
            return vec4(0.0); // Au-dessus (ciel ou dune arrière)
          }

          // Pente relative sous la crête
          float slope = (ridgeY - uv.y) * 4.0;

          // Normalement orientée : versant ouest au soleil, versant est à l'ombre
          float normalX = cos(x * freq + speedShift) * 0.5 + ridgeNoise * 0.3;
          float lightFactor = clamp(normalX * cos(uSunAngle) + sin(uSunAngle) * 0.7, 0.0, 1.0);

          // Micro-rides de sable (sand ripples) haute fréquence
          float ripple = 0.0;
          if (uQualityLevel >= 2) {
            ripple = sin(uv.x * 90.0 + uv.y * 30.0 + time * 0.2) * 0.08;
          }

          return vec4(lightFactor + ripple, 1.0, ridgeY, slope);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y);

          float t = uTime * uSpeed;

          // Couleurs
          vec3 sunSand = uUseCustomColors ? uSandColor : uPalettePrimary;
          vec3 shadowSand = uUseCustomColors ? uShadowColor : (uPaletteSecondary * 0.5);
          vec3 sky = uUseCustomColors ? uSkyColor : uPaletteSecondary;

          vec3 finalColor = sky;

          // Dune 3 (lointaine, arête haute) - MEDIUM & HIGH
          if (uQualityLevel >= 1) {
            vec4 d3 = evaluateDuneRidge(uv, 0.62, 1.8 * uDensity, 0.5, t * 0.04, uMouse, uDepth * 0.1);
            if (d3.y > 0.5) {
              vec3 colD3 = mix(shadowSand * 0.85, sunSand * 0.75, d3.x);
              // Diffusion atmosphérique lointaine
              colD3 = mix(colD3, sky, 0.35);
              finalColor = colD3;
            }
          }

          // Dune 2 (médiane)
          vec4 d2 = evaluateDuneRidge(uv, 0.44, 2.3 * uDensity, 2.2, t * 0.07, uMouse, uDepth * 0.2);
          if (d2.y > 0.5) {
            vec3 colD2 = mix(shadowSand, sunSand * 0.9, d2.x);
            // Légère brume
            colD2 = mix(colD2, sky, 0.15);
            finalColor = colD2;
          }

          // Dune 1 (premier plan)
          vec4 d1 = evaluateDuneRidge(uv, 0.22, 3.1 * uDensity, 4.8, t * 0.1, uMouse, uDepth * 0.35);
          if (d1.y > 0.5) {
            vec3 colD1 = mix(shadowSand, sunSand, d1.x);
            finalColor = colD1;
          }

          // Intensité globale
          finalColor *= uIntensity;

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

  public updateProps(newProps: Partial<DunesProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.sandColor !== undefined) {
      this.sandColorVec.set(newProps.sandColor)
      this.material.uniforms.uSandColor.value = this.sandColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.shadowColor !== undefined) {
      this.shadowColorVec.set(newProps.shadowColor)
      this.material.uniforms.uShadowColor.value = this.shadowColorVec
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
    if (newProps.sunAngle !== undefined) this.material.uniforms.uSunAngle.value = newProps.sunAngle
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

export const DunesDefinition: IBrickDefinition<DunesProps> = {
  type: 'dunes',
  category: 'background',
  create: (id, props, context) => new DunesInstance(id, props, context),
}

BrickRegistry.register(DunesDefinition)
