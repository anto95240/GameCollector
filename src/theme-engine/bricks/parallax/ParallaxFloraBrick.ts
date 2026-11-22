/**
 * src/theme-engine/bricks/parallax/ParallaxFloraBrick.ts
 *
 * Brique de silhouettes végétales & organiques en parallaxe (Couche 2 : Intermediate).
 * Silhouette multi-strates 100 % procédurale paramétrée par morphologie :
 * - 'giant_leaves' : feuilles monumentales de sous-bois (Sarsaparilla)
 * - 'tall_grass' : vagues d'herbes hautes ondulant sous le vent (Kanto)
 * - 'palm_trees' : palmiers californiens filiformes en contre-jour (Los Santos)
 * - 'coral' : récifs et branches coralliennes marines (Coral Reef)
 * - 'giant_mushrooms' : champignons géants féeriques (Wonderland)
 * - 'fantasy_ferns' : fougères oniriques à pointes bioluminescentes (Glade of Dreams)
 *
 * Flexion quadratique organique sous rafales Simplex, perspective atmosphérique
 * par profondeur Z, parallaxe souris/scroll et paliers HIGH / MEDIUM / LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type FloraSilhouetteType =
  | 'giant_leaves'
  | 'tall_grass'
  | 'palm_trees'
  | 'coral'
  | 'giant_mushrooms'
  | 'fantasy_ferns'

export interface ParallaxFloraProps {
  /** Teinte dominante du premier plan végétal (défaut #15803d ou uPaletteSecondary). */
  primaryColor?: string
  /** Teinte secondaire / reflets de rim-light et strates lointaines (défaut #86efac ou uPaletteAccent). */
  secondaryColor?: string
  /** Teinte de la brume atmosphérique d'horizon (défaut #0f172a ou uPalettePrimary). */
  fogColor?: string
  /** Morphologie de la flore en silhouette (défaut 'tall_grass'). */
  floraType?: FloraSilhouetteType
  /** Nombre de strates de profondeur (1 à 3, défaut 3). */
  layers?: number
  /** Amplitude du balancement organique sous le vent/courant (0.0 à 1.2, défaut 0.5). */
  swayStrength?: number
  /** Multiplicateur de hauteur/échelle monumentale (0.5 à 1.8, défaut 1.0). */
  scaleMultiplier?: number
  /** Intensité de bioluminescence sur les bords/pointes (0.0 à 1.0, défaut 0.0). */
  glowTips?: number
  /** Densité et compacité des silhouettes (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Vitesse d'ondulation du vent (0.0 à 1.2, défaut 0.3). */
  speed?: number
  /** Profondeur et sensibilité à la parallaxe souris/scroll (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Contraste et opacité globale (0.2 à 2.0, défaut 1.0). */
  intensity?: number
  /** Variabilité des hauteurs et courbures (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

const FLORA_TYPE_MAP: Record<FloraSilhouetteType, number> = {
  giant_leaves: 0,
  tall_grass: 1,
  palm_trees: 2,
  coral: 3,
  giant_mushrooms: 4,
  fantasy_ferns: 5,
}

export class ParallaxFloraInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_flora'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxFloraProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color
  private fogColorVec: THREE.Color

  constructor(id: string, props: ParallaxFloraProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#15803d')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#86efac')
    this.fogColorVec = new THREE.Color(props.fogColor ?? '#0f172a')

    const floraIdx = FLORA_TYPE_MAP[props.floraType ?? 'tall_grass'] ?? 1
    const layers = Math.min(3, Math.max(1, Math.round(props.layers ?? 3)))
    const swayStrength = props.swayStrength ?? 0.5
    const scaleMultiplier = props.scaleMultiplier ?? 1.0
    const glowTips = props.glowTips ?? 0.0
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.0
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
        uFogColor: { value: this.fogColorVec },
        uUseCustomColors: {
          value: Boolean(props.primaryColor || props.secondaryColor || props.fogColor),
        },
        uFloraType: { value: floraIdx },
        uLayers: { value: layers },
        uSwayStrength: { value: swayStrength },
        uScaleMultiplier: { value: scaleMultiplier },
        uGlowTips: { value: glowTips },
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
          gl_Position = vec4(position.xy, 0.991, 1.0);
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
        uniform vec3 uFogColor;
        uniform bool uUseCustomColors;
        uniform int uFloraType;
        uniform int uLayers;
        uniform float uSwayStrength;
        uniform float uScaleMultiplier;
        uniform float uGlowTips;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Retourne vec2(coverage, tipFactor) pour un élément végétal donné
        vec2 floraShape(vec2 p, float h, float w, float sway, float seed) {
          if (p.y < -0.02 || p.y > h * 1.25) return vec2(0.0);
          float yRel = clamp(p.y / max(0.01, h), 0.0, 1.25);
          // Flexion quadratique réaliste (base ancrée, sommet souple)
          float bend = sway * yRel * yRel;
          float px = p.x - bend;

          if (uFloraType == 0) {
            // === GIANT_LEAVES : feuilles monumentales courbes ===
            float arch = sin(yRel * 2.1 + seed) * w * 0.45 * (seed > 0.5 ? 1.0 : -1.0);
            float lx = px - arch;
            float leafProfile = sin(clamp(yRel, 0.0, 1.0) * 3.14159) * w * (1.25 - 0.35 * yRel);
            if (uQualityLevel >= 2) {
              leafProfile += snoise(vec2(yRel * 10.0 + seed * 5.0, seed * 3.0)) * w * 0.14;
            }
            float stem = step(yRel, 0.25) * (w * 0.11);
            float bound = max(leafProfile, stem);
            float cov = smoothstep(bound, bound - 0.004, abs(lx)) * step(yRel, 1.0);
            // Nervure centrale subtile
            float vein = exp(-abs(lx) * 140.0) * smoothstep(0.95, 0.1, yRel);
            return vec2(cov, clamp(yRel * 0.7 + vein * 0.4, 0.0, 1.0));

          } else if (uFloraType == 1) {
            // === TALL_GRASS : lames d'herbes hautes courbées ===
            float lean = (seed - 0.5) * w * 2.2 * yRel * yRel;
            float gx = px - lean;
            float bladeW = w * 0.24 * pow(max(0.0, 1.0 - yRel), 0.75);
            float cov = smoothstep(bladeW, bladeW - 0.003, abs(gx)) * step(yRel, 1.0);
            return vec2(cov, pow(clamp(yRel, 0.0, 1.0), 1.5));

          } else if (uFloraType == 2) {
            // === PALM_TREES : tronc filiforme courbe + vraies palmes effilées et retombantes ===
            float curveDir = (seed > 0.5) ? 1.0 : -1.0;
            float trunkCurve = sin(yRel * 1.55) * w * 0.72 * curveDir;
            float tx = px - trunkCurve;
            float trunkW = w * (0.088 - 0.044 * clamp(yRel, 0.0, 1.0));
            float inTrunk = smoothstep(trunkW, trunkW - 0.0025, abs(tx)) * step(yRel, 0.87);

            // Origine de la couronne exactement au sommet du tronc
            vec2 crownOrigin = vec2(
              sin(0.87 * 1.55) * w * 0.72 * curveDir + sway * 0.76,
              h * 0.86
            );
            vec2 cp = p - crownOrigin;
            float cr = length(cp);
            float palmReach = w * 1.95;
            float inCrown = 0.0;
            float frondRim = 0.0;

            if (cr < palmReach) {
              // 8 palmes arquées indépendantes (4 à gauche, 4 à droite) avec folioles dentelées
              for (int f = 0; f < 8; f++) {
                float ff = float(f);
                float side = (mod(ff, 2.0) < 0.5) ? -1.0 : 1.0;
                float tier = floor(ff * 0.5); // 0..3 du bas vers le haut
                float fLen = palmReach * (0.68 + 0.30 * hash12(vec2(ff, seed * 13.7)));
                // Coordonnée horizontale le long de la palme (0 à 1)
                float u = (cp.x * side) / max(0.001, fLen);
                if (u < -0.02 || u > 1.05) continue;

                float uClamped = clamp(u, 0.0, 1.0);
                // Angle de départ (palmes basses tombent vite, palmes hautes montent puis retombent)
                float lift = (-0.12 + tier * 0.28) + sway * 1.4 * side;
                float droop = (0.48 - tier * 0.06);
                float spineY = fLen * (lift * uClamped - droop * uClamped * uClamped);

                float dy = cp.y - spineY;
                // Folioles pendantes principalement sous l'arête centrale + crénelage fin
                float taper = smoothstep(0.0, 0.14, uClamped) * pow(max(0.0, 1.0 - uClamped), 0.75);
                float leafletNotch = 0.65 + 0.35 * abs(sin(uClamped * 34.0 + ff * 1.7));
                float upperW = w * 0.045 * taper;
                float lowerW = w * 0.24 * taper * leafletNotch;

                float fCov = 0.0;
                if (dy >= 0.0) {
                  fCov = smoothstep(upperW, upperW * 0.25, dy);
                } else {
                  fCov = smoothstep(lowerW, lowerW * 0.35, -dy);
                }
                fCov *= smoothstep(1.03, 0.92, u);
                inCrown = max(inCrown, fCov);
                frondRim = max(frondRim, fCov * uClamped);
              }
            }
            float cov = max(inTrunk, inCrown);
            return vec2(cov, clamp(frondRim * 0.9, 0.0, 1.0));

          } else if (uFloraType == 3) {
            // === CORAL : branches coralliennes ramifiées ===
            float mainW = w * 0.16 * (1.1 - 0.55 * yRel);
            float trunkX = px - sin(yRel * 5.0 + seed * 4.0) * w * 0.14;
            float cov = smoothstep(mainW, mainW - 0.003, abs(trunkX)) * step(yRel, 0.92);

            // 2 ramifications latérales
            float b1y = yRel - 0.35;
            if (b1y > 0.0 && b1y < 0.58) {
              float b1x = px - b1y * w * 1.15 - sin(b1y * 8.0) * w * 0.08;
              float b1w = w * 0.11 * (1.0 - b1y * 1.2);
              cov = max(cov, smoothstep(b1w, b1w - 0.003, abs(b1x)));
            }
            float b2y = yRel - 0.48;
            if (b2y > 0.0 && b2y < 0.52) {
              float b2x = px + b2y * w * 1.05 + sin(b2y * 7.0) * w * 0.08;
              float b2w = w * 0.10 * (1.0 - b2y * 1.2);
              cov = max(cov, smoothstep(b2w, b2w - 0.003, abs(b2x)));
            }
            return vec2(cov, clamp(yRel, 0.0, 1.0));

          } else if (uFloraType == 4) {
            // === GIANT_MUSHROOMS : pied galbé + chapeau bombé féerique ===
            float stemCurve = sin(yRel * 2.2) * w * 0.16 * (seed > 0.5 ? 1.0 : -1.0);
            float sx = px - stemCurve;
            float stemW = w * (0.22 - 0.08 * sin(clamp(yRel, 0.0, 1.0) * 3.14));
            float inStem = smoothstep(stemW, stemW - 0.003, abs(sx)) * step(yRel, 0.72);

            // Chapeau bombé (ellipse supérieure)
            vec2 capCenter = vec2(stemCurve + sway * 0.55, h * 0.70);
            vec2 capP = (p - capCenter) / vec2(w * 1.18, h * 0.32);
            float capDist = length(capP);
            float inCap = smoothstep(1.0, 0.94, capDist) * smoothstep(-0.28, -0.05, capP.y);
            // Rim brillant sous le chapeau
            float gillGlow = exp(-abs(capP.y + 0.12) * 14.0) * inCap;
            float cov = max(inStem, inCap);
            return vec2(cov, clamp(inCap * 0.65 + gillGlow * 0.5, 0.0, 1.0));

          } else {
            // === FANTASY_FERNS : fougères géantes crénelées à pointes lumineuses ===
            float curl = pow(yRel, 1.8) * w * 0.85 * (seed > 0.5 ? 1.0 : -1.0);
            float fx = px - curl;
            float pinnae = 0.68 + 0.32 * sin(yRel * 28.0 + seed * 6.0);
            float fernW = w * 0.82 * sin(clamp(yRel, 0.0, 1.0) * 3.14159) * pinnae;
            fernW = max(fernW, w * 0.08 * step(yRel, 0.92));
            float cov = smoothstep(fernW, fernW - 0.0035, abs(fx)) * step(yRel, 1.0);
            float edgeGlow = smoothstep(fernW * 0.55, fernW, abs(fx)) * cov;
            return vec2(cov, clamp(yRel * 0.6 + edgeGlow * 0.7, 0.0, 1.0));
          }
        }

        vec4 evaluateFloraLayer(
          vec2 uv,
          float baseLineY,
          float layerScale,
          float parallaxRatio,
          vec3 layerCol,
          vec3 rimCol,
          vec3 fogCol,
          float t
        ) {
          float shiftX = uMouse.x * uDepth * parallaxRatio * 1.35;
          float shiftY = uMouse.y * uDepth * parallaxRatio * 0.35 + uScroll * parallaxRatio * 0.18;
          vec2 p = vec2(uv.x + shiftX, uv.y + shiftY);

          // Relief du sol ondulant doucement
          float groundY = baseLineY + snoise(vec2(p.x * 2.2, layerScale * 4.7)) * 0.035;
          float localY = p.y - groundY;

          // Espacement adapté au type de flore
          float baseCell = (uFloraType == 1) ? 0.032 : ((uFloraType == 2) ? 0.15 : 0.11);
          float cellW = baseCell / max(0.35, layerScale * uDensity);
          float idx = floor(p.x / cellW);

          vec2 best = vec2(0.0);
          // Vérifie la cellule courante + voisines pour éviter toute coupure aux bords
          for (int k = -1; k <= 1; k++) {
            float cIdx = idx + float(k);
            float rSeed = hash12(vec2(cIdx, layerScale * 19.7 + float(uFloraType) * 3.1));
            float exists = step(uFloraType == 2 ? 0.28 : 0.12, rSeed);
            if (exists < 0.5) continue;

            float centerX = (cIdx + 0.5 + (rSeed - 0.5) * 0.42) * cellW;
            float baseH = (uFloraType == 2) ? 0.42 : ((uFloraType == 1) ? 0.24 : 0.28);
            float itemH = baseH * (0.72 + rSeed * 0.55 * uRandomness) * layerScale * uScaleMultiplier;
            float itemW = cellW * (uFloraType == 1 ? 0.95 : 0.62) * (0.78 + rSeed * 0.4);

            // Rafales de vent progressives non-linéaires
            float gust = sin(t * 1.9 + cIdx * 0.72) * 0.022 + snoise(vec2(centerX * 2.8 - t * 0.65, layerScale)) * 0.028;
            float sway = gust * uSwayStrength * layerScale;

            vec2 res = floraShape(vec2(p.x - centerX, localY), itemH, itemW, sway, rSeed);
            if (res.x > best.x) {
              best = res;
            }
          }

          float inGround = step(p.y, groundY);
          float coverage = max(best.x, inGround);
          if (coverage <= 0.005) return vec4(0.0);

          // Éclairage rim-light + bioluminescence optionnelle sur les pointes
          vec3 col = mix(layerCol * 0.82, mix(layerCol, rimCol, 0.35), best.y);
          if (uGlowTips > 0.01) {
            float pulse = 0.7 + 0.3 * sin(t * 2.2 + p.x * 8.0);
            col += rimCol * pow(best.y, 2.2) * uGlowTips * 0.9 * pulse;
          }

          // Brume douce à la base
          float mist = smoothstep(0.0, 0.08 * layerScale, max(0.0, localY));
          col = mix(mix(fogCol, layerCol, 0.55), col, mist * 0.8 + 0.2);

          return vec4(col, coverage * uIntensity);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime * max(0.02, uSpeed);

          vec3 colPrim = uUseCustomColors ? uPrimaryColor : (uPaletteSecondary * 0.42);
          vec3 colRim = uUseCustomColors ? uSecondaryColor : uPaletteAccent;
          vec3 colFog = uUseCustomColors ? uFogColor : (uPalettePrimary * 0.28);

          vec4 result = vec4(0.0);
          int activeLayers = (uQualityLevel == 0) ? 1 : ((uQualityLevel == 1) ? min(uLayers, 2) : uLayers);

          // Strate lointaine (plan 3)
          if (activeLayers >= 3) {
            vec3 farCol = mix(colPrim, colFog, 0.62);
            vec4 l3 = evaluateFloraLayer(uv, 0.16, 0.68, 0.14, farCol, colRim * 0.6, colFog, t * 0.65);
            if (l3.a > 0.0) result = l3;
          }

          // Strate médiane (plan 2)
          if (activeLayers >= 2) {
            vec3 midCol = mix(colPrim, colFog, 0.32);
            vec4 l2 = evaluateFloraLayer(uv, 0.08, 0.95, 0.30, midCol, colRim * 0.8, colFog, t * 0.85);
            if (l2.a > 0.0) result = mix(result, l2, l2.a);
          }

          // Strate premier plan (plan 1)
          vec4 l1 = evaluateFloraLayer(uv, 0.01, 1.28, 0.52, colPrim, colRim, colFog * 0.7, t);
          if (l1.a > 0.0) result = mix(result, l1, l1.a);

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
    this.mesh.renderOrder = -38
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxFloraProps>): void {
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
    if (newProps.fogColor !== undefined) {
      this.fogColorVec.set(newProps.fogColor)
      this.material.uniforms.uFogColor.value = this.fogColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.floraType !== undefined) {
      this.material.uniforms.uFloraType.value = FLORA_TYPE_MAP[newProps.floraType] ?? 1
    }
    if (newProps.layers !== undefined) {
      this.material.uniforms.uLayers.value = Math.min(3, Math.max(1, Math.round(newProps.layers)))
    }
    if (newProps.swayStrength !== undefined)
      this.material.uniforms.uSwayStrength.value = newProps.swayStrength
    if (newProps.scaleMultiplier !== undefined)
      this.material.uniforms.uScaleMultiplier.value = newProps.scaleMultiplier
    if (newProps.glowTips !== undefined) this.material.uniforms.uGlowTips.value = newProps.glowTips
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

export const ParallaxFloraDefinition: IBrickDefinition<ParallaxFloraProps> = {
  type: 'parallax_flora',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxFloraInstance(id, props, context),
}

BrickRegistry.register(ParallaxFloraDefinition)
