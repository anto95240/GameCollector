/**
 * src/theme-engine/bricks/atmosphere/FlickeringLightBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Lumière vacillante organique (torche de donjon, feu de camp crépitant, néon cyberpunk, bougie),
 * propulsée par un spectre de bruit Simplex non-périodique, sursauts stochastiques imprévisibles,
 * halo volumétrique déformé par convection thermique ascendante, et 3 styles de vacillement.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Lumière Vacillante.
 */
export interface FlickeringLightProps {
  /** Teinte principale du foyer lumineux (défaut #f97316 orange feu ou uPalettePrimary). */
  lightColor?: string
  /** Teinte secondaire / halo diffus (défaut #ea580c ambre ou uPaletteAccent). */
  secondaryColor?: string
  /** Rayon d'action et portée du halo lumineux (0.3 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse / fréquence moyenne de vacillement (0.0 à 1.0, défaut 0.35). */
  speed?: number
  /** Profondeur et sensibilité de la lumière à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Radiance et éclat lumineux maximal (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Instabilité, micro-souffles de vent et sauts stochastiques (0.0 à 1.0, défaut 0.5). */
  randomness?: number
  /** Position horizontale X du foyer normalisée (-1.0 à 1.0, défaut 0.0). */
  lightX?: number
  /** Position verticale Y du foyer normalisée (-1.0 à 1.0, défaut -0.1). */
  lightY?: number
  /** Type de vacillement : 0 = torche/feu vivant, 1 = néon défectueux, 2 = bougie douce (défaut 0). */
  flickerType?: number
}

export class FlickeringLightInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'flickering_light'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: FlickeringLightProps
  private lightColorVec: THREE.Color
  private secondaryColorVec: THREE.Color

  constructor(id: string, props: FlickeringLightProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.lightColorVec = new THREE.Color(props.lightColor ?? '#f97316')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#ea580c')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.5
    const lightX = props.lightX ?? 0.0
    const lightY = props.lightY ?? 0.05
    const flickerType = props.flickerType ?? 0

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
        uLightColor: { value: this.lightColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColors: {
          value: Boolean(props.lightColor || props.secondaryColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uLightX: { value: lightX },
        uLightY: { value: lightY },
        uFlickerType: { value: flickerType },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.980, 1.0);
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
        uniform vec3 uLightColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uLightX;
        uniform float uLightY;
        uniform int uFlickerType;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule le vacillement temporel non linéaire
        float computeFlicker(float t) {
          float baseFlicker = 1.0;

          if (uFlickerType == 1) {
            // Type 1 : Néon défectueux / arc électrique glitchy
            float glitchNoise = snoise(vec2(t * 8.0, 0.0));
            float spike = step(0.92, hash12(vec2(floor(t * 18.0), 12.3)));
            float drop = step(0.94, hash12(vec2(floor(t * 14.0), 45.6)));
            baseFlicker = 0.85 + glitchNoise * 0.15 + spike * 0.45 - drop * 0.7;
          } else if (uFlickerType == 2) {
            // Type 2 : Bougie douce / respiration feutrée
            float f1 = sin(t * 2.2) * 0.12;
            float f2 = sin(t * 5.1) * 0.06;
            float f3 = snoise(vec2(t * 1.5, 0.0)) * (uRandomness * 0.15);
            baseFlicker = 1.0 + f1 + f2 + f3;
          } else {
            // Type 0 : Torche / feu sauvage (défaut)
            float n1 = snoise(vec2(t * 3.5, 0.0)) * 0.22;
            float n2 = snoise(vec2(t * 8.2, 5.0)) * 0.12;
            float n3 = snoise(vec2(t * 17.0, 12.0)) * (uRandomness * 0.18);
            // Souffle de vent irrégulier
            float gust = pow(max(0.0, sin(t * 0.8) * cos(t * 1.3)), 3.0) * (uRandomness * 0.35);
            baseFlicker = 1.0 + n1 + n2 + n3 - gust;
          }

          return max(0.05, baseFlicker);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Position du foyer lumineux avec parallaxe dynamique
          vec2 lightCenter = vec2(uLightX * aspect * 0.5, uLightY * 0.5);
          vec2 mouseOffset = uMouse * (uDepth * 0.16);
          lightCenter += mouseOffset;

          vec2 dP = p - lightCenter;

          // Déformation par convection thermique ascendante (la chaleur étire le halo vers le haut)
          float upwardConvection = max(0.0, dP.y) * 0.35;
          dP.x += snoise(vec2(dP.y * 3.0, t * 1.5)) * (upwardConvection * uRandomness * 0.5);

          float dist = length(dP);

          // Calcule l'amplitude du vacillement
          float flicker = computeFlicker(t);

          float radius = 0.55 * uDensity * flicker;
          float halo = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Halo avec volutes de fumée / convection et double profil ===
            float smokeNoise = snoise(vec2(p * 4.0 - vec2(0.0, t * 0.8))) * (uRandomness * 0.12);
            float distMod = dist + smokeNoise * smoothstep(0.1, 0.6, dist);

            float core = exp(-distMod * 7.5 / max(0.1, radius)) * 1.8;
            float outer = exp(-distMod * 2.8 / max(0.1, radius)) * 0.6;
            halo = core + outer;

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Double profil exponentiel doux ===
            float core = exp(-dist * 6.5 / max(0.1, radius)) * 1.5;
            float outer = exp(-dist * 2.5 / max(0.1, radius)) * 0.5;
            halo = core + outer;

          } else {
            // === PALIER LOW : Profil exponentiel direct ===
            halo = exp(-dist * 3.5 / max(0.1, radius)) * 1.3;
          }

          float finalGlow = clamp(halo * uIntensity * flicker, 0.0, 2.0);

          if (finalGlow <= 0.005) {
            discard;
          }

          vec3 colCore = uUseCustomColors ? uLightColor : uPalettePrimary;
          vec3 colOuter = uUseCustomColors ? uSecondaryColor : uPaletteAccent;

          // Transition thermique du coeur blanc-chaud vers le bord flamboyant
          float coreMix = smoothstep(0.5, 0.0, dist / max(0.1, radius));
          vec3 col = mix(colOuter, colCore, coreMix);
          col = mix(col, vec3(1.0, 0.96, 0.9), clamp(coreMix * 0.6 * flicker, 0.0, 1.0));

          vec3 finalRgb = col * finalGlow;

          gl_FragColor = vec4(finalRgb, clamp(finalGlow * 0.8, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10 // Au-dessus de la brume (-15) et des god rays (-12)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<FlickeringLightProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.lightColor !== undefined) {
      this.lightColorVec.set(newProps.lightColor)
      this.material.uniforms.uLightColor.value = this.lightColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.lightX !== undefined) this.material.uniforms.uLightX.value = newProps.lightX
    if (newProps.lightY !== undefined) this.material.uniforms.uLightY.value = newProps.lightY
    if (newProps.flickerType !== undefined)
      this.material.uniforms.uFlickerType.value = newProps.flickerType
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

export const FlickeringLightDefinition: IBrickDefinition<FlickeringLightProps> = {
  type: 'flickering_light',
  category: 'atmosphere',
  create: (id, props, context) => new FlickeringLightInstance(id, props, context),
}

BrickRegistry.register(FlickeringLightDefinition)
