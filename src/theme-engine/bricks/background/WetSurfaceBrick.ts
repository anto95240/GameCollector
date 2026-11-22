/**
 * src/theme-engine/bricks/background/WetSurfaceBrick.ts
 *
 * Brique de Fond : Sol Humide & Reflets Spéculaires en Perspective (Couche 1 : Background).
 * Projection perspective 3D d'une chaussée mouillée (pavés irréguliers ou asphalte)
 * avec flaques organiques, reflets lumineux anisotropes (lanternes, vitrines,
 * néon sous châssis, feux arrière, sillons enflammés) et micro-rides d'impacts de pluie.
 *
 * Transparent au-dessus de la ligne d'horizon pour se superposer naturellement à gradient_sky.
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type WetSurfaceType = 'cobblestone' | 'asphalt'

export type WetReflectionStyle =
  | 'lantern'
  | 'shop_windows'
  | 'underglow'
  | 'tail_light'
  | 'flame_tracks'

export interface WetSurfaceProps {
  /** Teinte de base de la chaussée humide (défaut #141720 ou uPaletteSecondary). */
  baseColor?: string
  /** Teinte principale des reflets spéculaires sur les flaques (défaut #f59e0b ou uPaletteAccent). */
  reflectionColor?: string
  /** Teinte secondaire des reflets (ex: éclairs cyan sur sillons enflammés). */
  secondaryReflectionColor?: string
  /** Nature du revêtement au sol (défaut 'cobblestone'). */
  surfaceType?: WetSurfaceType
  /** Style d'illumination réfléchie sur la chaussée (défaut 'lantern'). */
  reflectionStyle?: WetReflectionStyle
  /** Hauteur relative de la ligne d'horizon du sol (0.18 à 0.50, défaut 0.34). */
  horizonHeight?: number
  /** Couverture des flaques réfléchissantes (0.15 à 0.95, défaut 0.62). */
  puddleCoverage?: number
  /** Intensité des micro-ondes d'impact de gouttes de pluie (0.0 à 1.0, défaut 0.45). */
  rainRipples?: number
  /** Échelle spatiale des pavés / du grain d'asphalte (0.4 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'animation de défilement / scintillement (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Sensibilité perspective à la souris et au scroll (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance des reflets et contraste du sol (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Irrégularité des flaques et pavés (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

const SURFACE_TYPE_MAP: Record<WetSurfaceType, number> = {
  cobblestone: 0,
  asphalt: 1,
}

const REFLECTION_STYLE_MAP: Record<WetReflectionStyle, number> = {
  lantern: 0,
  shop_windows: 1,
  underglow: 2,
  tail_light: 3,
  flame_tracks: 4,
}

export class WetSurfaceInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'wet_surface'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WetSurfaceProps
  private baseColorVec: THREE.Color
  private reflectionColorVec: THREE.Color
  private secondaryReflectionVec: THREE.Color

  constructor(id: string, props: WetSurfaceProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.baseColorVec = new THREE.Color(props.baseColor ?? '#141720')
    this.reflectionColorVec = new THREE.Color(props.reflectionColor ?? '#f59e0b')
    this.secondaryReflectionVec = new THREE.Color(
      props.secondaryReflectionColor ?? props.reflectionColor ?? '#38bdf8'
    )

    const surfaceIdx = SURFACE_TYPE_MAP[props.surfaceType ?? 'cobblestone'] ?? 0
    const reflIdx = REFLECTION_STYLE_MAP[props.reflectionStyle ?? 'lantern'] ?? 0
    const horizonHeight = props.horizonHeight ?? 0.34
    const puddleCoverage = props.puddleCoverage ?? 0.62
    const rainRipples = props.rainRipples ?? 0.45
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.45

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
        uBaseColor: { value: this.baseColorVec },
        uReflectionColor: { value: this.reflectionColorVec },
        uSecondaryReflection: { value: this.secondaryReflectionVec },
        uUseCustomColors: {
          value: Boolean(props.baseColor || props.reflectionColor),
        },
        uUseSecondaryRefl: { value: Boolean(props.secondaryReflectionColor) },
        uSurfaceType: { value: surfaceIdx },
        uReflectionStyle: { value: reflIdx },
        uHorizonHeight: { value: horizonHeight },
        uPuddleCoverage: { value: puddleCoverage },
        uRainRipples: { value: rainRipples },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9985, 1.0);
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
        uniform vec3 uBaseColor;
        uniform vec3 uReflectionColor;
        uniform vec3 uSecondaryReflection;
        uniform bool uUseCustomColors;
        uniform bool uUseSecondaryRefl;
        uniform int uSurfaceType;
        uniform int uReflectionStyle;
        uniform float uHorizonHeight;
        uniform float uPuddleCoverage;
        uniform float uRainRipples;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Pavés en quinconce avec joints biseautés nets et variation individuelle
        vec2 cobblestonePattern(vec2 p) {
          float row = floor(p.y);
          float offset = mod(row, 2.0) * 0.5;
          vec2 cell = vec2(floor(p.x + offset), row);
          vec2 f = fract(vec2(p.x + offset, p.y));

          float randStone = hash12(cell);
          // Léger décalage organique par pavé
          vec2 jitter = (hash22(cell + 13.7) - 0.5) * 0.08;
          vec2 pf = clamp(f + jitter, 0.0, 1.0);
          vec2 edgeDist = min(pf, 1.0 - pf);
          float bevel = smoothstep(0.05, 0.20, min(edgeDist.x, edgeDist.y));
          // Bombement doux au centre de chaque pavé
          float dome = smoothstep(0.55, 0.0, length(pf - 0.5)) * 0.28;
          return vec2(clamp(bevel * 0.85 + dome * bevel, 0.0, 1.0), randStone);
        }

        // Micro-ondes circulaires de gouttes de pluie dans les flaques
        float puddleRipples(vec2 wp, float t) {
          vec2 cell = floor(wp * 1.6);
          vec2 f = fract(wp * 1.6);
          float h = hash12(cell + 7.3);
          float life = fract(t * (0.65 + h * 0.55) + h * 10.0);
          vec2 center = hash22(cell + 19.1) * 0.6 + 0.2;
          float d = length(f - center);
          float ring = sin((d - life * 0.45) * 45.0) * exp(-abs(d - life * 0.45) * 18.0);
          return ring * (1.0 - life) * smoothstep(0.0, 0.08, life);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          float horizon = clamp(uHorizonHeight + uMouse.y * uDepth * 0.08 - uScroll * uDepth * 0.05, 0.15, 0.58);
          if (uv.y > horizon + 0.025) {
            discard;
          }

          float d = max(0.008, horizon - uv.y);
          float z = 1.0 / d;
          float x = (uv.x - 0.5 + uMouse.x * uDepth * 0.28) * aspect * z;

          float t = uTime * max(0.02, uSpeed);
          // Défilement vers l'avant pour les modes route/vitesse
          float travel = (uReflectionStyle >= 2) ? (t * 4.5) : (t * 0.12);
          vec2 worldP = vec2(x, z - travel) * (0.45 * uDensity);

          // 1. Relief de surface (pavés vs asphalte) avec filtrage anti-aliasing vers l'horizon
          float detailFade = smoothstep(0.012, 0.11, d);
          float surfaceHeight = 0.5;
          float grainVar = 0.5;
          if (uQualityLevel >= 1) {
            if (uSurfaceType == 0) {
              // Ratio anisotrope pour compenser le raccourci perspectif et obtenir des pavés bien proportionnés
              vec2 cobble = cobblestonePattern(vec2(worldP.x * 3.6, worldP.y * 1.45));
              surfaceHeight = mix(0.5, cobble.x, detailFade);
              grainVar = mix(0.5, cobble.y, detailFade);
            } else {
              float tarmac = snoise(worldP * 5.2) * 0.5 + 0.5;
              float micro = (uQualityLevel >= 2) ? (hash12(floor(worldP * 28.0)) * 0.30 * detailFade) : 0.0;
              surfaceHeight = mix(0.5, clamp(tarmac * 0.75 + micro, 0.0, 1.0), detailFade);
              grainVar = tarmac;
            }
          }

          // 2. Flaques organiques (remplissent en priorité les creux)
          float puddleNoise = snoise(worldP * 0.32 + vec2(1.7, -t * 0.02)) * 0.5 + 0.5;
          if (uQualityLevel >= 2) {
            puddleNoise = puddleNoise * 0.7 + (snoise(worldP * 0.78 + vec2(4.2, 1.1)) * 0.5 + 0.5) * 0.3;
          }
          float puddleThresh = 1.0 - clamp(uPuddleCoverage, 0.1, 0.95);
          float puddleMask = smoothstep(puddleThresh - 0.12, puddleThresh + 0.14, puddleNoise + (1.0 - surfaceHeight) * 0.22);

          // Perturbation de réflexion par rides de pluie et micro-relief
          float ripplePerturb = 0.0;
          if (uQualityLevel >= 2 && uRainRipples > 0.01) {
            ripplePerturb = puddleRipples(worldP * 1.4, t * 1.5) * uRainRipples * puddleMask * 0.08;
          }
          float roughnessDistort = (1.0 - puddleMask) * (surfaceHeight - 0.5) * 0.07 + ripplePerturb;
          float rx = (uv.x - 0.5 + uMouse.x * uDepth * 0.14) * aspect + roughnessDistort;

          // 3. Calcul des reflets spéculaires selon reflectionStyle
          vec3 colBase = uUseCustomColors ? uBaseColor : (uPaletteSecondary * 0.22);
          vec3 colRefl = uUseCustomColors ? uReflectionColor : uPaletteAccent;
          vec3 colSec = uUseSecondaryRefl ? uSecondaryReflection : mix(colRefl, uPalettePrimary, 0.5);

          vec3 reflLight = vec3(0.0);
          float distAtten = exp(-d * 2.2) * smoothstep(0.008, 0.045, d);

          if (uReflectionStyle == 0) {
            // === LANTERN : halo de bec de gaz vacillant (Baker Street) ===
            float flicker = 0.88 + 0.12 * sin(uTime * 5.2 + snoise(vec2(uTime * 2.1, 1.3)) * 2.5);
            float col1 = exp(-pow((rx + 0.24 * aspect) * 4.2, 2.0));
            float col2 = exp(-pow((rx - 0.32 * aspect) * 5.5, 2.0)) * 0.65;
            reflLight = colRefl * (col1 + col2) * flicker * (0.45 + 0.95 * puddleMask);

          } else if (uReflectionStyle == 1) {
            // === SHOP_WINDOWS : vitrines médiévales ambrées flanquant la ruelle (Diagon Alley) ===
            float leftWin = exp(-pow((rx + 0.36 * aspect) * 3.4, 2.0)) * (0.75 + 0.25 * sin(z * 0.7 + uTime * 1.2));
            float rightWin = exp(-pow((rx - 0.36 * aspect) * 3.4, 2.0)) * (0.75 + 0.25 * cos(z * 0.65 - uTime * 1.1));
            float centerWarm = exp(-pow(rx * 2.8, 2.0)) * 0.35;
            reflLight = colRefl * (leftWin + rightWin) * (0.5 + 1.05 * puddleMask)
              + colSec * centerWarm * puddleMask * 0.6;

          } else if (uReflectionStyle == 2) {
            // === UNDERGLOW : halo néon sous châssis sur asphalte mouillé (Street Racing) ===
            float pulse = 0.85 + 0.15 * sin(uTime * 2.8);
            float pool = exp(-pow(rx * 2.1, 2.0)) * exp(-pow((uv.y - horizon * 0.42) * 5.2, 2.0));
            float corePool = exp(-pow(rx * 3.8, 2.0)) * exp(-pow((uv.y - horizon * 0.46) * 8.0, 2.0));
            reflLight = colRefl * (pool * 0.95 + corePool * 0.85) * pulse * (0.45 + 0.95 * puddleMask);

          } else if (uReflectionStyle == 3) {
            // === TAIL_LIGHT : ruban rouge rubis continu sur autoroute humide (Carrera) ===
            float ribbon = exp(-pow((rx - sin(z * 0.08) * 0.08) * 9.5, 2.0)) * 1.25;
            float broadGlow = exp(-pow(rx * 3.2, 2.0)) * 0.42;
            float twinGlint = (exp(-pow((rx - 0.06) * 18.0, 2.0)) + exp(-pow((rx + 0.06) * 18.0, 2.0))) * 0.55;
            reflLight = colRefl * (ribbon + broadGlow + twinGlint) * (0.45 + 0.95 * puddleMask);

          } else {
            // === FLAME_TRACKS : deux sillons de flammes parallèles + éclairs bleus (DeLorean) ===
            float trackSpacing = 0.55;
            float fireJitter = snoise(vec2(z * 0.6 - t * 6.0, x * 2.0)) * 0.08;
            float tLeft = exp(-pow((x + trackSpacing + fireJitter) * 3.6, 2.0));
            float tRight = exp(-pow((x - trackSpacing - fireJitter) * 3.6, 2.0));
            float flames = (tLeft + tRight) * (0.75 + 0.4 * sin(z * 1.8 - t * 14.0));
            float sparkFlash = pow(max(0.0, snoise(vec2(x * 1.5, z * 0.4 - t * 5.0))), 5.0) * puddleMask;
            vec3 hotFire = mix(colRefl, vec3(1.0, 0.95, 0.72), clamp(flames * 0.55, 0.0, 0.85));
            reflLight = hotFire * flames * 1.35 + colSec * sparkFlash * 1.1;
          }

          // Composition finale : matière du sol + spéculaire des flaques + brume d'horizon
          vec3 groundCol = colBase * (0.72 + 0.45 * surfaceHeight * (0.7 + 0.3 * grainVar));
          // Les flaques assombrissent le diffus mais amplifient fortement les reflets
          groundCol = mix(groundCol, groundCol * 0.55, puddleMask * 0.6);
          groundCol += reflLight * (0.55 + 0.65 * distAtten) * uIntensity;

          // Brume douce à la ligne d'horizon pour fusionner avec gradient_sky
          float horizonFade = smoothstep(horizon + 0.015, horizon - 0.055, uv.y);
          float horizonMist = exp(-d * 18.0) * 0.45;
          groundCol += colRefl * horizonMist * 0.35 * uIntensity;

          float alpha = clamp(horizonFade * (0.94 + horizonMist * 0.06), 0.0, 1.0);
          if (alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(groundCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -85
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<WetSurfaceProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.baseColor !== undefined) {
      this.baseColorVec.set(newProps.baseColor)
      this.material.uniforms.uBaseColor.value = this.baseColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.reflectionColor !== undefined) {
      this.reflectionColorVec.set(newProps.reflectionColor)
      this.material.uniforms.uReflectionColor.value = this.reflectionColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryReflectionColor !== undefined) {
      this.secondaryReflectionVec.set(newProps.secondaryReflectionColor)
      this.material.uniforms.uSecondaryReflection.value = this.secondaryReflectionVec
      this.material.uniforms.uUseSecondaryRefl.value = true
    }
    if (newProps.surfaceType !== undefined) {
      this.material.uniforms.uSurfaceType.value = SURFACE_TYPE_MAP[newProps.surfaceType] ?? 0
    }
    if (newProps.reflectionStyle !== undefined) {
      this.material.uniforms.uReflectionStyle.value =
        REFLECTION_STYLE_MAP[newProps.reflectionStyle] ?? 0
    }
    if (newProps.horizonHeight !== undefined)
      this.material.uniforms.uHorizonHeight.value = newProps.horizonHeight
    if (newProps.puddleCoverage !== undefined)
      this.material.uniforms.uPuddleCoverage.value = newProps.puddleCoverage
    if (newProps.rainRipples !== undefined)
      this.material.uniforms.uRainRipples.value = newProps.rainRipples
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
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

export const WetSurfaceDefinition: IBrickDefinition<WetSurfaceProps> = {
  type: 'wet_surface',
  category: 'background',
  create: (id, props, context) => new WetSurfaceInstance(id, props, context),
}

BrickRegistry.register(WetSurfaceDefinition)
