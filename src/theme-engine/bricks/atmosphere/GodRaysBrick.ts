/**
 * src/theme-engine/bricks/atmosphere/GodRaysBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Rayons de lumière (God Rays) volumétriques crépusculaires issus d'une source,
 * à largeur variable (bruit angulaire multi-échelle sans symétrie artificielle),
 * coupés par des silhouettes / trouées d'occultation le long du trajet radial,
 * modulés par des variations d'intensité atmosphériques, un scintillement léger
 * et des grains de poussière visibles exclusivement dans les faisceaux éclairés.
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
  /** Densité des poussières visibles en suspension dans les faisceaux (0.0 à 2.0, défaut 0.7). */
  dustDensity?: number
  /** Intensité du scintillement organique léger (0.0 à 1.0, défaut 0.3). */
  shimmer?: number
  /** Force des silhouettes / nuages qui coupent les rayons (0.0 à 1.0, défaut 0.6). */
  occlusion?: number
  /** Étendue et variabilité de largeur des faisceaux (0.3 à 2.0, défaut 1.0). */
  beamSpread?: number
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
    const dustDensity = props.dustDensity ?? 0.7
    const shimmer = props.shimmer ?? 0.3
    const occlusion = props.occlusion ?? 0.6
    const beamSpread = props.beamSpread ?? 1.0

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
        uDustDensity: { value: dustDensity },
        uShimmer: { value: shimmer },
        uOcclusion: { value: occlusion },
        uBeamSpread: { value: beamSpread },
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
        uniform float uDustDensity;
        uniform float uShimmer;
        uniform float uOcclusion;
        uniform float uBeamSpread;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Profil angulaire sans couture à largeur variable (remplace les sinus périodiques)
        float rayShaftProfile(vec2 rayDir, float t, float detailFactor) {
          float angWarp = snoise(rayDir * 2.4 + vec2(t * 0.05, -t * 0.04)) * (0.38 * uRandomness);
          float c = cos(angWarp);
          float s = sin(angWarp);
          vec2 wDir = vec2(rayDir.x * c - rayDir.y * s, rayDir.x * s + rayDir.y * c);

          float freqScale = uDensity / max(0.35, uBeamSpread);
          // Faisceaux larges + moyens + fins filets asymétriques
          float broad = snoise(wDir * (2.5 * freqScale) + vec2(1.7, -t * 0.06));
          float medium = snoise(wDir * (5.8 * freqScale) + vec2(-3.2, t * 0.09));
          float fine = detailFactor > 0.5
            ? snoise(wDir * (13.5 * freqScale) + vec2(6.4, -t * 0.12))
            : 0.0;

          float combined = broad * 0.52 + medium * 0.34 + fine * 0.14;
          // Découpe des intervalles sombres pour un contraste réaliste entre rayons et ombres
          float shaft = smoothstep(-0.12, 0.68, combined);
          return pow(shaft, 1.55);
        }

        // Champ d'occultation par silhouettes (canopée, nuages, crêtes) coupant le trajet radial
        float silhouetteTransmittance(vec2 sampleP, vec2 lightCenter, float t) {
          vec2 rel = sampleP - lightCenter;
          float r = length(rel);
          // Bande de silhouettes entre la source et le décor (nuages / cimes supérieures)
          float canopyBand = smoothstep(0.06, 0.22, r) * smoothstep(0.95, 0.28, r);
          // Silhouette irrégulière de cimes / nuages dérivant très lentement
          float occBroad = snoise(sampleP * vec2(3.6, 2.2) + vec2(t * 0.04, 0.0));
          float occFine = snoise(sampleP * vec2(9.2, 4.8) - vec2(t * 0.07, 1.3)) * 0.45;
          float ridgeLine = smoothstep(0.18, -0.25, sampleP.y + 0.08 + occBroad * 0.16);
          float occDensity = smoothstep(0.08, 0.46, occBroad + occFine) * canopyBand;
          float lowerCut = ridgeLine * smoothstep(0.0, -0.35, sampleP.y) * 0.55;
          float blocked = clamp((occDensity + lowerCut) * uOcclusion, 0.0, 0.92);
          return 1.0 - blocked;
        }

        // Poussière atmosphérique scintillante en suspension (grille jitterée)
        float dustMotesLayer(vec2 p, float scale, float t, float seedOffset) {
          vec2 grid = p * scale;
          vec2 cell = floor(grid);
          vec2 local = fract(grid) - 0.5;
          vec2 rnd = hash22(cell + seedOffset);
          // Dérive brownienne lente ascendante
          vec2 drift = vec2(
            sin(t * 0.85 + rnd.x * 6.2831) * 0.18,
            cos(t * 0.62 + rnd.y * 6.2831) * 0.18 + fract(t * 0.05 + rnd.y) * 0.12
          );
          vec2 motePos = (rnd - 0.5) * 0.58 + drift;
          float d = length(local - motePos);
          float moteSize = mix(0.028, 0.075, rnd.x);
          float shape = smoothstep(moteSize, 0.0, d);
          // Scintillement individuel doux non-linéaire
          float twinkle = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * (1.8 + rnd.y * 2.2) + rnd.x * 12.56), 1.6);
          // Présence aléatoire (toutes les cellules n'ont pas un grain visible)
          float visibleMask = step(0.38, rnd.y);
          return shape * twinkle * visibleMask;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Position de la source lumineuse avec parallaxe souris et léger scroll
          vec2 lightCenter = vec2(uLightSourceX * aspect * 0.5, uLightSourceY - 0.5);
          lightCenter += uMouse * (uDepth * 0.15);
          lightCenter.y += uScroll * 0.00025 * uDepth;

          vec2 dir = p - lightCenter;
          float dist = length(dir);
          vec2 rayDir = dist > 0.0005 ? dir / dist : vec2(0.0, -1.0);

          // Profil angulaire de base à largeur variable
          float baseShaft = rayShaftProfile(rayDir, t, uQualityLevel >= 1 ? 1.0 : 0.0);

          // Scintillement organique léger (comme l'air ou le feuillage devant la source)
          float shimmerNoise = snoise(rayDir * 7.5 + vec2(t * 0.65, -t * 0.48));
          float shimmerMod = 1.0 + shimmerNoise * (0.20 * uShimmer);

          float beamEnergy = 0.0;
          float dustAccum = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Raymarch d'occultation (10 pas optimisés) + variations de bruit + poussières ===
            vec2 stepVec = (lightCenter - p) / 10.0;
            vec2 curP = p;
            float trans = 1.0;
            float rayWeight = 1.0;
            float accum = 0.0;
            float weightSum = 0.0;

            for (int i = 0; i < 10; i++) {
              curP += stepVec;
              vec2 rel = curP - lightCenter;
              float curDist = length(rel);

              // Occultation progressive optimisée (1 snoise par pas le long du rayon)
              float canopyBand = smoothstep(0.06, 0.22, curDist) * smoothstep(0.95, 0.28, curDist);
              float occBroad = snoise(curP * vec2(3.8, 2.3) + vec2(t * 0.04, 0.0));
              float ridgeLine = smoothstep(0.18, -0.25, curP.y + 0.08 + occBroad * 0.16);
              float occDensity = smoothstep(0.08, 0.46, occBroad) * canopyBand;
              float lowerCut = ridgeLine * smoothstep(0.0, -0.35, curP.y) * 0.55;
              float localTrans = 1.0 - clamp((occDensity + lowerCut) * uOcclusion, 0.0, 0.92);
              trans *= mix(1.0, localTrans, 0.42);

              float falloff = exp(-curDist * (2.6 - uDecay * 1.85));
              accum += baseShaft * trans * falloff * rayWeight;
              weightSum += rayWeight;
              rayWeight *= uDecay;
            }
            // Variations d'intensité volumétriques par bruit dérivant dans le faisceau
            float mistPocket = 0.74 + 0.36 * snoise(p * 2.4 + vec2(t * 0.14, -t * 0.06));
            beamEnergy = (accum / max(weightSum, 0.001)) * 2.15 * mistPocket * shimmerMod;

            // Grains de poussière visibles exclusivement à l'intérieur des faisceaux éclairés
            float m1 = dustMotesLayer(p + vec2(t * 0.04, -t * 0.06), 14.0, t, 1.0);
            float m2 = dustMotesLayer(p - vec2(t * 0.02, t * 0.05), 24.0, t, 19.7);
            float beamMask = smoothstep(0.06, 0.45, beamEnergy) * exp(-dist * 0.75);
            dustAccum = (m1 * 0.65 + m2 * 0.55) * beamMask * uDustDensity;

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Raymarch 6 pas avec occultation + 1 couche de poussière ===
            vec2 stepVec = (lightCenter - p) / 6.0;
            vec2 curP = p;
            float trans = 1.0;
            float rayWeight = 1.0;
            float accum = 0.0;
            float weightSum = 0.0;

            for (int i = 0; i < 6; i++) {
              curP += stepVec;
              float curDist = length(curP - lightCenter);
              float canopyBand = smoothstep(0.06, 0.22, curDist) * smoothstep(0.95, 0.28, curDist);
              float occBroad = snoise(curP * vec2(3.6, 2.2) + vec2(t * 0.04, 0.0));
              float localTrans = 1.0 - clamp(smoothstep(0.08, 0.46, occBroad) * canopyBand * uOcclusion, 0.0, 0.90);
              trans *= mix(1.0, localTrans, 0.48);

              float falloff = exp(-curDist * (2.5 - uDecay * 1.75));
              accum += baseShaft * trans * falloff * rayWeight;
              weightSum += rayWeight;
              rayWeight *= uDecay;
            }
            float mistPocket = 0.80 + 0.28 * snoise(p * 2.1 + vec2(t * 0.10, 0.0));
            beamEnergy = (accum / max(weightSum, 0.001)) * 2.0 * mistPocket * shimmerMod;

            float m1 = dustMotesLayer(p + vec2(t * 0.03, -t * 0.05), 16.0, t, 3.3);
            float beamMask = smoothstep(0.08, 0.48, beamEnergy) * exp(-dist * 0.85);
            dustAccum = m1 * 0.70 * beamMask * uDustDensity;

          } else {
            // === PALIER LOW : Analytique sans boucle (0 marche radiale, FPS maximal) ===
            float occAnalytic = silhouetteTransmittance(mix(lightCenter, p, 0.45), lightCenter, t);
            float falloff = exp(-dist * (2.55 - uDecay * 1.4));
            beamEnergy = baseShaft * occAnalytic * falloff * 1.45 * shimmerMod;
          }

          // Cœur doux de la source (halo naturel sans disque opaque)
          float sourceGlow = exp(-dist * 4.6) * 0.95 + exp(-dist * 14.0) * 0.55;
          float totalEnergy = (beamEnergy + sourceGlow + dustAccum * 1.35) * uIntensity;

          // Atténuation douce vers le haut derrière la source pour rester réaliste
          float dirBias = smoothstep(0.65, -0.35, rayDir.y);
          totalEnergy *= mix(0.55, 1.0, dirBias);

          float clampedVal = clamp(totalEnergy, 0.0, 1.45);
          if (clampedVal <= 0.004) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uRayColor : uPaletteAccent;
          vec3 warmCore = mix(baseColor, vec3(1.0, 0.98, 0.90), clamp(sourceGlow * 0.55 + dustAccum * 0.6, 0.0, 0.85));
          vec3 finalColor = warmCore * clampedVal;

          gl_FragColor = vec4(finalColor, clamp(clampedVal * 0.72, 0.0, 0.92));
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
    if (newProps.dustDensity !== undefined)
      this.material.uniforms.uDustDensity.value = newProps.dustDensity
    if (newProps.shimmer !== undefined) this.material.uniforms.uShimmer.value = newProps.shimmer
    if (newProps.occlusion !== undefined)
      this.material.uniforms.uOcclusion.value = newProps.occlusion
    if (newProps.beamSpread !== undefined)
      this.material.uniforms.uBeamSpread.value = newProps.beamSpread
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
