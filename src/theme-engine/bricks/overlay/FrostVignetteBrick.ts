/**
 * src/theme-engine/bricks/overlay/FrostVignetteBrick.ts
 *
 * Brique de style et d'overlay : Givre & Cristaux Périphériques (Couche 5 : Overlay).
 * Shader Voronoi cristallin + FBM dendritique strictement confiné aux bordures d'écran
 * (pourtour complet, coins, ou arête inférieure) afin de préserver 100 % la lisibilité
 * du contenu UI central.
 * - 'frost' : dendrites de givre translucide et aiguilles glacées (Whiteout, Arkham City, Winter Is Coming)
 * - 'mineral_shards' : éclats cristallins anguleux facettés à reflets spéculaires (Heisenberg)
 *
 * Reflets spéculaires réactifs à la direction souris, respiration organique lente,
 * early-discard hors marge et adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
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
  private scene: THREE.Scene
  private props: FrostVignetteProps
  private crystalColorVec: THREE.Color
  private tintColorVec: THREE.Color

  constructor(id: string, props: FrostVignetteProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Voronoi cristallin retournant (F1, F2 - F1, seedCellule)
        vec3 voronoiCrystal(vec2 x, float jitter, float timeDrift) {
          vec2 n = floor(x);
          vec2 f = fract(x);
          float m1 = 8.0;
          float m2 = 8.0;
          float cellSeed = 0.0;

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
              } else if (d < m2) {
                m2 = d;
              }
            }
          }
          float f1 = sqrt(m1);
          float f2 = sqrt(m2);
          return vec3(f1, f2 - f1, cellSeed);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = uv * vec2(aspect, 1.0);

          float t = uTime * max(0.01, uSpeed) * (0.4 + uBreathSpeed * 1.4);
          // Respiration lente non-linéaire du givre
          float breath = (sin(t * 1.15) * 0.6 + sin(t * 1.87 + 1.1) * 0.4) * 0.025;
          float effectiveSpread = clamp(uSpread, 0.12, 0.45) + breath + uScroll * uDepth * 0.02;

          // Calcul de distance aux bordures autorisées
          float edgeDist = 1.0;
          if (uEdgeMask == 1) {
            // corners : coins uniquement, centre et milieux de bords dégagés
            vec2 cornerVec = min(uv, 1.0 - uv) * vec2(aspect, 1.0);
            edgeDist = length(cornerVec) * 0.72;
          } else if (uEdgeMask == 2) {
            // bottom : croissance depuis l'arête inférieure uniquement
            edgeDist = uv.y;
          } else {
            // perimeter : pourtour complet avec renforcement naturel aux coins
            vec2 m = min(uv, 1.0 - uv);
            edgeDist = min(min(m.x, m.y), length(m) * 0.85);
          }

          // Rejet rapide du centre écran (garantit 100 % la lisibilité UI et zéro coût fragment)
          if (edgeDist > effectiveSpread + 0.14) {
            discard;
          }

          vec3 colCrystal = uUseCustomColors ? uCrystalColor : uPaletteAccent;
          vec3 colTint = uUseCustomColors ? uTintColor : uPalettePrimary;

          float coarseNoise = snoise(p * 3.8 + vec2(0.0, t * 0.06)) * 0.5 + 0.5;
          float warpBoundary = (coarseNoise - 0.5) * 0.11 * (0.45 + uRandomness);

          if (uQualityLevel == 0) {
            // === PALIER LOW : masque périphérique bruité ultra-léger ===
            float mask = 1.0 - smoothstep(effectiveSpread * 0.18, effectiveSpread + warpBoundary, edgeDist);
            float frostTex = mix(0.65, 1.15, coarseNoise);
            float alpha = clamp(mask * frostTex * uIntensity * 0.72, 0.0, 0.82);
            if (alpha <= 0.004) discard;
            vec3 lowCol = mix(colTint, colCrystal, mask * 0.65);
            gl_FragColor = vec4(lowCol, alpha);
            return;
          }

          // === PALIERS MEDIUM & HIGH : Voronoi cristallin + dendrites / éclats ===
          float voroScale = (uCrystalStyle == 1 ? 12.5 : 13.5) * clamp(uDensity, 0.4, 2.2);
          float jitter = (uCrystalStyle == 1) ? 0.92 : (0.72 + uRandomness * 0.28);

          vec3 v1 = voronoiCrystal(p * voroScale, jitter, t * 0.14);
          float edgeMetric = v1.y; // F2 - F1 : distance à la jonction entre deux facettes
          float cellSeed = v1.z;

          float detailMask = 0.0;
          float sparkle = 0.0;
          float facetLight = 0.0;

          if (uCrystalStyle == 1) {
            // === MINERAL_SHARDS : éclats anguleux facettés (Heisenberg) ===
            float spikeBias = (v1.x * 0.10 + (1.0 - edgeMetric) * 0.06) * (0.5 + uRandomness * 0.6);
            float shardCutoff = effectiveSpread + warpBoundary + spikeBias;
            float baseEnv = 1.0 - smoothstep(effectiveSpread * 0.10, max(0.04, shardCutoff), edgeDist);
            baseEnv = pow(baseEnv, 1.25);

            // Arêtes nettes des cristaux
            float sharpEdge = exp(-edgeMetric * mix(8.0, 28.0, uFacetSharpness));
            float crystalBody = smoothstep(0.72, 0.05, v1.x) * 0.52 + 0.48;

            // Normale pseudo-3D par facette + réflexion spéculaire pilotée par la souris
            float facAng = cellSeed * 6.28318;
            vec3 shardN = normalize(vec3(cos(facAng) * 0.55, sin(facAng) * 0.55, 0.72));
            vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.9 + 0.35, uMouse.y * uDepth * 0.9 + 0.55, 0.95));
            float ndl = max(0.0, dot(shardN, lightDir));
            facetLight = pow(ndl, mix(5.0, 20.0, uFacetSharpness)) * 0.85;

            if (uQualityLevel >= 2) {
              vec3 v2 = voronoiCrystal(p * voroScale * 2.15 + vec2(4.2, 1.7), 0.88, -t * 0.10);
              float microBevel = exp(-v2.y * 24.0) * 0.48;
              sharpEdge = max(sharpEdge, microBevel);
              float pinGlint = pow(max(0.0, snoise(p * 48.0 + vec2(uMouse.x * 2.0, t * 0.3))), 7.0);
              sparkle = (pow(ndl, 26.0) * (0.35 + 0.65 * sharpEdge) + pinGlint * 0.8) * 0.75;
            }

            detailMask = baseEnv * clamp(crystalBody * 0.65 + sharpEdge * 0.65, 0.0, 1.0);
          } else {
            // === FROST : dendrites de givre cristallin fin (aiguilles et fougères de glace) ===
            float dendrite1 = 1.0 - abs(snoise(p * 18.0 + vec2(v1.x * 3.0, t * 0.05)));
            float dendriteSharp = pow(clamp(dendrite1, 0.0, 1.0), 3.0);
            float frostBoundary = effectiveSpread + warpBoundary + (dendriteSharp - 0.25) * 0.11;
            float baseEnv = 1.0 - smoothstep(effectiveSpread * 0.04, max(0.05, frostBoundary), edgeDist);
            // Dégradé progressif plus fondu vers l'intérieur (évite une ligne de coupe nette)
            baseEnv = pow(baseEnv, 1.48);

            float frostVeins = exp(-edgeMetric * mix(7.5, 22.0, uFacetSharpness));
            float rimeLayer = smoothstep(0.65, 0.08, v1.x) * 0.38;
            float frostPattern = clamp(frostVeins * 0.58 + dendriteSharp * 0.55 + rimeLayer, 0.0, 1.0);

            if (uQualityLevel >= 2) {
              float fineNeedles = pow(clamp(1.0 - abs(snoise(p * 38.0 + vec2(dendrite1 * 2.2, -t * 0.06))), 0.0, 1.0), 3.6);
              frostPattern = clamp(frostPattern * 0.78 + fineNeedles * 0.48, 0.0, 1.0);

              // Micro-étincelles ponctuelles d'aiguilles de glace (jamais des polygones plats entiers)
              float microCrystal = snoise(p * 62.0 + vec2(uMouse.x * uDepth * 3.0, uMouse.y * uDepth * 3.0 + t * 0.4));
              sparkle = pow(max(0.0, microCrystal), 9.0) * (0.45 + 0.55 * frostVeins) * 1.35;
              vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.8 + 0.2, uMouse.y * uDepth * 0.8 + 0.4, 1.0));
              facetLight = max(0.0, dot(normalize(vec3(cos(cellSeed * 6.28), sin(cellSeed * 6.28), 0.92)), lightDir)) * 0.22 * frostVeins;
            }

            detailMask = baseEnv * clamp(0.28 + frostPattern * 0.82, 0.0, 1.0);
          }

          float alpha = clamp(detailMask * uIntensity * 0.86, 0.0, 0.85);
          if (alpha <= 0.004) {
            discard;
          }

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

export const FrostVignetteDefinition: IBrickDefinition<FrostVignetteProps> = {
  type: 'frost_vignette',
  category: 'overlay',
  create: (id, props, context) => new FrostVignetteInstance(id, props, context),
}

BrickRegistry.register(FrostVignetteDefinition)
