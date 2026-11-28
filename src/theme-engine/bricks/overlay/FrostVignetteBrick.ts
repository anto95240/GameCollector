/**
 * src/theme-engine/bricks/overlay/FrostVignetteBrick.ts
 *
 * Brique de style et d'overlay : Givre & Cristaux Périphériques (Couche 5 : Overlay).
 * Shader Voronoi cristallin + dendrites fractales ramifiées confinées aux bordures d'écran
 * (pourtour complet, coins, ou arête inférieure) afin de préserver 100 % la lisibilité
 * du contenu UI central :
 * - 'frost' : dendrites cristallines fractales orientées vers l'intérieur (fougères de glace)
 * - 'mineral_shards' : éclats cristallins anguleux facettés à reflets spéculaires (Heisenberg)
 * - Croissance lente asymptotique depuis les bords au fil du temps (t = 2s -> 10s)
 * - Buée froide (condensation) devant le front de givre et transparence réaliste
 * - Légère réfraction optique de la scène arrière à travers les cristaux (FramebufferTexture en HIGH/MEDIUM)
 * - Scintillement micro-cristallin directionnel réactif à la souris
 * - Palier LOW sans copie FBO pour préserver 100 % des FPS mobiles.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type FrostCrystalStyle = 'frost' | 'mineral_shards'
export type FrostEdgeMask = 'perimeter' | 'corners' | 'bottom'

export interface FrostVignetteProps {
  /** Teinte principale des cristaux / givre (défaut #e0f2fe ou uPaletteAccent). */
  crystalColor?: string
  /** Teinte secondaire de réfraction glacée / minérale (défaut #38bdf8 ou uPalettePrimary). */
  tintColor?: string
  /** Morphologie des cristaux : dendrites organiques ou éclats facettés (défaut 'frost'). */
  crystalStyle?: FrostCrystalStyle
  /** Zone d'ancrage périphérique préservant le centre UI (défaut 'perimeter'). */
  edgeMask?: FrostEdgeMask
  /** Avancée périphérique bridée pour ne jamais masquer l'UI centrale (0.15 à 0.45, défaut 0.30). */
  spread?: number
  /** Netteté et acuité des arêtes et facettes (0.2 à 1.0, défaut 0.65). */
  facetSharpness?: number
  /** Cadence de respiration et scintillement lent (0.0 à 1.5, défaut 0.25). */
  breathSpeed?: number
  /** Échelle spatiale et finesse de maille cristalline (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.0 à 1.5, défaut 0.25). */
  speed?: number
  /** Sensibilité directionnelle des reflets spéculaires à la souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Opacité et éclat cristallin global (0.2 à 1.5, défaut 0.75). */
  intensity?: number
  /** Irrégularité organique du contour et des facettes (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Densité de la buée froide précédant les cristaux (0.0 à 1.0, défaut 0.45). */
  fogAmount?: number
  /** Puissance de la légère réfraction optique à travers la glace (0.0 à 0.08, défaut 0.025). */
  refractionStrength?: number
  /** Vitesse de croissance lente du givre depuis les bordures (0.0 à 1.0, défaut 0.22). */
  growthRate?: number
}

const CRYSTAL_STYLE_MAP: Record<FrostCrystalStyle, number> = {
  frost: 0,
  mineral_shards: 1,
}

const EDGE_MASK_MAP: Record<FrostEdgeMask, number> = {
  perimeter: 0,
  corners: 1,
  bottom: 2,
}

export class FrostVignetteInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'frost_vignette'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: FrostVignetteProps
  private crystalColorVec: THREE.Color
  private tintColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: FrostVignetteProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.crystalColorVec = new THREE.Color(props.crystalColor ?? '#e0f2fe')
    this.tintColorVec = new THREE.Color(props.tintColor ?? '#38bdf8')

    const styleIdx = CRYSTAL_STYLE_MAP[props.crystalStyle ?? 'frost'] ?? 0
    const maskIdx = EDGE_MASK_MAP[props.edgeMask ?? 'perimeter'] ?? 0
    const spread = props.spread ?? 0.3
    const facetSharpness = props.facetSharpness ?? 0.65
    const breathSpeed = props.breathSpeed ?? 0.25
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 0.75
    const randomness = props.randomness ?? 0.45
    const fogAmount = props.fogAmount ?? 0.45
    const refractionStrength = props.refractionStrength ?? 0.025
    const growthRate = props.growthRate ?? 0.22

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uCrystalColor: { value: this.crystalColorVec },
        uTintColor: { value: this.tintColorVec },
        uUseCustomColors: { value: Boolean(props.crystalColor || props.tintColor) },
        uCrystalStyle: { value: styleIdx },
        uEdgeMask: { value: maskIdx },
        uSpread: { value: spread },
        uFacetSharpness: { value: facetSharpness },
        uBreathSpeed: { value: breathSpeed },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uFogAmount: { value: fogAmount },
        uRefractionStrength: { value: refractionStrength },
        uGrowthRate: { value: growthRate },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.998, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCrystalColor;
        uniform vec3 uTintColor;
        uniform bool uUseCustomColors;
        uniform int uCrystalStyle;
        uniform int uEdgeMask;
        uniform float uSpread;
        uniform float uFacetSharpness;
        uniform float uBreathSpeed;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uFogAmount;
        uniform float uRefractionStrength;
        uniform float uGrowthRate;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        // Voronoi cristallin retournant (F1, F2 - F1, seedCellule, dirX, dirY)
        // Retourne vec4(F1, F2 - F1, cellSeed, angleNorm)
        vec4 voronoiCrystal(vec2 x, float jitter, float timeDrift) {
          vec2 n = floor(x);
          vec2 f = fract(x);
          float m1 = 8.0;
          float m2 = 8.0;
          float cellSeed = 0.0;
          vec2 bestR = vec2(0.0);

          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 h = hash22(n + g);
              vec2 o = 0.5 + jitter * 0.45 * sin(timeDrift + 6.2831 * h);
              vec2 r = g + o - f;
              float d = dot(r, r);
              if (d < m1) {
                m2 = m1;
                m1 = d;
                cellSeed = h.x;
                bestR = r;
              } else if (d < m2) {
                m2 = d;
              }
            }
          }
          float f1 = sqrt(m1);
          float f2 = sqrt(m2);
          float ang = atan(bestR.y, bestR.x);
          return vec4(f1, f2 - f1, cellSeed, ang);
        }

        // Dendrites cristallines fractales orientées (aiguilles de givre / fougères de glace)
        float fractalDendrite(vec2 p, float angle, float sharpness, int octaves) {
          float c = cos(angle);
          float s = sin(angle);
          vec2 rp = mat2(c, -s, s, c) * p;
          // Étirement anisotrope le long de l'axe cristallin + ramification latérale à 60°
          vec2 stem = vec2(rp.x * 0.55, rp.y * 2.15);
          float sum = 0.0;
          float amp = 0.55;
          float freq = 1.0;

          for (int i = 0; i < 4; i++) {
            if (i >= octaves) break;
            float n = snoise(stem * freq + vec2(float(i) * 7.3, float(i) * 3.1));
            float ridge = 1.0 - abs(n);
            ridge = pow(clamp(ridge, 0.0, 1.0), mix(1.8, 3.6, sharpness));
            sum += ridge * amp;
            // Rotation hexagonale (60°) entre les octaves pour ramification dendritique
            mat2 hexRot = mat2(0.5, -0.866025, 0.866025, 0.5);
            stem = hexRot * stem * 1.92;
            amp *= 0.54;
          }
          return clamp(sum, 0.0, 1.15);
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          float aspect = res.x / res.y;
          vec2 p = uv * vec2(aspect, 1.0);

          float t = uTime * max(0.01, uSpeed) * (0.4 + uBreathSpeed * 1.4);

          // Croissance lente asymptotique du givre depuis les bords (visible entre t=2s et t=10s)
          float growthFactor = uGrowthRate <= 0.005
            ? 1.0
            : mix(0.46, 1.0, 1.0 - exp(-uTime * (0.10 + uSpeed * 0.22) * clamp(uGrowthRate, 0.05, 1.0) * 1.4));

          // Respiration lente non-linéaire du givre
          float breath = (sin(t * 1.15) * 0.6 + sin(t * 1.87 + 1.1) * 0.4) * 0.018;
          float baseSpread = clamp(uSpread, 0.12, 0.45);
          float effectiveSpread = baseSpread * growthFactor + breath + uScroll * uDepth * 0.02;

          // Distance aux bordures et direction rentrante pour orienter les dendrites
          float edgeDist = 1.0;
          vec2 inwardDir = vec2(0.0, 1.0);
          if (uEdgeMask == 1) {
            vec2 cornerVec = min(uv, 1.0 - uv) * vec2(aspect, 1.0);
            edgeDist = length(cornerVec) * 0.72;
            vec2 toCenter = vec2(0.5) - uv;
            inwardDir = length(toCenter) > 0.001 ? normalize(toCenter) : vec2(0.0, 1.0);
          } else if (uEdgeMask == 2) {
            edgeDist = uv.y;
            inwardDir = vec2(0.0, 1.0);
          } else {
            vec2 m = min(uv, 1.0 - uv);
            edgeDist = min(min(m.x, m.y), length(m) * 0.85);
            vec2 toCenter = vec2(0.5) - uv;
            inwardDir = length(toCenter) > 0.001 ? normalize(toCenter) : vec2(0.0, 1.0);
          }

          // Rejet rapide du centre écran (garantit 100 % la lisibilité UI et zéro coût fragment)
          float maxReach = effectiveSpread + 0.16;
          if (edgeDist > maxReach) {
            if (uHasScreenTex && uQualityLevel >= 1) {
              gl_FragColor = texture2D(uScreenTex, uv);
              return;
            }
            discard;
          }

          vec3 colCrystal = uUseCustomColors ? uCrystalColor : uPaletteAccent;
          vec3 colTint = uUseCustomColors ? uTintColor : uPalettePrimary;

          float coarseNoise = snoise(p * 3.8 + vec2(0.0, t * 0.04)) * 0.5 + 0.5;
          float warpBoundary = (coarseNoise - 0.5) * 0.10 * (0.45 + uRandomness);

          if (uQualityLevel == 0) {
            // === PALIER LOW : masque périphérique bruité + fine buée sans copie FBO ===
            float mask = 1.0 - smoothstep(effectiveSpread * 0.16, effectiveSpread + warpBoundary, edgeDist);
            float frostTex = mix(0.65, 1.15, coarseNoise);
            float fogLow = (1.0 - smoothstep(effectiveSpread * 0.1, effectiveSpread + 0.09, edgeDist)) * uFogAmount * 0.35;
            float alpha = clamp(max(mask * frostTex * uIntensity * 0.65, fogLow), 0.0, 0.78);
            if (alpha <= 0.004) discard;
            vec3 lowCol = mix(colTint, colCrystal, mask * 0.68);
            gl_FragColor = vec4(lowCol, alpha);
            return;
          }

          // === PALIERS MEDIUM & HIGH : Voronoi cristallin + dendrites fractales + réfraction ===
          float voroScale = (uCrystalStyle == 1 ? 11.5 : 10.5) * clamp(uDensity, 0.4, 2.2);
          float jitter = (uCrystalStyle == 1) ? 0.92 : (0.74 + uRandomness * 0.24);

          vec4 v1 = voronoiCrystal(p * voroScale, jitter, t * 0.08);
          float edgeMetric = v1.y; // F2 - F1 : distance à la jonction entre deux facettes
          float cellSeed = v1.z;
          float cellAng = v1.w;

          float detailMask = 0.0;
          float sparkle = 0.0;
          float facetLight = 0.0;
          vec2 refractSlope = vec2(0.0);

          if (uCrystalStyle == 1) {
            // === MINERAL_SHARDS : éclats anguleux facettés (Heisenberg) ===
            float spikeBias = (v1.x * 0.10 + (1.0 - edgeMetric) * 0.06) * (0.5 + uRandomness * 0.6);
            float shardCutoff = effectiveSpread + warpBoundary + spikeBias;
            float baseEnv = 1.0 - smoothstep(effectiveSpread * 0.08, max(0.04, shardCutoff), edgeDist);
            baseEnv = pow(baseEnv, 1.25);

            float sharpEdge = exp(-edgeMetric * mix(8.0, 28.0, uFacetSharpness));
            float crystalBody = smoothstep(0.72, 0.05, v1.x) * 0.52 + 0.48;

            float facAng = cellSeed * 6.28318;
            vec3 shardN = normalize(vec3(cos(facAng) * 0.58, sin(facAng) * 0.58, 0.72));
            vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.9 + 0.35, uMouse.y * uDepth * 0.9 + 0.55, 0.95));
            float ndl = max(0.0, dot(shardN, lightDir));
            facetLight = pow(ndl, mix(5.0, 20.0, uFacetSharpness)) * 0.85;
            refractSlope = shardN.xy * (0.7 + 0.5 * sharpEdge);

            if (uQualityLevel >= 2) {
              vec4 v2 = voronoiCrystal(p * voroScale * 2.15 + vec2(4.2, 1.7), 0.88, -t * 0.06);
              float microBevel = exp(-v2.y * 24.0) * 0.48;
              sharpEdge = max(sharpEdge, microBevel);
              float pinGlint = pow(max(0.0, snoise(p * 52.0 + vec2(uMouse.x * 2.5, t * 0.35))), 9.0);
              sparkle = (pow(ndl, 26.0) * (0.35 + 0.65 * sharpEdge) + pinGlint * 0.95) * 0.80;
            }

            detailMask = baseEnv * clamp(crystalBody * 0.62 + sharpEdge * 0.65, 0.0, 1.0);
          } else {
            // === FROST : dendrites fractales ramifiées orientées vers l'intérieur ===
            float baseInwardAngle = atan(inwardDir.y, inwardDir.x);
            float crystalAngle = baseInwardAngle + (cellSeed - 0.5) * 1.15;
            int dendOctaves = uQualityLevel >= 2 ? 4 : 3;

            float dendA = fractalDendrite(p * (7.5 * clamp(uDensity, 0.5, 2.0)), crystalAngle, uFacetSharpness, dendOctaves);
            float dendB = uQualityLevel >= 2
              ? fractalDendrite(p * (13.0 * clamp(uDensity, 0.5, 2.0)) + vec2(3.7, 1.9), crystalAngle + 1.0472, uFacetSharpness, 3)
              : 0.0;
            float dendriteCombined = clamp(dendA * 0.72 + dendB * 0.45, 0.0, 1.0);

            // Front dendritique organique : les pointes fractales poussent le long des bords
            float frostBoundary = effectiveSpread + warpBoundary + (dendriteCombined - 0.30) * 0.12;
            float baseEnv = 1.0 - smoothstep(effectiveSpread * 0.03, max(0.04, frostBoundary), edgeDist);
            baseEnv = pow(baseEnv, 1.35);

            float frostVeins = exp(-edgeMetric * mix(7.0, 22.0, uFacetSharpness));
            float rimeLayer = smoothstep(0.65, 0.08, v1.x) * 0.28;
            float frostPattern = clamp(dendriteCombined * 0.75 + frostVeins * 0.45 + rimeLayer, 0.0, 1.0);

            refractSlope = vec2(cos(cellAng), sin(cellAng)) * (0.45 + 0.65 * dendriteCombined);

            if (uQualityLevel >= 2) {
              // Micro-scintillement cristallin dépendant de la souris et du temps
              float glintNoise = snoise(p * 64.0 + vec2(uMouse.x * uDepth * 3.5, uMouse.y * uDepth * 3.5 + t * 0.45));
              sparkle = pow(max(0.0, glintNoise), 10.0) * (0.40 + 0.60 * dendriteCombined) * 1.55;
              vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.85 + 0.25, uMouse.y * uDepth * 0.85 + 0.45, 1.0));
              facetLight = max(0.0, dot(normalize(vec3(refractSlope * 0.65, 0.90)), lightDir)) * 0.28 * (frostVeins + dendriteCombined * 0.5);
            }

            detailMask = baseEnv * clamp(0.22 + frostPattern * 0.82, 0.0, 1.0);
          }

          // Buée glacée translucide s'étendant légèrement devant les pointes de cristaux
          float fogEdge = effectiveSpread + 0.085 + warpBoundary * 0.6;
          float fogBase = 1.0 - smoothstep(effectiveSpread * 0.05, max(0.06, fogEdge), edgeDist);
          float fogTex = uQualityLevel >= 2
            ? mix(0.55, 1.05, snoise(p * 6.5 + vec2(t * 0.02, -t * 0.015)) * 0.5 + 0.5)
            : 0.8;
          float fogMask = clamp(fogBase * fogTex * clamp(uFogAmount, 0.0, 1.0) * (0.65 + 0.35 * growthFactor), 0.0, 0.72);

          if (uHasScreenTex) {
            vec4 rawCenter = texture2D(uScreenTex, uv);
            float totalCover = clamp(max(detailMask, fogMask), 0.0, 1.0);
            if (totalCover <= 0.004) {
              gl_FragColor = rawCenter;
              return;
            }

            // Légère réfraction optique de la scène à travers les cristaux de glace
            float refrAmt = clamp(uRefractionStrength, 0.0, 0.08) * detailMask * clamp(uIntensity, 0.3, 1.5);
            vec2 refrUv = clamp(uv + refractSlope * refrAmt, vec2(0.001), vec2(0.999));

            vec3 bgCol;
            if (uQualityLevel >= 2) {
              // Léger givre optique flouté (4 taps dans la glace/buée + légère dispersion)
              vec2 blurStep = (1.0 / res) * (1.2 + fogMask * 2.8 + detailMask * 1.4);
              vec3 sR = unpremultiply(texture2D(uScreenTex, clamp(refrUv + refractSlope * refrAmt * 0.22 + vec2(blurStep.x, 0.0), vec2(0.001), vec2(0.999))));
              vec3 sG = unpremultiply(texture2D(uScreenTex, clamp(refrUv + vec2(0.0, blurStep.y), vec2(0.001), vec2(0.999))));
              vec3 sB = unpremultiply(texture2D(uScreenTex, clamp(refrUv - refractSlope * refrAmt * 0.22 - vec2(blurStep.x, 0.0), vec2(0.001), vec2(0.999))));
              vec3 sC = unpremultiply(texture2D(uScreenTex, refrUv));
              bgCol = vec3(
                (sR.r + sC.r + sG.r) / 3.0,
                (sG.g + sC.g + sR.g) / 3.0,
                (sB.b + sC.b + sG.b) / 3.0
              );
            } else {
              vec2 blurStep = (1.0 / res) * (fogMask * 2.0 + 0.8);
              vec3 s1 = unpremultiply(texture2D(uScreenTex, refrUv));
              vec3 s2 = unpremultiply(texture2D(uScreenTex, clamp(refrUv + blurStep, vec2(0.001), vec2(0.999))));
              bgCol = mix(s1, s2, 0.45);
            }

            // Transparence réaliste : la buée adoucit, les cristaux réfractent et accrochent la lumière
            vec3 iceTint = mix(colTint, colCrystal, clamp(detailMask * 0.72 + facetLight * 0.4, 0.0, 1.0));
            float iceOpacity = clamp(detailMask * uIntensity * 0.56, 0.0, 0.68);
            float fogOpacity = clamp(fogMask * 0.42 * clamp(uIntensity, 0.4, 1.4), 0.0, 0.48);

            vec3 outCol = mix(bgCol, mix(colTint, vec3(0.88, 0.95, 1.0), 0.45), fogOpacity);
            outCol = mix(outCol, iceTint, iceOpacity);
            // Scintillements blancs purs sur les arêtes cristallines
            outCol += vec3(0.96, 0.99, 1.0) * (facetLight * 0.42 + sparkle) * detailMask * clamp(uIntensity, 0.3, 1.5);

            float outAlpha = clamp(max(rawCenter.a, max(iceOpacity, fogOpacity)), 0.0, 1.0);
            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          float alpha = clamp(max(detailMask * uIntensity * 0.78, fogMask * 0.45), 0.0, 0.85);
          if (alpha <= 0.004) discard;
          vec3 col = mix(colTint, colCrystal, clamp(detailMask * 0.75 + facetLight * 0.45, 0.0, 1.0));
          col += vec3(0.95, 0.99, 1.0) * (facetLight * 0.38 + sparkle) * detailMask;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 93

    this.mesh.onBeforeRender = (renderer) => {
      if (!this.material) return
      if (this.currentQuality === 'LOW') {
        this.material.uniforms.uHasScreenTex.value = false
        this.material.blending = THREE.NormalBlending
        return
      }

      renderer.getDrawingBufferSize(this.dbSize)
      const w = Math.floor(this.dbSize.x)
      const h = Math.floor(this.dbSize.y)
      if (w <= 0 || h <= 0) return

      if (!this.frameTex || this.frameTex.image.width !== w || this.frameTex.image.height !== h) {
        if (this.frameTex) this.frameTex.dispose()
        this.frameTex = new THREE.FramebufferTexture(w, h)
        this.frameTex.magFilter = THREE.LinearFilter
        this.frameTex.minFilter = THREE.LinearFilter
        this.frameTex.wrapS = THREE.ClampToEdgeWrapping
        this.frameTex.wrapT = THREE.ClampToEdgeWrapping
      }

      renderer.copyFramebufferToTexture(this.frameTex)
      this.material.uniforms.uScreenTex.value = this.frameTex
      this.material.uniforms.uHasScreenTex.value = true
      this.material.blending = THREE.CustomBlending
      this.material.blendSrc = THREE.OneFactor
      this.material.blendDst = THREE.ZeroFactor
      this.material.blendEquation = THREE.AddEquation
    }

    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<FrostVignetteProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.crystalColor !== undefined) {
      this.crystalColorVec.set(newProps.crystalColor)
      this.material.uniforms.uCrystalColor.value = this.crystalColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.tintColor !== undefined) {
      this.tintColorVec.set(newProps.tintColor)
      this.material.uniforms.uTintColor.value = this.tintColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.crystalStyle !== undefined) {
      this.material.uniforms.uCrystalStyle.value = CRYSTAL_STYLE_MAP[newProps.crystalStyle] ?? 0
    }
    if (newProps.edgeMask !== undefined) {
      this.material.uniforms.uEdgeMask.value = EDGE_MASK_MAP[newProps.edgeMask] ?? 0
    }
    if (newProps.spread !== undefined) this.material.uniforms.uSpread.value = newProps.spread
    if (newProps.facetSharpness !== undefined)
      this.material.uniforms.uFacetSharpness.value = newProps.facetSharpness
    if (newProps.breathSpeed !== undefined)
      this.material.uniforms.uBreathSpeed.value = newProps.breathSpeed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.fogAmount !== undefined)
      this.material.uniforms.uFogAmount.value = newProps.fogAmount
    if (newProps.refractionStrength !== undefined)
      this.material.uniforms.uRefractionStrength.value = newProps.refractionStrength
    if (newProps.growthRate !== undefined)
      this.material.uniforms.uGrowthRate.value = newProps.growthRate
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0

    if (quality === 'LOW') {
      this.material.uniforms.uHasScreenTex.value = false
      this.material.uniforms.uScreenTex.value = null
      this.material.blending = THREE.NormalBlending
      if (this.frameTex) {
        this.frameTex.dispose()
        this.frameTex = null
      }
    }
  }

  public dispose(): void {
    if (this.frameTex) {
      this.frameTex.dispose()
      this.frameTex = null
    }
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) this.material.dispose()
      this.mesh = null
      this.material = null
    }
  }
}

export const FrostVignetteDefinition: IBrickDefinition<FrostVignetteProps> = {
  type: 'frost_vignette',
  category: 'overlay',
  create: (id, props, context) => new FrostVignetteInstance(id, props, context),
}

BrickRegistry.register(FrostVignetteDefinition)
