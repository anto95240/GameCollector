/**
 * src/theme-engine/bricks/parallax/ParallaxMountainsBrick.ts
 *
 * Brique de silhouettes de Montagnes en Parallaxe (Couche 2 : Intermediate).
 * Massif alpin grandiose étagé sur 3 crêtes successives en profondeur :
 * - Chaîne lointaine estompée dans la diffusion atmosphérique
 * - Chaîne médiane acérée avec versants au soleil vs versants à l'ombre
 * - Contreforts rocheux d'avant-plan avec failles et névés scintillants
 *
 * Mer de brume ondulant dans les vallées, crêtes modélisées par multifractal ridgé,
 * et étagement de parallaxe réagissant avec réalisme à la souris et au scroll.
 * Paliers de qualité HIGH, MEDIUM et LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Montagnes.
 */
export interface ParallaxMountainsProps {
  /** Teinte de la roche à l'ombre (défaut #0b1329 ou uPaletteSecondary * 0.45). */
  rockColor?: string
  /** Teinte des crêtes illuminées au soleil rasant (défaut #475569 ou uPalettePrimary * 0.6). */
  sunColor?: string
  /** Teinte de la brume de vallée (défaut #1e293b ou uPaletteSecondary * 0.6). */
  mistColor?: string
  /** Densité et acuité des sommets / pics (défaut 1.0). */
  density?: number
  /** Vitesse de dérive lente des brumes de vallée (défaut 0.15). */
  speed?: number
  /** Écartement en profondeur et parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Contraste d'éclairage rasant et netteté des arêtes (défaut 1.0). */
  intensity?: number
  /** Variabilité géologique et asymétrie des pics (défaut 0.45). */
  randomness?: number
  /** Seuil d'apparition des névés et glaciers sur les sommets (0.0 = aucun, 1.0 = sommets enneigés, défaut 0.6). */
  snowLevel?: number
  /** Angle d'incidence de la lumière solaire en radians (défaut 0.75). */
  sunAngle?: number
}

export class ParallaxMountainsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_mountains'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxMountainsProps
  private rockColorVec: THREE.Color
  private sunColorVec: THREE.Color
  private mistColorVec: THREE.Color

  constructor(id: string, props: ParallaxMountainsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.rockColorVec = new THREE.Color(props.rockColor ?? '#0b1329')
    this.sunColorVec = new THREE.Color(props.sunColor ?? '#475569')
    this.mistColorVec = new THREE.Color(props.mistColor ?? '#1e293b')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.15
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.45
    const snowLevel = props.snowLevel ?? 0.6
    const sunAngle = props.sunAngle ?? 0.75

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
        uRockColor: { value: this.rockColorVec },
        uSunColor: { value: this.sunColorVec },
        uMistColor: { value: this.mistColorVec },
        uUseCustomColors: {
          value: Boolean(props.rockColor || props.sunColor || props.mistColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSnowLevel: { value: snowLevel },
        uSunAngle: { value: sunAngle },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.993, 1.0);
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
        uniform vec3 uRockColor;
        uniform vec3 uSunColor;
        uniform vec3 uMistColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSnowLevel;
        uniform float uSunAngle;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Multi-octave continuous ridge profile using FBM with smooth abs folding.
        // Produces a continuous, irregular crestline without the V-cusp artefact.
        float mountainRidge(float x, float freq, float seed) {
          float value = 0.0;
          float amplitude = 0.55;
          float f = freq;
          float weight = 1.0;
          for (int i = 0; i < 4; i++) {
            // Folded noise with smooth abs to avoid sharp V cusps
            float n = snoise(vec2(x * f + seed + float(i) * 7.3, float(i) * 2.7 + 1.2));
            n = 1.0 - sqrt(n * n + 0.01);   // smooth abs → continuous ridgeline
            n *= n;                           // sharpen peaks gently
            n *= weight;                      // cascade: higher octaves only where previous was high
            value += n * amplitude;
            weight = clamp(n * 2.0, 0.0, 1.0);
            f *= 2.1;
            amplitude *= 0.48;
          }
          return value;
        }

        // Evaluate a single mountain range (ridgeline + vertical fill + lighting + snow)
        vec4 evaluateMountainRidge(
          vec2 uv,
          float baseAltitude,
          float ridgeHeight,
          float freq,
          float seed,
          float parallaxRatio,
          float hazeAmount,        // 0 = near, 1 = fully faded into mist
          vec3 rockCol,
          vec3 litCol,
          vec3 mistCol,
          float time,
          vec2 mouse
        ) {
          // Parallax offset
          float shiftX = mouse.x * uDepth * parallaxRatio * 1.6;
          float shiftY = mouse.y * uDepth * parallaxRatio * 0.35 + uScroll * parallaxRatio * 0.18;
          float px = uv.x + shiftX;
          float py = uv.y + shiftY;

          // Ridgeline altitude at this horizontal position
          float ridgeShape = mountainRidge(px, freq * uDensity, seed);
          float ridgeY = baseAltitude + ridgeShape * ridgeHeight;

          // Above the ridge → transparent
          if (py > ridgeY) {
            return vec4(0.0);
          }

          // Normalised depth below the ridge (0 = at crest, 1 = far below)
          float depthRatio = clamp((ridgeY - py) / max(0.01, ridgeHeight), 0.0, 1.0);

          // Approximate horizontal derivative for slope / sun exposure
          float eps = 0.004;
          float ridgeLeft  = baseAltitude + mountainRidge(px - eps, freq * uDensity, seed) * ridgeHeight;
          float ridgeRight = baseAltitude + mountainRidge(px + eps, freq * uDensity, seed) * ridgeHeight;
          float slopeX = (ridgeRight - ridgeLeft) / (2.0 * eps);

          // Directional grazing light
          float lightFactor = clamp(slopeX * cos(uSunAngle) + sin(uSunAngle) * 0.65, 0.0, 1.0);
          vec3 surfaceCol = mix(rockCol, litCol, lightFactor);

          // Smooth vertical gradient: darken toward base for depth
          surfaceCol *= mix(1.0, 0.55, depthRatio * depthRatio);

          // Snow / glaciers on gentle slopes above threshold (MEDIUM + HIGH)
          if (uQualityLevel >= 1 && uSnowLevel > 0.05) {
            float snowThreshold = baseAltitude + ridgeHeight * (1.15 - uSnowLevel * 0.6);
            if (py > snowThreshold) {
              float snowPatch = smoothstep(snowThreshold, snowThreshold + 0.06, py);
              snowPatch *= (1.0 - smoothstep(1.5, 3.5, abs(slopeX)));
              vec3 snowCol = mix(litCol * 1.4, vec3(0.95, 0.98, 1.0), lightFactor);
              surfaceCol = mix(surfaceCol, snowCol, snowPatch * 0.85);
            }
          }

          // Valley mist at the base (subtle noise-driven)
          float valleyMist = smoothstep(0.0, 0.8, depthRatio);
          float mistNoise = snoise(vec2(px * 3.0 - time * uSpeed * 0.3, py * 4.0)) * 0.15;
          valleyMist = clamp(valleyMist + mistNoise, 0.0, 1.0);
          surfaceCol = mix(surfaceCol, mistCol, valleyMist * 0.35);

          // Atmospheric haze: distant ranges fade toward mist colour
          surfaceCol = mix(surfaceCol, mistCol, hazeAmount);

          return vec4(surfaceCol, uIntensity);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseRock = uUseCustomColors ? uRockColor : (uPaletteSecondary * 0.35);
          vec3 baseLit  = uUseCustomColors ? uSunColor  : (uPalettePrimary * 0.55);
          vec3 baseMist = uUseCustomColors ? uMistColor : (uPaletteSecondary * 0.6);

          vec4 result = vec4(0.0);

          // Range 3: Far (heavy atmospheric haze, slow parallax, highest peaks)
          if (uQualityLevel >= 1) {
            vec3 farRock = mix(baseRock, baseMist, 0.45);
            vec3 farLit  = mix(baseLit,  baseMist, 0.35);
            vec4 r3 = evaluateMountainRidge(uv, 0.32, 0.28, 1.2, 12.4, 0.12, 0.55,
                                            farRock, farLit, baseMist, t, uMouse);
            if (r3.a > 0.0) {
              result = r3;
            }
          }

          // Range 2: Middle (moderate haze, sharper crests, snow)
          vec3 midRock = mix(baseRock, baseMist, 0.15);
          vec4 r2 = evaluateMountainRidge(uv, 0.16, 0.34, 1.9, 45.7, 0.28, 0.22,
                                          midRock, baseLit, baseMist, t, uMouse);
          if (r2.a > 0.0) {
            // Paint over (nearer layer replaces farther)
            result = r2;
          }

          // Range 1: Foreground (dark, sharp, strong parallax, no haze)
          vec4 r1 = evaluateMountainRidge(uv, -0.02, 0.36, 2.8, 89.1, 0.52, 0.0,
                                          baseRock, baseLit * 0.9, baseMist * 0.8, t, uMouse);
          if (r1.a > 0.0) {
            result = r1;
          }

          // Low-lying mist blanket at the very bottom (HIGH quality)
          if (uQualityLevel >= 2) {
            float lowMist = smoothstep(0.12, -0.05, uv.y);
            float mistTurb = snoise(vec2(uv.x * 2.5 + t * uSpeed * 0.2, uv.y * 3.0)) * 0.5 + 0.5;
            float mistAlpha = lowMist * mistTurb * 0.25 * uIntensity;
            result.rgb = mix(result.rgb, baseMist, mistAlpha);
          }

          if (result.a <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(result.rgb, clamp(result.a, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -40
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxMountainsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.rockColor !== undefined) {
      this.rockColorVec.set(newProps.rockColor)
      this.material.uniforms.uRockColor.value = this.rockColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.sunColor !== undefined) {
      this.sunColorVec.set(newProps.sunColor)
      this.material.uniforms.uSunColor.value = this.sunColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.mistColor !== undefined) {
      this.mistColorVec.set(newProps.mistColor)
      this.material.uniforms.uMistColor.value = this.mistColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.snowLevel !== undefined)
      this.material.uniforms.uSnowLevel.value = newProps.snowLevel
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

export const ParallaxMountainsDefinition: IBrickDefinition<ParallaxMountainsProps> = {
  type: 'parallax_mountains',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxMountainsInstance(id, props, context),
}

BrickRegistry.register(ParallaxMountainsDefinition)
