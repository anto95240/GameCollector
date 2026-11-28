/**
 * src/theme-engine/bricks/background/DunesBrick.ts
 *
 * Brique de fond Dunes Désertiques (Couche 1 : Background).
 * Simulation réaliste de dunes sculptées par le vent :
 * - Crêtes asymétriques (versant au vent doux, face sous le vent abrupte) et arête 3D descendante
 * - Rides de sable fines orientées par le vent et modulées par éclairage rasant
 * - Ombrage rasant directionnel selon uSunAngle avec rebond lumineux chaud et ciel en dégradé
 * - Scintillement micro-spéculaire de grains de sable (HIGH & MEDIUM)
 * - Voile atmosphérique progressif en profondeur et dans les creux
 * - Léger sable soulevé par le vent (spindrift) sur les crêtes
 * Adaptation aux paliers HIGH, MEDIUM et LOW (sans dégradation sur LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Dunes.
 */
export interface DunesProps {
  /** Teinte du sable au soleil (défaut #f59e0b ou uPalettePrimary). */
  sandColor?: string
  /** Teinte des versants à l'ombre (défaut #2d1810 ou uPaletteSecondary). */
  shadowColor?: string
  /** Teinte du ciel à l'horizon (défaut #78350f ou uPaletteSecondary). */
  skyColor?: string
  /** Fréquence et espacement des crêtes de dunes (défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent et scintillement thermique (défaut 0.15). */
  speed?: number
  /** Profondeur d'étagement et parallaxe avec la souris (défaut 0.3). */
  depth?: number
  /** Contraste d'éclairage rasant et éclat (défaut 1.0). */
  intensity?: number
  /** Méandres organiques et irrégularité des crêtes (défaut 0.4). */
  randomness?: number
  /** Angle d'incidence de la lumière solaire en radians (défaut 0.8). */
  sunAngle?: number
  /** Intensité du léger sable soulevé par le vent sur les crêtes (0.0 à 1.5, défaut 0.45). */
  windStrength?: number
  /** Échelle et finesse des rides de sable (0.4 à 2.5, défaut 1.0). */
  rippleScale?: number
  /** Éclat du scintillement des grains de sable au soleil (0.0 à 1.5, défaut 0.35). */
  sparkleIntensity?: number
  /** Densité du voile atmosphérique à la distance et dans les vallées (0.0 à 1.5, défaut 0.55). */
  hazeIntensity?: number
}

export class DunesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'dunes'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: DunesProps
  private sandColorVec: THREE.Color
  private shadowColorVec: THREE.Color
  private skyColorVec: THREE.Color

  constructor(id: string, props: DunesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.sandColorVec = new THREE.Color(props.sandColor ?? '#f59e0b')
    this.shadowColorVec = new THREE.Color(props.shadowColor ?? '#2d1810')
    this.skyColorVec = new THREE.Color(props.skyColor ?? '#78350f')

    const speed = props.speed ?? 0.15
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const sunAngle = props.sunAngle ?? 0.8
    const windStrength = props.windStrength ?? 0.45
    const rippleScale = props.rippleScale ?? 1.0
    const sparkleIntensity = props.sparkleIntensity ?? 0.35
    const hazeIntensity = props.hazeIntensity ?? 0.55

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
        uSandColor: { value: this.sandColorVec },
        uShadowColor: { value: this.shadowColorVec },
        uSkyColor: { value: this.skyColorVec },
        uUseCustomColors: {
          value: Boolean(props.sandColor || props.shadowColor || props.skyColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSunAngle: { value: sunAngle },
        uWindStrength: { value: windStrength },
        uRippleScale: { value: rippleScale },
        uSparkleIntensity: { value: sparkleIntensity },
        uHazeIntensity: { value: hazeIntensity },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9992, 1.0);
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
        uniform vec3 uSandColor;
        uniform vec3 uShadowColor;
        uniform vec3 uSkyColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSunAngle;
        uniform float uWindStrength;
        uniform float uRippleScale;
        uniform float uSparkleIntensity;
        uniform float uHazeIntensity;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Profil asymétrique de dune : face sous le vent (slip-face) abrupte à gauche du pic,
        // face au vent (stoss) douce et étirée à droite du pic, avec crête nette.
        vec2 asymDuneProfile(float phase) {
          float t = fract(phase);
          float split = 0.28;
          float k = 0.032;
          float hRise = t / split;
          float hFall = (1.0 - t) / (1.0 - split);
          float diff = hRise - hFall;
          float tent = 0.5 * (hRise + hFall - sqrt(diff * diff + k * k));
          // Creux arrondis en U, crête conservée vive
          float height = pow(max(0.0, tent), 1.32);
          // Pente analytique lissée autour du pic (positive = face gauche abrupte, négative = face droite douce)
          float slopeSign = (t < split) ? (1.0 / split) : (-1.0 / (1.0 - split));
          float ridgeSharp = smoothstep(-0.04, 0.04, t - split);
          float slope = mix(1.0 / split, -1.0 / (1.0 - split), ridgeSharp) * (0.35 + 0.65 * pow(max(0.001, tent), 0.32));
          return vec2(height, slope);
        }

        // Calcule la silhouette, l'ombrage 3D et le voile de vent d'une couche de dune.
        // Retourne : x = facteur d'éclairement, y = masque (1 = dans la dune, 0 = ciel),
        // z = proximité de la crête (pour voile de sable et rim light), w = intensité de scintillement.
        vec4 evaluateDuneLayer(
          vec2 uv,
          float aspect,
          float baseHeight,
          float freq,
          float amp,
          float seed,
          float parallaxFactor,
          float layerScale,
          float time,
          vec3 lightDir,
          vec3 viewDir
        ) {
          float px = (uv.x - 0.5) * aspect + 0.5 + uMouse.x * parallaxFactor;
          float py = uv.y + uMouse.y * (parallaxFactor * 0.14) - uScroll * (parallaxFactor * 0.08);

          // Courbure organique de la crête le long de l'horizon
          float macroNoise = snoise(vec2(px * freq * 0.36 + seed, seed * 2.1));
          float phaseBase = px * freq * 0.24 + seed * 0.73 + macroNoise * (0.26 * uRandomness);

          vec2 ridgeSample = asymDuneProfile(phaseBase);
          float secondaryWave = sin(px * freq * 0.95 + seed * 3.7) * 0.018 * uRandomness;
          float ridgeY = baseHeight + (ridgeSample.x - 0.45) * amp + macroNoise * (0.042 * uRandomness) + secondaryWave;

          // Distance verticale sous la ligne de crête
          float depthDown = ridgeY - py;

          if (depthDown < 0.0) {
            return vec4(0.0, 0.0, -depthDown, 0.0);
          }

          // Arête 3D qui descend depuis chaque pic de silhouette vers l'avant-plan
          float spineWarp = 0.0;
          if (uQualityLevel >= 1) {
            spineWarp = snoise(vec2(px * 0.85 + seed, py * 1.9 - seed)) * (0.14 * uRandomness);
          }
          float facePhase = phaseBase - depthDown * (1.35 + 0.35 * sin(px * 1.1 + seed)) + spineWarp;
          vec2 faceSample = asymDuneProfile(facePhase);

          // Pente horizontale locale (-dH/dx) : > 0 = versant doux face droite, < 0 = slip-face abrupte face gauche
          float rawSlope = -faceSample.y;
          float isWindward = smoothstep(-0.25, 0.25, rawSlope);

          // Normale 3D de la dune (versant au vent incliné doucement, slip-face raide)
          vec3 Nwind = normalize(vec3(0.42, 0.86, 0.28));
          vec3 Nslip = normalize(vec3(-0.78, 0.50, 0.37));
          vec3 N = normalize(mix(Nslip, Nwind, isWindward));

          // Légère ondulation de pente à grande échelle (MEDIUM & HIGH)
          if (uQualityLevel >= 1) {
            float slopeUndul = snoise(vec2(px * 2.2 * layerScale + seed, py * 3.5 + seed));
            N = normalize(N + vec3(slopeUndul * 0.14 * uRandomness, 0.0, slopeUndul * 0.08));
          }

          // Micro-rides de sable (sand ripples) orientées sur le versant au vent (HIGH & MEDIUM)
          if (uQualityLevel >= 1) {
            float rippleFade = isWindward * smoothstep(0.004, 0.055, depthDown) * smoothstep(0.45, 0.08, depthDown);
            if (rippleFade > 0.01) {
              float rScale = uRippleScale * layerScale;
              vec2 rCoord = vec2(px * 26.0 * rScale + depthDown * 14.0 * rScale, py * 18.0 * rScale);
              float warp = snoise(vec2(px * 3.2 * rScale + seed, py * 4.5 * rScale - time * 0.04)) * (1.2 + uRandomness * 1.6);
              float rPhase = rCoord.x * 1.45 + rCoord.y * 0.45 + warp - time * 0.18;
              // Profil asymétrique des rides (crêtes fines, creux larges)
              float rWave = sin(rPhase);
              float rSharp = cos(rPhase) * (0.65 + 0.35 * rWave);
              float rippleAmp = (uQualityLevel >= 2 ? 0.19 : 0.11) * rippleFade * (0.55 + 0.45 * uIntensity);
              N = normalize(N + vec3(rSharp * rippleAmp, rSharp * rippleAmp * 0.35, 0.0));
            }
          }

          // Éclairage rasant directionnel (Lambert + rebond doux + liseré de crête)
          float NdotL = dot(N, lightDir);
          float diffuse = clamp(NdotL, 0.0, 1.0);
          // L'intensité accentue la netteté ombre/lumière rasante
          diffuse = pow(diffuse, mix(0.85, 1.35, clamp((uIntensity - 0.3) * 0.6, 0.0, 1.0)));

          // Liseré lumineux rasant sur le fil tranchant de l'arête 3D et la silhouette
          float spineEdge = exp(-abs(faceSample.y + 0.15) * 2.4);
          float topRim = exp(-depthDown * 55.0);
          float sunSide = smoothstep(-0.3, 0.7, lightDir.x * 0.6 + lightDir.y * 0.6);
          float rimGlow = max(spineEdge * 0.32, topRim * 0.55) * sunSide * (0.45 + 0.55 * uIntensity);

          // Scintillement des grains de sable au soleil (HIGH uniquement pour budget mobile)
          float sparkle = 0.0;
          if (uQualityLevel >= 2 && uSparkleIntensity > 0.01 && diffuse > 0.25) {
            vec2 grainUv = floor(vec2(px, py) * uResolution.y * 0.42 * layerScale);
            vec2 gh = hash22(grainUv + seed * 19.3);
            if (gh.x > 0.86) {
              vec3 grainN = normalize(N + vec3((gh - 0.5) * 1.45, (gh.y - 0.5) * 0.8));
              vec3 halfV = normalize(lightDir + viewDir);
              float spec = pow(max(0.0, dot(grainN, halfV)), 26.0);
              float shimmer = 0.55 + 0.45 * sin(time * 3.5 + gh.y * 62.83 + uMouse.x * 8.0);
              float distFade = smoothstep(0.008, 0.06, depthDown) * smoothstep(2.2, 0.9, layerScale);
              sparkle = spec * shimmer * diffuse * distFade * uSparkleIntensity * 1.4;
            }
          }

          // Légère variation d'ombre dans les creux (ambient occlusion de vallée)
          float valleyAO = smoothstep(0.0, 0.18, depthDown);
          float lightVal = clamp(diffuse * (0.85 + 0.15 * valleyAO) + rimGlow * 0.45, 0.0, 1.15);

          return vec4(lightVal, 1.0, depthDown, sparkle);
        }

        // Voile de sable soulevé par le vent juste au-dessus et au ras des crêtes
        float evaluateWindSand(vec2 uv, float aspect, float aboveDist, float freq, float seed, float time) {
          if (uQualityLevel < 1 || uWindStrength <= 0.01) return 0.0;
          // Bande concentrée juste au-dessus de la crête et débordant légèrement sur la face
          float band = exp(-max(0.0, aboveDist) * 28.0) * smoothstep(-0.02, 0.012, aboveDist);
          if (band < 0.01) return 0.0;
          float windX = (uv.x * aspect) - time * (0.45 + uMouse.x * 0.18);
          float n1 = snoise(vec2(windX * 2.8 * freq + seed, uv.y * 11.0 - time * 0.18));
          float n2 = (uQualityLevel >= 2) ? snoise(vec2(windX * 6.5 * freq - time * 0.35, uv.y * 22.0 + seed)) * 0.5 : 0.0;
          float wisp = smoothstep(0.05, 0.72, (n1 + n2) * 0.5 + 0.35);
          return band * wisp * uWindStrength * 0.42;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float t = uTime * max(0.02, uSpeed);

          // Couleurs de base
          vec3 sunSand = uUseCustomColors ? uSandColor : uPalettePrimary;
          vec3 shadowSand = uUseCustomColors ? uShadowColor : (uPaletteSecondary * 0.45);
          vec3 skyBase = uUseCustomColors ? uSkyColor : uPaletteSecondary;

          // Direction lumineuse 3D pilotée par uSunAngle
          float sunCos = cos(uSunAngle);
          float sunSin = sin(uSunAngle);
          vec3 lightDir = normalize(vec3(sunCos, sunSin * 0.55 + 0.16, 0.42));
          vec3 viewDir = normalize(vec3((uv.x - 0.5) * 0.35 - uMouse.x * 0.25, (uv.y - 0.4) * 0.25, 1.0));

          // 1. Ciel en dégradé atmosphérique + lueur directionnelle du soleil
          vec3 zenithCol = mix(skyBase * 0.42, shadowSand * 0.75, 0.32);
          vec3 horizonHazeCol = mix(skyBase, mix(skyBase, sunSand, 0.48), 0.52);
          float skyGrad = pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.55);
          vec3 finalColor = mix(zenithCol, horizonHazeCol, skyGrad);

          // Halo solaire aligné avec uSunAngle
          vec2 sunPos = vec2(0.5 + sunCos * 0.36, 0.58 + sunSin * 0.24);
          float sunDist = length((uv - sunPos) * vec2(aspect, 1.0));
          float sunHalo = exp(-sunDist * 2.4) * (0.28 + 0.22 * clamp(uIntensity, 0.3, 2.0));
          vec3 sunTint = mix(sunSand, vec3(1.0, 0.94, 0.78), 0.45);
          finalColor += sunTint * sunHalo;

          if (uQualityLevel >= 2) {
            float skyDust = snoise(vec2(uv.x * 2.2 - t * 0.08, uv.y * 4.5)) * 0.035 * uHazeIntensity;
            finalColor += horizonHazeCol * max(0.0, skyDust);
          }

          // Rebond ambiant dans les ombres (ciel + sable chaud)
          vec3 ambientShadow = mix(shadowSand, zenithCol * 0.65, 0.18) + sunSand * 0.06;
          vec3 highlightSand = mix(sunSand, sunTint, 0.22 * clamp(uIntensity, 0.4, 2.0));

          float hazeScale = clamp(uHazeIntensity, 0.0, 1.5);

          // 2. Dune 3 (lointaine, arête haute) - MEDIUM & HIGH
          if (uQualityLevel >= 1) {
            vec4 d3 = evaluateDuneLayer(
              uv, aspect, 0.64, 1.8 * uDensity, 0.14, 1.7,
              uDepth * 0.12, 1.8, t * 0.35, lightDir, viewDir
            );
            if (d3.y > 0.5) {
              vec3 colD3 = mix(ambientShadow * 0.92, highlightSand * 0.85, clamp(d3.x, 0.0, 1.0));
              // Voile atmosphérique lointain + atténuation vers les creux
              float valleyMist3 = exp(-max(0.0, d3.z) * 5.0) * 0.12;
              float distFog3 = clamp((0.42 + valleyMist3) * hazeScale, 0.0, 0.82);
              colD3 = mix(colD3, horizonHazeCol, distFog3);
              finalColor = colD3;
            } else {
              float wind3 = evaluateWindSand(uv, aspect, d3.z, 1.8 * uDensity, 3.1, t * 0.6);
              finalColor = mix(finalColor, mix(horizonHazeCol, sunTint, 0.55), wind3 * 0.55);
            }
          }

          // 3. Dune 2 (plan médian) - LOW, MEDIUM & HIGH
          if (uQualityLevel >= 1) {
            vec4 d2 = evaluateDuneLayer(
              uv, aspect, 0.45, 2.35 * uDensity, 0.16, 4.9,
              uDepth * 0.24, 1.35, t * 0.55, lightDir, viewDir
            );
            if (d2.y > 0.5) {
              vec3 colD2 = mix(ambientShadow, highlightSand * 0.95, clamp(d2.x, 0.0, 1.0));
              colD2 += sunTint * d2.w;
              float valleyMist2 = (1.0 - smoothstep(0.0, 0.24, d2.z)) * 0.08;
              float distFog2 = clamp((0.18 + valleyMist2) * hazeScale, 0.0, 0.6);
              colD2 = mix(colD2, horizonHazeCol, distFog2);
              finalColor = colD2;
            } else {
              float wind2 = evaluateWindSand(uv, aspect, d2.z, 2.35 * uDensity, 7.4, t * 0.8);
              finalColor = mix(finalColor, mix(horizonHazeCol, sunTint, 0.65), wind2 * 0.72);
            }
          }

          // 4. Dune 1 (premier plan) - LOW, MEDIUM & HIGH
          vec4 d1 = evaluateDuneLayer(
            uv, aspect, uQualityLevel == 0 ? 0.38 : 0.24, 3.0 * uDensity,
            uQualityLevel == 0 ? 0.18 : 0.17, 8.3,
            uDepth * 0.38, 1.0, t * 0.8, lightDir, viewDir
          );
          if (d1.y > 0.5) {
            vec3 colD1 = mix(ambientShadow * 0.92, highlightSand, clamp(d1.x, 0.0, 1.0));
            colD1 += sunTint * d1.w;
            // Légère brume au ras du creux inférieur
            float nearMist = smoothstep(0.18, 0.0, uv.y) * 0.08 * hazeScale;
            colD1 = mix(colD1, horizonHazeCol, nearMist);
            finalColor = colD1;
          } else {
            float wind1 = evaluateWindSand(uv, aspect, d1.z, 3.0 * uDensity, 11.2, t);
            finalColor = mix(finalColor, mix(horizonHazeCol, sunTint, 0.72), wind1 * 0.85);
          }

          // Léger voile de sable rasant au premier plan (HIGH)
          if (uQualityLevel >= 2 && uWindStrength > 0.01) {
            float fgWind = snoise(vec2((uv.x * aspect) * 1.9 - t * 0.95, uv.y * 6.5 - t * 0.12));
            float fgMask = smoothstep(0.32, 0.0, uv.y) * smoothstep(0.2, 0.85, fgWind);
            finalColor = mix(finalColor, mix(horizonHazeCol, sunTint, 0.6), fgMask * 0.14 * uWindStrength);
          }

          // Modulation finale de contraste/luminosité sans écraser le ciel
          float contrastScale = mix(0.75, 1.18, clamp((uIntensity - 0.3) / 1.7, 0.0, 1.0));
          finalColor = mix(finalColor, finalColor * contrastScale, 0.65);

          gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -95
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<DunesProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.sandColor !== undefined) {
      this.sandColorVec.set(newProps.sandColor)
      this.material.uniforms.uSandColor.value = this.sandColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.shadowColor !== undefined) {
      this.shadowColorVec.set(newProps.shadowColor)
      this.material.uniforms.uShadowColor.value = this.shadowColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.skyColor !== undefined) {
      this.skyColorVec.set(newProps.skyColor)
      this.material.uniforms.uSkyColor.value = this.skyColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.sunAngle !== undefined) this.material.uniforms.uSunAngle.value = newProps.sunAngle
    if (newProps.windStrength !== undefined)
      this.material.uniforms.uWindStrength.value = newProps.windStrength
    if (newProps.rippleScale !== undefined)
      this.material.uniforms.uRippleScale.value = newProps.rippleScale
    if (newProps.sparkleIntensity !== undefined)
      this.material.uniforms.uSparkleIntensity.value = newProps.sparkleIntensity
    if (newProps.hazeIntensity !== undefined)
      this.material.uniforms.uHazeIntensity.value = newProps.hazeIntensity
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

export const DunesDefinition: IBrickDefinition<DunesProps> = {
  type: 'dunes',
  category: 'background',
  create: (id, props, context) => new DunesInstance(id, props, context),
}

BrickRegistry.register(DunesDefinition)
