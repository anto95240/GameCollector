/**
 * src/theme-engine/bricks/parallax/FabricWaveBrick.ts
 *
 * Brique de Drapé & Ondulation Textile (Couche 2 : Intermediate).
 * Shader procédural 1 draw call simulant une étoffe souple ondulant organiquement sous le vent :
 * - 3 rendus matière physiquement inspirés :
 *   - 'silk_banner' : brillance soyeuse anisotrope et translucidité fluide (Blaugrana)
 *   - 'canvas_banner' : toile brute mate à micro-trame tissée fouettée par le vent (Colchoneros)
 *   - 'velvet_curtain' : velours théâtral profond à rétro-diffusion rasante (sheen) (Syndicate)
 * - Bandes bicolores organiquement déformées par les plis (stripeCount 0..8, jamais rigides)
 * - Mode tentures latérales (sideCurtains: true) encadrant la scène à gauche et à droite
 *   comme un rideau d'opéra en laissant le centre 100 % dégagé
 * - Réaction aux événements rares 'wind_gust', à l'angle lumineux de la souris et au scroll.
 *
 * Thèmes cibles : blaugrana, colchoneros, syndicate.
 * Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  InteractionState,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export type FabricStyle = 'silk_banner' | 'canvas_banner' | 'velvet_curtain'

export interface FabricWaveProps {
  /** Teinte principale du textile (défaut #1d4ed8 ou uPalettePrimary). */
  primaryColor?: string
  /** Teinte secondaire pour les bandes alternées ou les plis profonds (défaut #9f1239 ou uPaletteSecondary). */
  secondaryColor?: string
  /** Nature du textile et réponse lumineuse anisotrope (défaut 'silk_banner'). */
  fabricStyle?: FabricStyle
  /** Nombre de bandes bicolores alternées (0 = uni, 0 à 8, défaut 4). */
  stripeCount?: number
  /** Mode tentures latérales d'opéra encadrant la scène (centre dégagé, défaut false). */
  sideCurtains?: boolean
  /** Amplitude des plis et du souffle de vent (0.15 à 1.0, défaut 0.40). */
  windStrength?: number
  /** Fréquence et compacité des plis textiles (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Cadence d'ondulation des vagues de vent (0.0 à 1.5, défaut 0.35). */
  speed?: number
  /** Sensibilité de l'éclairage directionnel et de la parallaxe à la souris/scroll (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Contraste d'ombrage et opacité du drapé (0.2 à 2.0, défaut 0.90). */
  intensity?: number
  /** Irrégularité organique des bourrasques et plis secondaires (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

const FABRIC_STYLE_MAP: Record<FabricStyle, number> = {
  silk_banner: 0,
  canvas_banner: 1,
  velvet_curtain: 2,
}

function parseBool(val: unknown, fallback: boolean): boolean {
  if (typeof val === 'boolean') return val
  if (val === 'true' || val === 1) return true
  if (val === 'false' || val === 0) return false
  return fallback
}

export class FabricWaveInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'fabric_wave'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: FabricWaveProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private gustBoost = 0

  constructor(id: string, props: FabricWaveProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#1d4ed8')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#9f1239')

    const styleIdx = FABRIC_STYLE_MAP[props.fabricStyle ?? 'silk_banner'] ?? 0
    const stripeCount = props.stripeCount ?? 4
    const sideCurtains = parseBool(props.sideCurtains, false) ? 1.0 : 0.0
    const windStrength = props.windStrength ?? 0.4
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 0.9
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
        uPrimaryColor: { value: this.primaryColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColors: { value: Boolean(props.primaryColor || props.secondaryColor) },
        uFabricStyle: { value: styleIdx },
        uStripeCount: { value: stripeCount },
        uSideCurtains: { value: sideCurtains },
        uWindStrength: { value: windStrength },
        uGustBoost: { value: 0.0 },
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
          gl_Position = vec4(position.xy, 0.990, 1.0);
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
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColors;
        uniform int uFabricStyle;
        uniform float uStripeCount;
        uniform float uSideCurtains;
        uniform float uWindStrength;
        uniform float uGustBoost;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        // Hauteur organique des plis du tissu (retourne hauteur Z en [-1, 1])
        float evalClothHeight(vec2 uv, float t, float windAmp) {
          float freq = clamp(uDensity, 0.4, 2.2);
          float result = 0.0;

          if (uSideCurtains > 0.5) {
            // === TENTURES LATÉRALES D'OPÉRA : plis verticaux lourds froncés en haut ===
            float sideSign = (uv.x < 0.5) ? -1.0 : 1.0;
            float distFromOuter = (uv.x < 0.5) ? uv.x : (1.0 - uv.x);
            // Le haut est fixé sur tringle, le bas flotte davantage sous le courant d'air
            float hangFreedom = smoothstep(1.02, 0.05, uv.y);

            float gatherPhase = distFromOuter * (34.0 * freq) + uv.y * 1.15 * sideSign;
            float sway = snoise(vec2(distFromOuter * 3.2 + sideSign * 2.1, uv.y * 1.7 - t * 0.52)) * hangFreedom;
            float pleats = sin(gatherPhase + sway * (2.2 + windAmp * 2.8));
            float subPleats = sin(gatherPhase * 2.08 - sway * 1.6 + t * 0.42) * 0.42;

            float fineFold = 0.0;
            if (uQualityLevel >= 1) {
              fineFold = snoise(vec2(distFromOuter * 13.0 * freq, uv.y * 3.8 - t * 0.68)) * 0.24 * hangFreedom;
            }
            result = (pleats * 0.62 + subPleats * 0.28 + fineFold) * (0.62 + 0.38 * windAmp);
          } else {
            // === NAPPE / ÉTENDARD ONDULANT SOUS LA BRISE ===
            // Onde de vent diagonale non-linéaire (fréquences incommensurables => zéro boucle)
            float diag1 = uv.x * 4.8 * freq + uv.y * 1.65 * freq;
            float diag2 = uv.x * 8.1 * freq - uv.y * 2.4 * freq;
            float nMacro = snoise(vec2(uv.x * 1.7 * freq - t * 0.42, uv.y * 1.4 * freq + t * 0.18));

            float billow1 = sin(diag1 - t * 1.45 + nMacro * (1.8 + uRandomness * 1.8));
            float billow2 = sin(diag2 - t * 2.18 - nMacro * 1.35) * 0.44;
            float h = (billow1 * 0.68 + billow2 * 0.32);

            if (uQualityLevel >= 1) {
              float wrinkle = snoise(vec2(uv.x * 4.5 * freq - t * 0.85, uv.y * 3.2 * freq + nMacro * 1.1));
              h += wrinkle * (0.28 + uRandomness * 0.22);
            }
            if (uQualityLevel >= 2) {
              // Plis de tension secondaires fins sur tissu tendu
              float tension = snoise(vec2(uv.x * 9.5 * freq - t * 1.35, uv.y * 6.5 * freq + billow1 * 0.8));
              h += tension * 0.14;
            }

            result = h * windAmp;
          }

          return result;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float windAmp = clamp(uWindStrength + uGustBoost * 0.45, 0.12, 1.35);
          float t = uTime * max(0.02, uSpeed) * (0.55 + windAmp * 1.15);

          // Légère déformation sous la souris et le scroll
          vec2 mouseShift = uMouse * (uDepth * 0.045);
          vec2 clothUv = uv + vec2(mouseShift.x * 0.5, uScroll * uDepth * 0.05);

          // Masque des tentures latérales (centre 100 % dégagé en mode sideCurtains)
          float curtainMask = 1.0;
          if (uSideCurtains > 0.5) {
            float distOuter = min(uv.x, 1.0 - uv.x);
            // Drapé d'opéra plus large en haut, s'ouvrant gracieusement vers le centre en descendant
            float drapeCurve = 0.27 - smoothstep(0.95, 0.08, uv.y) * 0.09;
            float edgeWave = snoise(vec2(uv.y * 2.6 - t * 0.42, (uv.x < 0.5 ? 1.3 : 7.9))) * 0.045 * windAmp;
            edgeWave += sin(uv.y * 5.2 - t * 0.85) * 0.015 * windAmp;
            float innerEdge = drapeCurve + edgeWave;

            if (distOuter > innerEdge + 0.04) {
              discard;
            }
            curtainMask = 1.0 - smoothstep(innerEdge - 0.022, innerEdge + 0.012, distOuter);
          }

          // Évaluation du relief textile + normale analytique par différences finies
          float h = evalClothHeight(clothUv, t, windAmp);
          float eps = 0.008;
          float hx = evalClothHeight(clothUv + vec2(eps, 0.0), t, windAmp);
          float hy = evalClothHeight(clothUv + vec2(0.0, eps), t, windAmp);

          float slopeScale = (uFabricStyle == 2) ? 2.8 : (uFabricStyle == 1 ? 2.2 : 1.9);
          vec3 N = normalize(vec3((h - hx) / eps * 0.14 * slopeScale, (h - hy) / eps * 0.14 * slopeScale, 1.0));

          // Déplacement UV apparent dû au plissement (brise tout effet de rayures droites rigides)
          vec2 foldedUv = clothUv + vec2(N.x * 0.065, N.y * 0.045);
          // Influence douce de la souris qui courbe les rubans
          vec2 toMouse = (uv - 0.5) * vec2(aspect, 1.0) - uMouse * 0.5 * vec2(aspect, 1.0);
          float mDist = length(toMouse);
          foldedUv += toMouse * exp(-mDist * 3.8) * 0.045 * uDepth;

          // Couleur de base et bandes bicolores souples (si stripeCount >= 1)
          vec3 colA = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 colB = uUseCustomColors ? uSecondaryColor : uPaletteSecondary;
          vec3 baseAlbedo = colA;

          if (uStripeCount >= 0.5) {
            float stripes = floor(clamp(uStripeCount, 1.0, 8.0) + 0.5);
            // Légère balance modulée par le scroll (fiche blaugrana)
            float stripeCoord = foldedUv.x * stripes + uScroll * uDepth * 0.25 + h * 0.18;
            float waveStripe = sin(stripeCoord * 3.14159265);
            // Transition douce soyeuse (ou légèrement plus nette sur toile brute)
            float edgeSoft = (uFabricStyle == 1) ? 0.14 : 0.34;
            float stripeMix = smoothstep(-edgeSoft, edgeSoft, waveStripe);
            baseAlbedo = mix(colA, colB, stripeMix);
          } else if (uSideCurtains > 0.5) {
            // En velours uni, approfondir les creux vers secondaryColor
            baseAlbedo = mix(colB, colA, smoothstep(-0.65, 0.65, h));
          }

          // Micro-trame textile procédurale (HIGH)
          float weave = 1.0;
          if (uQualityLevel >= 2) {
            if (uFabricStyle == 1) {
              // Toile brute tissée (chaîne et trame orthogonales)
              float warpThread = sin(foldedUv.x * uResolution.x * 0.45);
              float weftThread = sin(foldedUv.y * uResolution.y * 0.45);
              weave = 0.90 + 0.10 * (warpThread * 0.5 + weftThread * 0.5);
            } else if (uFabricStyle == 0) {
              // Fines fibres de soie horizontales
              float silkGrain = snoise(vec2(foldedUv.x * 24.0, foldedUv.y * 120.0));
              weave = 0.95 + 0.05 * silkGrain;
            } else {
              // Grain velouté très fin
              float velvetNap = snoise(foldedUv * 95.0);
              weave = 0.94 + 0.06 * velvetNap;
            }
          }

          // Éclairage directionnel cohérent (la souris oriente le projecteur / soleil rasant)
          vec3 lightDir = normalize(vec3(
            uMouse.x * uDepth * 1.15 + 0.42,
            uMouse.y * uDepth * 0.85 + 0.52,
            0.82
          ));
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          vec3 halfVec = normalize(lightDir + viewDir);

          float ndl = max(0.0, dot(N, lightDir));
          float ndh = max(0.0, dot(N, halfVec));
          float ndv = max(0.0, dot(N, viewDir));
          // Occlusion ambiante dans les creux profonds des plis
          float foldAO = smoothstep(-0.95, 0.72, h);

          vec3 litCol = vec3(0.0);

          if (uFabricStyle == 0) {
            // === SILK_BANNER : brillance soyeuse anisotrope + translucidité lumineuse ===
            float wrapDiff = max(0.0, (dot(N, lightDir) + 0.42) / 1.42);
            // Spéculaire anisotrope étiré le long des crêtes de plis
            vec3 tangent = normalize(vec3(1.0, 0.15, -N.x));
            float tdh = dot(tangent, halfVec);
            float anisoSpec = pow(max(0.0, sqrt(max(0.0, 1.0 - tdh * tdh))), 14.0) * smoothstep(0.15, 0.9, ndl);
            float softSpec = pow(ndh, 18.0) * 0.55;
            float sssBacklight = pow(1.0 - ndv, 2.0) * 0.35;

            litCol = baseAlbedo * weave * (0.34 + 0.76 * wrapDiff) * (0.62 + 0.38 * foldAO);
            litCol += mix(baseAlbedo, vec3(1.0, 0.97, 0.92), 0.55) * (anisoSpec * 0.48 + softSpec * 0.42);
            litCol += baseAlbedo * sssBacklight;

          } else if (uFabricStyle == 1) {
            // === CANVAS_BANNER : toile brute mate, ombres tranchées et léger grain sec ===
            float roughDiff = pow(ndl, 0.92);
            float drySheen = pow(ndh, 6.0) * 0.14;
            litCol = baseAlbedo * weave * (0.26 + 0.84 * roughDiff) * (0.48 + 0.52 * foldAO);
            litCol += mix(baseAlbedo, vec3(1.0), 0.25) * drySheen;

          } else {
            // === VELVET_CURTAIN : velours profond, creux quasi noirs, sheen rasant (Charlie/Fresnel) ===
            float velvetSheen = pow(1.0 - ndv, 2.6) * (0.45 + 0.55 * ndl);
            float grazingLit = pow(max(0.0, dot(N, normalize(vec3(lightDir.x, lightDir.y, 0.35)))), 3.0);
            float deepCrease = pow(foldAO, 1.55);

            litCol = baseAlbedo * weave * (0.14 + 0.72 * ndl) * (0.25 + 0.75 * deepCrease);
            litCol += mix(baseAlbedo * 1.65, vec3(1.0, 0.45, 0.45), 0.22) * (velvetSheen * 0.65 + grazingLit * 0.22);
          }

          // Opacité adaptative : tentures opaques sur les bords, bannière légèrement translucide pour laisser respirer le ciel
          float baseAlpha = (uSideCurtains > 0.5)
            ? (curtainMask * (0.86 + 0.12 * foldAO))
            : ((uFabricStyle == 0) ? (0.62 + 0.24 * foldAO) : (0.76 + 0.18 * foldAO));

          float alpha = clamp(baseAlpha * clamp(uIntensity, 0.2, 2.0), 0.0, 0.96);
          if (alpha <= 0.004) {
            discard;
          }

          // Légère modulation d'éclat par intensity
          litCol *= mix(0.85, 1.18, clamp(uIntensity * 0.55, 0.0, 1.0));
          gl_FragColor = vec4(litCol, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -42
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(
    delta: number,
    _time: number,
    _interaction: InteractionState,
    _quality: QualityTier
  ): void {
    if (!this.material) return
    if (this.gustBoost > 0.001) {
      this.gustBoost = Math.max(0, this.gustBoost - delta * 0.42)
      this.material.uniforms.uGustBoost.value = this.gustBoost
    }
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'wind_gust') {
      this.gustBoost = 1.0
      if (this.material) {
        this.material.uniforms.uGustBoost.value = this.gustBoost
      }
    }
  }

  public updateProps(newProps: Partial<FabricWaveProps>): void {
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
    if (newProps.fabricStyle !== undefined) {
      this.material.uniforms.uFabricStyle.value = FABRIC_STYLE_MAP[newProps.fabricStyle] ?? 0
    }
    if (newProps.stripeCount !== undefined)
      this.material.uniforms.uStripeCount.value = newProps.stripeCount
    if (newProps.sideCurtains !== undefined) {
      this.material.uniforms.uSideCurtains.value = parseBool(newProps.sideCurtains, false)
        ? 1.0
        : 0.0
    }
    if (newProps.windStrength !== undefined)
      this.material.uniforms.uWindStrength.value = newProps.windStrength
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

export const FabricWaveDefinition: IBrickDefinition<FabricWaveProps> = {
  type: 'fabric_wave',
  category: 'intermediate',
  create: (id, props, context) => new FabricWaveInstance(id, props, context),
}

BrickRegistry.register(FabricWaveDefinition)
