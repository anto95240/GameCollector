/**
 * src/theme-engine/bricks/atmosphere/GodRaysBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Rayons de lumière (God Rays) volumétriques crépusculaires perçant l'atmosphère,
 * avec cônes de diffusion radiale, poussières en suspension micro-scintillantes,
 * atténuation exponentielle avec la distance, réactivité parallaxe à la souris,
 * et adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Rayons de Lumière.
 */
export interface GodRaysProps {
  /** Teinte des faisceaux de lumière. Si absent, utilise uPaletteAccent. */
  rayColor?: string
  /** Densité et nombre de faisceaux de lumière (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'oscillation et de dérive des poussières atmosphériques (0.0 à 1.0, défaut 0.25). */
  speed?: number
  /** Profondeur et sensibilité de la source à la parallaxe souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance et brillance au cœur des rayons (0.2 à 2.5, défaut 1.2). */
  intensity?: number
  /** Asymétrie angulaire et turbulence de diffusion (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Origine horizontale X de la source lumineuse normalisée (-1.0 à 1.0, défaut 0.35). */
  lightSourceX?: number
  /** Origine verticale Y de la source lumineuse normalisée (0.0 à 1.5, défaut 0.85). */
  lightSourceY?: number
  /** Facteur d'atténuation radiale le long du faisceau (0.7 à 0.99, défaut 0.92). */
  decay?: number
}

export class GodRaysInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'god_rays'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: GodRaysProps
  private rayColorVec: THREE.Color

  constructor(id: string, props: GodRaysProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.rayColorVec = new THREE.Color(props.rayColor ?? '#fef08a')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.4
    const lightSourceX = props.lightSourceX ?? 0.35
    const lightSourceY = props.lightSourceY ?? 0.85
    const decay = props.decay ?? 0.92

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
        uRayColor: { value: this.rayColorVec },
        uUseCustomColor: { value: Boolean(props.rayColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uLightSourceX: { value: lightSourceX },
        uLightSourceY: { value: lightSourceY },
        uDecay: { value: decay },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.982, 1.0);
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
        uniform vec3 uRayColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uLightSourceX;
        uniform float uLightSourceY;
        uniform float uDecay;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Évalue la densité angulaire des rayons avec découpage irrégulier
        float rayAngleProfile(float angle, float t) {
          // Harmoniques angulaires non périodiques
          float a1 = sin(angle * 11.0 * uDensity + t * 0.4);
          float a2 = sin(angle * 23.0 * uDensity - t * 0.6);
          float a3 = sin(angle * 47.0 * uDensity + t * 0.2);

          // Bruit organique Simplex sur l'angle pour briser la régularité mathématique
          float angNoise = snoise(vec2(cos(angle) * 3.0, sin(angle) * 3.0 + t * 0.2)) * (uRandomness * 0.8);

          float combined = a1 * 0.5 + a2 * 0.35 + a3 * 0.15 + angNoise;
          return pow(max(0.0, combined * 0.5 + 0.5), 2.2);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Position de la source de lumière avec parallaxe dynamique à la souris
          vec2 lightCenter = vec2(uLightSourceX * aspect * 0.5, (uLightSourceY - 0.5));
          vec2 mouseParallax = uMouse * (uDepth * 0.15);
          lightCenter += mouseParallax;

          // Vecteur depuis la source lumineuse
          vec2 dir = p - lightCenter;
          float dist = length(dir);
          float angle = atan(dir.y, dir.x);

          float rayAccum = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Échantillonnage radial à 20 pas avec micro-poussières ===
            vec2 stepVec = (lightCenter - p) / 20.0;
            vec2 curP = p;
            float currentDecay = 1.0;

            for (int i = 0; i < 20; i++) {
              curP += stepVec;
              vec2 curDir = curP - lightCenter;
              float curAngle = atan(curDir.y, curDir.x);
              float curDist = length(curDir);

              float densitySample = rayAngleProfile(curAngle, t);
              // Poussière microscopique scintillante en suspension
              float dust = snoise(curP * 12.0 + vec2(t * 0.3, t * 0.15)) * (uRandomness * 0.25);
              densitySample = max(0.0, densitySample + dust);

              // Atténuation de diffusion radiale
              float falloff = exp(-curDist * (3.0 - uDecay * 2.0));
              rayAccum += densitySample * falloff * currentDecay;
              currentDecay *= uDecay;
            }
            rayAccum = (rayAccum / 20.0) * 2.8;

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Échantillonnage radial à 10 pas direct ===
            vec2 stepVec = (lightCenter - p) / 10.0;
            vec2 curP = p;
            float currentDecay = 1.0;

            for (int i = 0; i < 10; i++) {
              curP += stepVec;
              vec2 curDir = curP - lightCenter;
              float curAngle = atan(curDir.y, curDir.x);
              float curDist = length(curDir);

              float densitySample = rayAngleProfile(curAngle, t);
              float falloff = exp(-curDist * (2.8 - uDecay * 1.8));
              rayAccum += densitySample * falloff * currentDecay;
              currentDecay *= uDecay;
            }
            rayAccum = (rayAccum / 10.0) * 2.4;

          } else {
            // === PALIER LOW : Formule angulaire analytique directe (ultra-léger, 0 boucle) ===
            float densitySample = rayAngleProfile(angle, t);
            float falloff = exp(-dist * 2.5);
            rayAccum = densitySample * falloff * 1.5;
          }

          // Éclat d'éblouissement au cœur de la source lumineuse
          float sourceGlow = exp(-dist * 5.0) * 1.8;
          rayAccum += sourceGlow;

          // Application de l'intensité et clamp de sécurité
          float finalVal = clamp(rayAccum * uIntensity, 0.0, 1.5);

          if (finalVal <= 0.005) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uRayColor : uPaletteAccent;
          // Coeur chaud plus éclatant (blanc-doré)
          vec3 coreColor = mix(baseColor, vec3(1.0, 0.98, 0.88), clamp(sourceGlow * 0.6, 0.0, 1.0));

          // Effet de dispersion chromatique subtile sur les bords du faisceau
          vec3 finalColor = coreColor * finalVal;

          gl_FragColor = vec4(finalColor, clamp(finalVal * 0.75, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -12 // Devant la brume (-15), sous les particules (0)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<GodRaysProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.rayColor !== undefined) {
      this.rayColorVec.set(newProps.rayColor)
      this.material.uniforms.uRayColor.value = this.rayColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.lightSourceX !== undefined)
      this.material.uniforms.uLightSourceX.value = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined)
      this.material.uniforms.uLightSourceY.value = newProps.lightSourceY
    if (newProps.decay !== undefined) this.material.uniforms.uDecay.value = newProps.decay
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

export const GodRaysDefinition: IBrickDefinition<GodRaysProps> = {
  type: 'god_rays',
  category: 'atmosphere',
  create: (id, props, context) => new GodRaysInstance(id, props, context),
}

BrickRegistry.register(GodRaysDefinition)
