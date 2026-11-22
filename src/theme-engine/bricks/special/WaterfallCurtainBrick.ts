/**
 * src/theme-engine/bricks/special/WaterfallCurtainBrick.ts
 *
 * Brique Spéciale : Rideau de Cascade Multi-Strates & Embruns (Couche Spéciale).
 * Shader procédural 1 draw call simulant une chute d'eau monumentale vivante :
 * - Crête courbable : falaise rectiligne (arcCurvature = 0.0, Drake's Fortune) ou
 *   bord courbé d'un monde plat plongeant dans le vide cosmique (arcCurvature = 0.35, Discworld)
 * - 3 strates d'écoulement gravitaire à vitesses différentielles et étirement accéléré
 *   (nappe profonde, voile translucide médian, filets d'écume frontaux rapides)
 * - Lèvre d'écume bouillonnante le long de la crête et franges organiques dentelées
 * - Nappe d'embruns volumétriques turbulents à la base (mistHeight) réactive au vent/souris
 *
 * Thèmes cibles : drakes_fortune, discworld.
 * Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export interface WaterfallCurtainProps {
  /** Teinte de la masse d'eau vive (défaut #14b8a6 ou uPalettePrimary). */
  waterColor?: string
  /** Teinte des filets d'écume et de la crête bouillonnante (défaut #ecfeff ou uPaletteAccent). */
  foamColor?: string
  /** Teinte du halo d'embruns volumétriques à la base (défaut #cffafe ou uPaletteSecondary). */
  mistColor?: string
  /** Courbure de la ligne de crête : 0.0 = falaise droite, 0.35 = bord d'un monde plat (0.0 à 0.5, défaut 0.0). */
  arcCurvature?: number
  /** Vitesse de chute gravitaire de l'eau (0.3 à 1.5, défaut 0.80). */
  flowSpeed?: number
  /** Hauteur et volume de la nappe d'embruns à la base (0.15 à 0.55, défaut 0.35). */
  mistHeight?: number
  /** Largeur relative du rideau d'eau à l'écran (0.3 à 1.0, défaut 0.78). */
  curtainWidth?: number
  /** Finesse et densité des filets d'écume (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Multiplicateur global de cadence temporelle (0.0 à 1.5, défaut 0.50). */
  speed?: number
  /** Étagement en profondeur et parallaxe souris/scroll (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance lumineuse et opacité globale (0.2 à 2.0, défaut 1.05). */
  intensity?: number
  /** Turbulence des filets, irrégularité des bords et embruns (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

export class WaterfallCurtainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'waterfall_curtain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WaterfallCurtainProps
  private waterColorVec: THREE.Color
  private foamColorVec: THREE.Color
  private mistColorVec: THREE.Color

  constructor(id: string, props: WaterfallCurtainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.waterColorVec = new THREE.Color(props.waterColor ?? '#14b8a6')
    this.foamColorVec = new THREE.Color(props.foamColor ?? '#ecfeff')
    this.mistColorVec = new THREE.Color(props.mistColor ?? '#cffafe')

    const arcCurvature = props.arcCurvature ?? 0.0
    const flowSpeed = props.flowSpeed ?? 0.8
    const mistHeight = props.mistHeight ?? 0.35
    const curtainWidth = props.curtainWidth ?? 0.78
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.5
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.05
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
        uWaterColor: { value: this.waterColorVec },
        uFoamColor: { value: this.foamColorVec },
        uMistColor: { value: this.mistColorVec },
        uUseCustomColors: {
          value: Boolean(props.waterColor || props.foamColor || props.mistColor),
        },
        uArcCurvature: { value: arcCurvature },
        uFlowSpeed: { value: flowSpeed },
        uMistHeight: { value: mistHeight },
        uCurtainWidth: { value: curtainWidth },
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
          gl_Position = vec4(position.xy, 0.992, 1.0);
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
        uniform vec3 uWaterColor;
        uniform vec3 uFoamColor;
        uniform vec3 uMistColor;
        uniform bool uUseCustomColors;
        uniform float uArcCurvature;
        uniform float uFlowSpeed;
        uniform float uMistHeight;
        uniform float uCurtainWidth;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Filets d'eau descendante étirés par gravité avec léger méandre organique
        float waterSheet(vec2 p, float fallDist, float t, float freqX, float freqY, float seed) {
          // Accélération gravitaire : les filets s'allongent en descendant
          float accelY = fallDist * (1.0 + fallDist * 0.65);
          float lateralSway = snoise(vec2(p.x * 1.8 + seed, accelY * 1.2 - t * 0.45)) * (0.04 + uRandomness * 0.05);
          vec2 st = vec2((p.x + lateralSway) * freqX, accelY * freqY - t);
          float n1 = snoise(st + vec2(seed, 0.0));
          float n2 = snoise(st * vec2(1.85, 0.92) + vec2(seed + 7.3, -t * 0.35));
          return clamp((n1 * 0.62 + n2 * 0.38) * 0.5 + 0.5, 0.0, 1.0);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float curv = clamp(uArcCurvature, 0.0, 0.5);
          float t = uTime * max(0.05, uFlowSpeed) * (0.55 + uSpeed * 1.15);

          // Parallaxe globale douce
          vec2 parallax = uMouse * (uDepth * 0.06) + vec2(0.0, uScroll * uDepth * 0.04);
          vec2 p = vec2((uv.x - 0.5 - parallax.x) * aspect, uv.y - parallax.y);

          // Ligne de crête : rectiligne (falaise) ou arc de monde plat (Discworld)
          float halfW = clamp(uCurtainWidth, 0.3, 1.0) * 0.5 * aspect;
          float normX = p.x / max(0.15, halfW);
          float crestBase = mix(0.84, 0.78, curv * 2.0);
          float arcDrop = curv * 0.52 * normX * normX;
          float crestJitter = snoise(vec2(p.x * 3.8, t * 0.08)) * 0.016 * (0.4 + uRandomness);
          float crestY = crestBase - arcDrop + crestJitter;

          // Rejet rapide bien au-dessus de la ligne de crête (laisse voir le ciel ou le cosmos)
          if (uv.y > crestY + 0.08) {
            discard;
          }

          float fallDist = max(0.0, crestY - uv.y);

          // Légère divergence radiale quand la crête est courbée (chute vers l'abîme spatial)
          float radialFan = curv * 0.28 * fallDist;
          float sampleX = p.x / (1.0 + radialFan);

          // Masque horizontal organique avec franges latérales dentelées (jamais de boîte rigide)
          float edgeIrreg = snoise(vec2(uv.y * 3.2 - t * 0.4, sign(p.x) * 4.7)) * 0.085 * (0.4 + uRandomness);
          float edgeMask = 1.0 - smoothstep(halfW * 0.74 + edgeIrreg, halfW * 1.04 + edgeIrreg, abs(sampleX));

          // Découpage en colonnes naturelles de chute (rochers affleurants à la crête)
          float splitNoise = snoise(vec2(sampleX * 4.5 * clamp(uDensity, 0.4, 2.2), 1.9)) * 0.5 + 0.5;
          float columnMod = mix(0.68, 1.0, smoothstep(0.12, 0.65, splitNoise + (1.0 - uRandomness) * 0.35));
          float belowCrest = smoothstep(crestY + 0.025, crestY - 0.035, uv.y);

          // En mode monde plat courbé, la cascade se dissipe doucement dans le vide cosmique en bas
          float abyssDissolve = mix(1.0, smoothstep(0.0, 0.24, uv.y), smoothstep(0.12, 0.35, curv));
          float curtainEnv = edgeMask * belowCrest * columnMod * abyssDissolve;

          // 1. Strates d'écoulement gravitaire (1 en LOW, 2 en MEDIUM, 3 en HIGH)
          float dScale = clamp(uDensity, 0.4, 2.2);
          float waterBody = 0.0;
          float foamRibbons = 0.0;
          float sparkleSpray = 0.0;

          if (uQualityLevel == 0) {
            // === PALIER LOW : 1 strate principale rapide ===
            float s1 = waterSheet(vec2(sampleX, uv.y), fallDist, t * 1.5, 9.0 * dScale, 2.4, 1.2);
            waterBody = 0.45 + 0.55 * s1;
            foamRibbons = smoothstep(0.62, 0.90, s1);
          } else {
            // Strate arrière profonde (plus lente, parallaxe réduite)
            float backX = sampleX + uMouse.x * uDepth * 0.02;
            float backFlow = waterSheet(vec2(backX, uv.y), fallDist, t * 1.05, 7.5 * dScale, 2.1, 2.4);

            // Strate médiane vive
            float midFlow = waterSheet(vec2(sampleX, uv.y), fallDist, t * 1.65, 13.0 * dScale, 2.9, 13.7);
            waterBody = clamp(backFlow * 0.52 + midFlow * 0.62, 0.0, 1.0);
            foamRibbons = pow(smoothstep(0.56, 0.90, midFlow), 1.35) * 0.85;

            if (uQualityLevel >= 2) {
              // Strate frontale rapide : filets d'écume blancs haute fréquence + embruns détachés
              float frontX = sampleX - uMouse.x * uDepth * 0.035;
              float frontFlow = waterSheet(vec2(frontX, uv.y), fallDist, t * 2.35, 22.0 * dScale, 4.2, 31.1);
              float fineFoam = pow(smoothstep(0.62, 0.93, frontFlow), 1.5);
              foamRibbons = clamp(foamRibbons + fineFoam * 0.78, 0.0, 1.3);

              // Scintillements solaires / cristallins sur les gouttes projetées
              float glintNoise = snoise(vec2(frontX * 36.0, uv.y * 14.0 - t * 3.1));
              sparkleSpray = pow(max(0.0, glintNoise), 8.0) * (0.45 + 0.55 * foamRibbons) * 1.2;
            }
          }

          // Lèvre d'écume bouillonnante à la ligne de crête (dentelée et aérée pour garder la lisibilité UI)
          float lipBand = exp(-pow((uv.y - (crestY - 0.012)) / 0.026, 2.0)) * edgeMask * columnMod;
          float lipBreak = smoothstep(0.18, 0.82, snoise(vec2(sampleX * 16.0, t * 1.45)) * 0.5 + 0.5);
          float lipFoam = lipBand * (0.38 + 0.52 * lipBreak);

          // 2. Nappe d'embruns volumétriques turbulents à la base (mistHeight)
          float mistH = clamp(uMistHeight, 0.15, 0.55);
          float mistEnv = smoothstep(mistH + 0.14, 0.0, uv.y) * smoothstep(halfW * 1.35, halfW * 0.22, abs(p.x));
          float mistDensity = 0.0;
          if (mistEnv > 0.005) {
            vec2 mistUv = vec2(p.x * 2.4 - uMouse.x * uDepth * 0.35, uv.y * 3.6 - t * 0.24);
            float m1 = snoise(mistUv) * 0.5 + 0.5;
            float m2 = (uQualityLevel >= 1) ? (snoise(mistUv * 2.2 + vec2(t * 0.18, -t * 0.32)) * 0.5 + 0.5) : 0.5;
            float billow = mix(m1, m1 * 0.62 + m2 * 0.38, 0.7);
            // Légèrement plus aéré sur un monde plat cosmique pour préserver la profondeur stellaire
            float mistStrength = mix(0.88, 0.62, smoothstep(0.1, 0.4, curv));
            mistDensity = mistEnv * smoothstep(0.22, 0.88, billow) * mistStrength;
          }

          vec3 colWater = uUseCustomColors ? uWaterColor : uPalettePrimary;
          vec3 colFoam = uUseCustomColors ? uFoamColor : uPaletteAccent;
          vec3 colMist = uUseCustomColors ? uMistColor : mix(colFoam, uPaletteSecondary, 0.35);

          // Éclairage directionnel cohérent (lueur de crête + réfraction turquoise interne)
          float depthShade = mix(0.48, 1.05, waterBody) * mix(0.76, 1.12, smoothstep(0.0, 0.55, uv.y));
          float sunSheen = exp(-pow((p.x - uMouse.x * uDepth * 0.45) * 1.8, 2.0)) * 0.28;
          vec3 waterCol = colWater * (depthShade + sunSheen);
          waterCol = mix(waterCol, colFoam, clamp(foamRibbons * 0.72 + lipFoam * 0.68, 0.0, 0.92));
          waterCol += vec3(0.95, 0.99, 1.0) * sparkleSpray;

          float waterAlpha = clamp(curtainEnv * (0.42 + waterBody * 0.36 + foamRibbons * 0.26 + lipFoam * 0.35), 0.0, 0.92);
          float mistAlpha = clamp(mistDensity * 0.82, 0.0, 0.80);

          // Fusion front-to-back : les embruns enveloppent le pied de la cascade
          float outAlpha = clamp((mistAlpha + waterAlpha * (1.0 - mistAlpha * 0.55)) * clamp(uIntensity, 0.2, 2.0), 0.0, 0.94);
          if (outAlpha <= 0.004) {
            discard;
          }

          vec3 mistLit = colMist * (0.86 + 0.26 * sunSheen);
          vec3 finalCol = mix(waterCol, mistLit, clamp(mistAlpha / max(0.001, outAlpha), 0.0, 0.88));
          gl_FragColor = vec4(finalCol, outAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -36
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<WaterfallCurtainProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.waterColor !== undefined) {
      this.waterColorVec.set(newProps.waterColor)
      this.material.uniforms.uWaterColor.value = this.waterColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.foamColor !== undefined) {
      this.foamColorVec.set(newProps.foamColor)
      this.material.uniforms.uFoamColor.value = this.foamColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.mistColor !== undefined) {
      this.mistColorVec.set(newProps.mistColor)
      this.material.uniforms.uMistColor.value = this.mistColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.arcCurvature !== undefined)
      this.material.uniforms.uArcCurvature.value = newProps.arcCurvature
    if (newProps.flowSpeed !== undefined)
      this.material.uniforms.uFlowSpeed.value = newProps.flowSpeed
    if (newProps.mistHeight !== undefined)
      this.material.uniforms.uMistHeight.value = newProps.mistHeight
    if (newProps.curtainWidth !== undefined)
      this.material.uniforms.uCurtainWidth.value = newProps.curtainWidth
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

export const WaterfallCurtainDefinition: IBrickDefinition<WaterfallCurtainProps> = {
  type: 'waterfall_curtain',
  category: 'special',
  create: (id, props, context) => new WaterfallCurtainInstance(id, props, context),
}

BrickRegistry.register(WaterfallCurtainDefinition)
