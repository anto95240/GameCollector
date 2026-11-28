/**
 * src/theme-engine/bricks/special/WaterfallCurtainBrick.ts
 *
 * Brique Spéciale : Rideau de Cascade Multi-Strates & Embruns (Couche Spéciale).
 * Shader procédural 1 draw call simulant une chute d'eau monumentale vivante :
 * - Crête courbable : falaise rectiligne (arcCurvature = 0.0, Drake's Fortune) ou
 *   bord courbé d'un monde plat plongeant dans le vide cosmique (arcCurvature = 0.35, Discworld)
 * - Stries verticales fibreuses physiquement étirées par accélération gravitaire (temps de chute sqrt)
 *   avec vitesses variables selon les colonnes d'eau (veines rapides centrales vs voiles latéraux)
 * - Translucidité différenciée réaliste (voiles fins laissant transparaître le décor arrière vs
 *   lames aérées et filets d'écume blancs opaques + diffusion turquoise rétro-éclairée)
 * - Écume bouillonnante turbulente à l'impact en bas de chute + embruns ascendants qui montent
 *   en panaches de brume et micro-gouttelettes réactives au vent/souris
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
  /** Degré de translucidité du voile d'eau entre les filets d'écume (0.0 à 1.0, défaut 0.55). */
  translucency?: number
  /** Intensité de l'écume bouillonnante à l'impact en bas de cascade (0.0 à 1.5, défaut 0.85). */
  baseFoamIntensity?: number
  /** Amplitude des variations de vitesse entre les colonnes de chute (0.0 à 1.0, défaut 0.55). */
  speedVariation?: number
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
    const translucency = props.translucency ?? 0.55
    const baseFoamIntensity = props.baseFoamIntensity ?? 0.85
    const speedVariation = props.speedVariation ?? 0.55

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
        uTranslucency: { value: translucency },
        uBaseFoamIntensity: { value: baseFoamIntensity },
        uSpeedVariation: { value: speedVariation },
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
        uniform float uTranslucency;
        uniform float uBaseFoamIntensity;
        uniform float uSpeedVariation;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Nappe d'eau descendante à stries verticales fluides (lames liquides + filets d'écume)
        // Temps de chute physique tau ~ sqrt(y) : les lames s'étirent réellement en accélérant.
        // Coût réduit (1 snoise principal par strate) pour tenir 60 FPS même couplé à parallax_forest.
        vec2 waterSheet(float x, float fallTau, float fallDist, float t, float freqX, float freqY, float colSpeed, float seed) {
          float localT = t * colSpeed;
          // Méandre organique léger sans appel snoise supplémentaire coûteux
          float sway = sin(fallTau * 4.2 - localT * 0.7 + x * 3.1 + seed) * (0.010 + fallDist * (0.014 + uRandomness * 0.018));
          float sx = x + sway;

          vec2 st = vec2(sx * freqX, fallTau * freqY - localT);
          float n = snoise(st + vec2(seed, 0.0));
          float body = n * 0.5 + 0.5;
          // Combinaison d'une lame liquide douce et d'une crête filamenteuse souple (évite l'aspect code-barres)
          float ridge = pow(clamp(1.0 - abs(n), 0.0, 1.0), 1.85);
          float ribbon = smoothstep(0.46, 0.92, body);
          float streak = clamp(ribbon * 0.62 + ridge * 0.55, 0.0, 1.15);
          return vec2(body, streak);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float curv = clamp(uArcCurvature, 0.0, 0.5);
          float t = uTime * max(0.05, uFlowSpeed) * (0.55 + uSpeed * 1.15);
          float transAmt = clamp(uTranslucency, 0.0, 1.0);
          float foamBaseAmt = clamp(uBaseFoamIntensity, 0.0, 1.5);
          float spdVar = clamp(uSpeedVariation, 0.0, 1.0);

          // Parallaxe globale douce
          vec2 parallax = uMouse * (uDepth * 0.06) + vec2(0.0, uScroll * uDepth * 0.04);
          vec2 p = vec2((uv.x - 0.5 - parallax.x) * aspect, uv.y - parallax.y);

          // Ligne de crête naturelle (escarpement organique ou arc de monde plat)
          float halfW = clamp(uCurtainWidth, 0.3, 1.0) * 0.5 * aspect;
          float normX = p.x / max(0.15, halfW);
          float crestBase = mix(0.86, 0.78, curv * 2.0);
          float arcDrop = curv * 0.52 * normX * normX;
          float ledgeProfile = snoise(vec2(p.x * 2.6, 1.3)) * 0.026 * (0.5 + uRandomness * 0.6)
            + sin(p.x * 7.5 + 0.8) * 0.008;
          float crestY = crestBase - arcDrop + ledgeProfile;

          // Rejet rapide bien au-dessus de la ligne de crête
          if (uv.y > crestY + 0.07) {
            discard;
          }

          float fallDist = max(0.0, crestY - uv.y);
          // Temps de chute gravitaire physique (croît en sqrt(fallDist) -> étirement réel vers le bas)
          float fallTau = (sqrt(0.14 + fallDist * 2.35) - sqrt(0.14)) * 0.92;

          // Légère divergence radiale quand la crête est courbée (chute vers l'abîme spatial)
          float radialFan = curv * 0.28 * fallDist;
          float sampleX = p.x / (1.0 + radialFan);

          // Masque horizontal organique avec franges latérales souples
          float edgeIrreg = sin(uv.y * 9.0 - t * 1.1 + sign(p.x) * 2.1) * 0.032
            + snoise(vec2(uv.y * 2.4 - t * 0.35, sign(p.x) * 4.7)) * 0.065 * (0.4 + uRandomness);
          float edgeMask = 1.0 - smoothstep(halfW * 0.68 + edgeIrreg, halfW * 1.04 + edgeIrreg, abs(sampleX));

          // Découpage en veines / colonnes naturelles (rochers affleurants à la crête)
          float dScale = clamp(uDensity, 0.4, 2.2);
          float splitNoise = snoise(vec2(sampleX * 3.6 * dScale, 1.9)) * 0.5 + 0.5;
          float columnProfile = clamp(splitNoise * 0.78 + (0.5 + 0.5 * sin(sampleX * 11.0 * dScale + 1.2)) * 0.22, 0.0, 1.0);
          float columnMod = mix(0.36, 1.0, smoothstep(0.15, 0.78, columnProfile + (1.0 - uRandomness) * 0.25));

          // Vitesses variables par colonne : les veines centrales épaisses plongent plus vite
          float centerVelBias = mix(0.80, 1.16, 1.0 - clamp(abs(normX), 0.0, 1.0));
          float colSpeed = mix(1.0, (0.68 + 0.64 * columnProfile) * centerVelBias, spdVar);

          // Arrondi souple du basculement de l'eau à la crête
          float belowCrest = smoothstep(crestY + 0.025, crestY - 0.045, uv.y);

          // En mode monde plat courbé, la cascade se dissipe doucement dans le vide cosmique en bas
          float curvedMode = smoothstep(0.12, 0.35, curv);
          float abyssDissolve = mix(1.0, smoothstep(0.0, 0.24, uv.y), curvedMode);
          float curtainEnv = edgeMask * belowCrest * columnMod * abyssDissolve;

          // 1. Strates d'écoulement gravitaire (1 en LOW, 2 en MEDIUM, 3 en HIGH — optimisées 60 FPS)
          float waterBody = 0.0;
          float foamRibbons = 0.0;
          float fineStreaks = 0.0;
          float sparkleSpray = 0.0;

          if (uQualityLevel == 0) {
            // === PALIER LOW : 1 strate fluide rapide ===
            vec2 s1 = waterSheet(sampleX, fallTau, fallDist, t * 1.45, 9.5 * dScale, 2.1, colSpeed, 1.2);
            waterBody = 0.30 + 0.70 * s1.x;
            foamRibbons = smoothstep(0.42, 0.88, s1.y);
            fineStreaks = s1.y * 0.42;
          } else {
            // Strate arrière large et profonde (lames turquoise lentes et translucides)
            float backX = sampleX + uMouse.x * uDepth * 0.022;
            vec2 back = waterSheet(backX, fallTau, fallDist, t * 0.92, 6.2 * dScale, 1.55, colSpeed * 0.84, 2.4);

            // Strate médiane vive : rubans d'eau et d'écume bien galbés
            vec2 mid = waterSheet(sampleX, fallTau, fallDist, t * 1.58, 11.2 * dScale, 2.25, colSpeed, 13.7);
            waterBody = clamp(back.x * 0.52 + mid.x * 0.58, 0.0, 1.0);
            foamRibbons = clamp(back.y * 0.34 + pow(smoothstep(0.32, 0.92, mid.y), 1.15) * 0.78, 0.0, 1.12);
            fineStreaks = mid.y * 0.50;

            if (uQualityLevel >= 2) {
              // Strate frontale rapide : filets fins aérés + scintillements
              float frontX = sampleX - uMouse.x * uDepth * 0.036;
              vec2 front = waterSheet(frontX, fallTau, fallDist, t * 2.22, 19.5 * dScale, 2.95, colSpeed * 1.16, 31.1);
              float aeration = smoothstep(0.06, 0.68, fallDist);
              float needleFoam = pow(smoothstep(0.48, 0.95, front.y), 1.45) * (0.55 + 0.45 * aeration);
              foamRibbons = clamp(foamRibbons + needleFoam * 0.62, 0.0, 1.30);
              fineStreaks = clamp(fineStreaks + front.y * 0.45, 0.0, 1.15);

              // Scintillements solaires rapides dérivés de la strate frontale (0 snoise supplémentaire)
              float glint = front.x * mid.y * (0.5 + 0.5 * sin(frontX * 42.0 - t * 5.2));
              sparkleSpray = pow(clamp(glint, 0.0, 1.0), 5.0) * 1.05;
            }
          }

          // Lèvre d'écume bouillonnante à la crête (douce et irrégulière)
          float lipBand = exp(-pow((uv.y - (crestY - 0.014)) / 0.030, 2.0)) * edgeMask * columnMod;
          float lipBreak = 0.42 + 0.58 * (0.5 + 0.5 * sin(sampleX * 14.0 + t * 1.8) * cos(sampleX * 7.3 - t * 1.1));
          float lipFoam = lipBand * lipBreak * 0.85;

          // 2. Écume bouillonnante turbulente à l'impact en bas de la chute (plunge pool boil)
          float impactFootprint = smoothstep(halfW * 1.16, halfW * 0.30, abs(p.x));
          float baseFoam = 0.0;
          if (foamBaseAmt > 0.02 && uv.y < 0.28 && impactFootprint > 0.005) {
            float surgeH = 0.11 + 0.065 * columnProfile + 0.028 * sin(p.x * 6.4 + t * 1.6);
            float boilEnv = smoothstep(surgeH + 0.075, 0.015, uv.y) * impactFootprint;
            vec2 foamUv = vec2(p.x * 6.5 * dScale, uv.y * 9.5 - t * 1.35);
            float f1 = snoise(foamUv) * 0.5 + 0.5;
            float f2 = (uQualityLevel >= 1) ? (snoise(foamUv * 2.0 + vec2(t * 0.42 * sign(p.x + 0.001), -t * 1.7)) * 0.5 + 0.5) : f1;
            float froth = smoothstep(0.22, 0.82, f1 * 0.58 + f2 * 0.42);
            float baseCore = smoothstep(0.12, 0.0, uv.y) * 0.62;
            baseFoam = boilEnv * clamp(froth * 0.94 + baseCore, 0.0, 1.18) * foamBaseAmt * (1.0 - curvedMode * 0.72);
          }

          // 3. Embruns ascendants qui montent en volutes de brume depuis la zone d'impact
          float mistH = clamp(uMistHeight, 0.15, 0.55);
          float mistEnv = smoothstep(mistH + 0.24, 0.0, uv.y) * smoothstep(halfW * 1.55, halfW * 0.15, abs(p.x));
          float risingMist = 0.0;
          float mistSprayDots = 0.0;
          if (mistEnv > 0.005) {
            float windDrift = uMouse.x * uDepth * 0.42 + sin(uTime * 0.35) * 0.06;
            float riseExpand = 1.0 - uv.y * 0.40;
            // Soustraire t à uv.y fait MONTER les volutes d'embruns en brume vers le haut
            vec2 plumeUv = vec2(p.x * 2.1 * riseExpand - windDrift * (0.5 + uv.y * 1.8), uv.y * 3.1 - t * 0.52);
            float m1 = snoise(plumeUv) * 0.5 + 0.5;

            float billow = m1;
            if (uQualityLevel >= 1) {
              vec2 plumeUv2 = vec2(
                p.x * 4.2 * riseExpand - windDrift * (0.8 + uv.y * 2.4) + sin(uv.y * 5.0 - t * 0.7) * 0.16,
                uv.y * 5.2 - t * 0.85
              );
              float m2 = snoise(plumeUv2) * 0.5 + 0.5;
              billow = m1 * 0.56 + m2 * 0.44;
            }

            float mistStrength = mix(0.92, 0.58, curvedMode);
            float heightSoft = mix(1.0, 0.48, smoothstep(0.05, mistH + 0.18, uv.y));
            risingMist = mistEnv * smoothstep(0.20, 0.84, billow) * mistStrength * heightSoft;

            if (uQualityLevel >= 2) {
              // Fines micro-gouttelettes d'embruns dérivées analytiquement (0 snoise additionnel)
              float sp = billow * (0.5 + 0.5 * sin(p.x * 34.0 - t * 1.8) * cos(uv.y * 28.0 - t * 3.2));
              mistSprayDots = pow(clamp(sp, 0.0, 1.0), 4.5) * mistEnv * 0.62;
            }
          }

          vec3 colWater = uUseCustomColors ? uWaterColor : uPalettePrimary;
          vec3 colFoam = uUseCustomColors ? uFoamColor : uPaletteAccent;
          vec3 colMist = uUseCustomColors ? uMistColor : mix(colFoam, uPaletteSecondary, 0.32);

          // 4. Éclairage directionnel & diffusion translucide (subsurface glow dans les voiles fins)
          float sunSheen = exp(-pow((p.x - uMouse.x * uDepth * 0.45) * 1.65, 2.0)) * 0.30;
          // L'eau est plus lumineuse et translucide près de la crête et dans les voiles fins rétro-éclairés
          float thinVeil = 1.0 - smoothstep(0.22, 0.78, foamRibbons);
          float depthShade = mix(0.54, 1.08, waterBody) * mix(0.80, 1.14, smoothstep(0.0, 0.65, uv.y));
          vec3 subsurfaceTint = mix(colWater, colMist, 0.35) * thinVeil * (0.20 + 0.25 * transAmt);

          vec3 waterCol = colWater * (depthShade + sunSheen) + subsurfaceTint;
          // Filets verticaux brillants + lèvre + écume d'impact
          float totalWaterFoam = clamp(foamRibbons * 0.76 + fineStreaks * 0.24 + lipFoam * 0.75, 0.0, 0.96);
          waterCol = mix(waterCol, colFoam, totalWaterFoam);
          waterCol += vec3(0.96, 0.99, 1.0) * sparkleSpray;

          // Translucidité réaliste : les zones entre les filets d'écume laissent voir l'arrière-plan,
          // tandis que les filets blancs aérés et l'écume d'impact deviennent nettement plus opaques
          float baseVeilAlpha = mix(0.40, 0.14, transAmt);
          float bodyAlpha = mix(0.38, 0.26, transAmt) * waterBody;
          float waterAlpha = clamp(
            curtainEnv * (baseVeilAlpha + bodyAlpha + foamRibbons * 0.46 + lipFoam * 0.44),
            0.0,
            0.90
          );
          float foamAlpha = clamp(baseFoam * 0.92, 0.0, 0.92);
          float mistAlpha = clamp((risingMist * 0.72 + mistSprayDots * 0.45), 0.0, 0.76);

          // Composition front-to-back : eau -> écume bouillonnante au pied -> voile d'embruns ascendants
          vec3 foamCol = mix(colMist, colFoam, 0.78) * (0.94 + 0.16 * sunSheen);
          vec3 mistLit = colMist * (0.88 + 0.24 * sunSheen) + vec3(0.95, 0.99, 1.0) * mistSprayDots * 0.45;

          // Fusion eau + écume de base
          float wfAlpha = clamp(foamAlpha + waterAlpha * (1.0 - foamAlpha * 0.72), 0.0, 0.94);
          vec3 wfCol = mix(waterCol, foamCol, clamp(foamAlpha / max(0.001, wfAlpha), 0.0, 0.95));

          // Fusion avec les embruns qui montent devant le bas de la cascade
          float outAlpha = clamp(
            (mistAlpha + wfAlpha * (1.0 - mistAlpha * 0.58)) * clamp(uIntensity, 0.2, 2.0),
            0.0,
            0.94
          );
          if (outAlpha <= 0.004) {
            discard;
          }

          vec3 finalCol = mix(wfCol, mistLit, clamp((mistAlpha * 0.88) / max(0.001, outAlpha), 0.0, 0.86));
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
    if (newProps.translucency !== undefined)
      this.material.uniforms.uTranslucency.value = newProps.translucency
    if (newProps.baseFoamIntensity !== undefined)
      this.material.uniforms.uBaseFoamIntensity.value = newProps.baseFoamIntensity
    if (newProps.speedVariation !== undefined)
      this.material.uniforms.uSpeedVariation.value = newProps.speedVariation
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
