/**
 * src/theme-engine/bricks/parallax/ParallaxMountainsBrick.ts
 *
 * Brique de silhouettes de Montagnes en Parallaxe (Couche 2 : Intermediate).
 * Massif alpin réaliste étagé sur jusqu'à 4 plans en profondeur :
 * - Crêtes générées par bruit multifractal à crêtes (Ridged Multifractal) avec asymétrie géologique
 * - Relief 2D d'arêtes descendantes et couloirs : face éclairée vs face dans l'ombre selon uSunAngle
 * - Sommets enneigés et névés accumulés sur les pentes douces et couloirs (neige au soleil vs neige bleutée à l'ombre)
 * - Nappes de brume d'altitude dérivant entre chaque plan de montagne
 * - Perspective atmosphérique avec désaturation progressive des couleurs avec la distance
 * - Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW)
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Montagnes.
 */
export interface ParallaxMountainsProps {
  /** Teinte de la roche à l'ombre (défaut #0b1329 ou uPaletteSecondary * 0.35). */
  rockColor?: string
  /** Teinte des crêtes illuminées au soleil rasant (défaut #475569 ou uPalettePrimary * 0.55). */
  sunColor?: string
  /** Teinte de la brume d'altitude et de vallée (défaut #1e293b ou uPaletteSecondary * 0.6). */
  mistColor?: string
  /** Densité et fréquence des sommets / pics (défaut 1.0). */
  density?: number
  /** Vitesse de dérive lente des brumes d'altitude (défaut 0.15). */
  speed?: number
  /** Écartement en profondeur et parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Contraste d'éclairage rasant et opacité globale (défaut 1.0). */
  intensity?: number
  /** Variabilité géologique et asymétrie des pics (défaut 0.45). */
  randomness?: number
  /** Seuil d'apparition des sommets enneigés et névés (0.0 = aucun, 1.0 = forte neige, défaut 0.6). */
  snowLevel?: number
  /** Angle d'incidence de la lumière solaire en radians (défaut 0.75). */
  sunAngle?: number
  /** Intensité de la brume d'altitude entre les plans et de la désaturation lointaine (0.0 à 1.3, défaut 0.65). */
  hazeStrength?: number
  /** Teinte de la neige au soleil (défaut #eef4ff). */
  snowColor?: string
}

export class ParallaxMountainsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_mountains'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxMountainsProps
  private rockColorVec: THREE.Color
  private sunColorVec: THREE.Color
  private mistColorVec: THREE.Color
  private snowColorVec: THREE.Color

  constructor(id: string, props: ParallaxMountainsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.rockColorVec = new THREE.Color(props.rockColor ?? '#0b1329')
    this.sunColorVec = new THREE.Color(props.sunColor ?? '#475569')
    this.mistColorVec = new THREE.Color(props.mistColor ?? '#1e293b')
    this.snowColorVec = new THREE.Color(props.snowColor ?? '#eef4ff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.15
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.45
    const snowLevel = props.snowLevel ?? 0.6
    const sunAngle = props.sunAngle ?? 0.75
    const hazeStrength = props.hazeStrength ?? 0.65

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
        uRockColor: { value: this.rockColorVec },
        uSunColor: { value: this.sunColorVec },
        uMistColor: { value: this.mistColorVec },
        uSnowColor: { value: this.snowColorVec },
        uUseCustomColors: {
          value: Boolean(props.rockColor || props.sunColor || props.mistColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSnowLevel: { value: snowLevel },
        uSunAngle: { value: sunAngle },
        uHazeStrength: { value: hazeStrength },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.993, 1.0);
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
        uniform vec3 uRockColor;
        uniform vec3 uSunColor;
        uniform vec3 uMistColor;
        uniform vec3 uSnowColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSnowLevel;
        uniform float uSunAngle;
        uniform float uHazeStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Désaturation perceptive (perspective atmosphérique sur les plans lointains)
        vec3 desaturate(vec3 col, float amount) {
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          return mix(col, vec3(lum), clamp(amount, 0.0, 1.0));
        }

        // Multifractal à crêtes (Ridged Multifractal) à versants alpins larges et asymétrie géologique
        float ridgedMountain(float x, float freq, float seed, int octaves) {
          // Distorsion géologique douce pour casser la symétrie des pics
          float warp = snoise(vec2(x * freq * 0.42 + seed, seed * 0.73)) * (0.12 + 0.22 * uRandomness);
          float wx = x + warp / max(0.35, freq);

          float value = 0.0;
          float amplitude = 0.56;
          float f = freq;
          float weight = 1.0;

          for (int i = 0; i < 5; i++) {
            if (i >= octaves) break;
            float n = snoise(vec2(wx * f + seed + float(i) * 9.7, float(i) * 3.1 + seed * 0.3));
            // Profil alpin pyramidal naturel (crêtes nettes mais versants amples, sans pics en aiguilles)
            float ridge = 1.0 - sqrt(n * n + 0.014);
            ridge = mix(ridge, ridge * ridge, 0.46);
            ridge *= weight;
            value += ridge * amplitude;
            weight = clamp(ridge * 1.65, 0.22, 1.0);
            f *= 2.04;
            amplitude *= 0.46;
          }
          return value;
        }

        // Champ 2D d'arêtes descendantes (éperons & couloirs) pour séparer nettement
        // les faces éclairées et les faces à l'ombre sur le flanc des montagnes
        float spurField(vec2 p, float freq, float seed) {
          // Étirement diagonal suivant la pente des arêtes alpines
          vec2 q = vec2(p.x * freq * 2.2 + seed, p.y * freq * 1.45 - p.x * freq * 0.55);
          float n1 = snoise(q);
          float r1 = 1.0 - sqrt(n1 * n1 + 0.015);
          float n2 = snoise(q * 2.15 + vec2(4.7, -3.1));
          float r2 = 1.0 - sqrt(n2 * n2 + 0.02);
          return r1 * 0.68 + r2 * 0.32;
        }

        // Évalue un plan de chaîne montagneuse (crête multifractale + versant éclairé/ombre + neige + brume)
        vec4 evaluateMountainPlane(
          vec2 uv,
          float aspect,
          float baseAltitude,
          float ridgeHeight,
          float freq,
          float seed,
          float parallaxRatio,
          float distanceFactor,   // 0 = avant-plan, 1 = horizon très lointain
          vec3 rockCol,
          vec3 litCol,
          vec3 mistCol,
          vec3 snowColBase,
          float time,
          vec2 mouse,
          float aa
        ) {
          float shiftX = mouse.x * uDepth * parallaxRatio * 1.45;
          float shiftY = mouse.y * uDepth * parallaxRatio * 0.32 + uScroll * parallaxRatio * 0.16;
          float px = (uv.x - 0.5) * aspect + shiftX;
          float py = uv.y + shiftY;

          int octs = (uQualityLevel >= 2) ? 5 : (uQualityLevel == 1 ? 4 : 3);
          float effFreq = freq * clamp(uDensity, 0.4, 2.2);
          float ridgeShape = ridgedMountain(px, effFreq, seed, octs);
          float ridgeY = baseAltitude + ridgeShape * ridgeHeight;

          // Anti-aliasing propre le long de la ligne de crête
          float mask = 1.0 - smoothstep(ridgeY - aa, ridgeY + aa, py);
          if (mask <= 0.004) {
            return vec4(0.0);
          }

          float depthBelow = max(0.0, ridgeY - py);
          float depthRatio = clamp(depthBelow / max(0.01, ridgeHeight), 0.0, 1.0);

          // Dérivée de la ligne de crête pour l'orientation globale du versant
          float eps = 0.0055 / max(0.6, effFreq);
          float rL = ridgedMountain(px - eps, effFreq, seed, min(octs, 4)) * ridgeHeight;
          float rR = ridgedMountain(px + eps, effFreq, seed, min(octs, 4)) * ridgeHeight;
          float crestSlope = (rR - rL) / (2.0 * eps);

          // Direction horizontale et élévation du soleil depuis uSunAngle
          // sunDirX > 0 : lumière venant de la droite ; < 0 : venant de la gauche
          float sunDirX = cos(uSunAngle);
          float sunElev = sin(uSunAngle);

          // Relief 2D d'arêtes descendantes (MEDIUM & HIGH) : donne de vraies facettes pyramidales
          float spurSlope = 0.0;
          float gullyMask = 0.0;
          float rockGrain = 0.0;

          if (uQualityLevel >= 1) {
            // Les éperons divergent légèrement vers le bas depuis les pics
            vec2 faceP = vec2(px, py - ridgeY * 0.35);
            float e2 = 0.008;
            float sC = spurField(faceP, effFreq, seed + 13.4);
            float sR = spurField(faceP + vec2(e2, 0.0), effFreq, seed + 13.4);
            spurSlope = (sR - sC) / e2;
            // Couloirs/creux où la neige s'accumule plus bas
            gullyMask = smoothstep(0.62, 0.22, sC);

            if (uQualityLevel >= 2) {
              // Strates rocheuses fines et éboulis visibles sur les plans proches/médians
              float detailFade = 1.0 - distanceFactor * 0.72;
              rockGrain = snoise(vec2(px * effFreq * 14.0 + py * 6.0, py * 32.0 + seed)) * 0.14 * detailFade;
            }
          }

          // Combinaison pente principale de crête + facette d'arête descendante
          float combinedSlope = crestSlope * (0.82 + 0.18 * (1.0 - depthRatio)) + spurSlope * (0.22 + 0.48 * depthRatio) * 0.20;
          // Normale 2.5D du versant face à la lumière directionnelle
          vec3 normal = normalize(vec3(-combinedSlope * 1.35, 0.78, 0.55));
          vec3 lightDir = normalize(vec3(sunDirX, max(0.18, sunElev), 0.36));
          float ndl = dot(normal, lightDir);

          // Transition franche entre face éclairée et face dans l'ombre (arête alpine marquée)
          float litFactor = smoothstep(-0.10, 0.48, ndl);
          // Rebond lumineux céleste froid dans les ombres vs roche chaude/claire sur la face exposée
          vec3 coolShadow = mix(rockCol * 0.72, mix(rockCol, mistCol, 0.28), 0.42);
          vec3 sunlitRock = mix(rockCol * 1.1, litCol * 1.38, 0.88) * (1.0 + rockGrain);
          vec3 surfaceCol = mix(coolShadow * (1.0 + rockGrain * 0.55), sunlitRock, litFactor);

          // Liseré subtil de lumière rasante sur la crête exposée
          float crestRim = exp(-depthBelow * 42.0) * smoothstep(0.15, 0.75, litFactor) * (1.0 - distanceFactor * 0.48);
          surfaceCol += litCol * crestRim * 0.45;

          // Sommets enneigés et névés dans les couloirs (tous paliers, plus détaillés en MEDIUM/HIGH)
          if (uSnowLevel > 0.04) {
            float snowLine = baseAltitude + ridgeHeight * (0.94 - uSnowLevel * 0.56);
            // La neige descend un peu plus bas dans les couloirs et sur les faces à l'ombre
            float localSnowLine = snowLine - gullyMask * 0.055 * uSnowLevel - (1.0 - litFactor) * 0.015 * uSnowLevel;
            if (uQualityLevel >= 1) {
              localSnowLine += snoise(vec2(px * effFreq * 4.5 + seed, py * 8.0)) * 0.032;
            }
            float altSnow = smoothstep(localSnowLine - 0.018, localSnowLine + 0.055, py);
            // La neige adhère sur les crêtes et couloirs tout en laissant apparaître les parois très abruptes
            float slopeHold = 1.0 - smoothstep(1.8, 3.8, abs(combinedSlope));
            float snowMask = clamp(altSnow * max(slopeHold, gullyMask * 0.72), 0.0, 1.0);

            if (snowMask > 0.01) {
              // Neige lumineuse au soleil vs neige bleutée-grise dans l'ombre
              vec3 snowLit = mix(litCol * 1.3, snowColBase, 0.84);
              vec3 snowShadow = mix(mistCol * 0.88, snowColBase * vec3(0.56, 0.68, 0.86), 0.55);
              vec3 snowCol = mix(snowShadow, snowLit, smoothstep(0.16, 0.62, litFactor));
              surfaceCol = mix(surfaceCol, snowCol, snowMask * 0.92);
            }
          }

          // Légère profondeur verticale vers le fond de la vallée
          surfaceCol *= mix(1.0, 0.78, depthRatio * depthRatio * (1.0 - distanceFactor * 0.6));

          // Perspective atmosphérique : désaturation des couleurs + fusion vers la brume selon la distance
          float desatAmt = distanceFactor * (0.48 + 0.30 * uHazeStrength);
          surfaceCol = desaturate(surfaceCol, desatAmt);
          float aerialFade = clamp(distanceFactor * (0.58 * uHazeStrength + 0.14), 0.0, 0.82);
          surfaceCol = mix(surfaceCol, mistCol, aerialFade);

          // Brume de vallée douce au pied de chaque massif
          float baseMistBand = smoothstep(0.32, 1.0, depthRatio);
          float baseMistAmt = baseMistBand * (0.28 + 0.25 * distanceFactor) * clamp(uHazeStrength, 0.0, 1.3);
          surfaceCol = mix(surfaceCol, mistCol, clamp(baseMistAmt, 0.0, 0.72));

          return vec4(surfaceCol, mask);
        }

        // Nappe de brume d'altitude dérivant entre deux plans de montagne
        float evalAltitudeMist(vec2 uv, float aspect, float centerY, float bandH, float speedMult, float seed, float time) {
          float yEnv = exp(-pow((uv.y - centerY) / max(0.02, bandH), 2.0));
          if (yEnv < 0.02) return 0.0;
          float drift = time * max(0.03, uSpeed) * speedMult;
          vec2 p = vec2(uv.x * aspect * 1.9 - drift + seed, uv.y * 5.2 + seed * 0.3);
          float n = snoise(p) * 0.5 + 0.5;
          if (uQualityLevel >= 2) {
            float n2 = snoise(p * 2.15 + vec2(n * 0.75 - drift * 0.6, 2.4)) * 0.5 + 0.5;
            n = n * 0.62 + n2 * 0.38;
          }
          return yEnv * (0.35 + 0.65 * n);
        }

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float aa = 1.4 / max(1.0, uResolution.y);
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseRock = uUseCustomColors ? uRockColor : (uPaletteSecondary * 0.34);
          vec3 baseLit = uUseCustomColors ? uSunColor : (uPalettePrimary * 0.62);
          vec3 baseMist = uUseCustomColors ? uMistColor : (uPaletteSecondary * 0.62);
          // Brume atmosphérique d'altitude désaturée et légèrement lumineuse pour bien séparer les 4 plans
          vec3 aerialMist = mix(baseMist * 1.45, desaturate(baseLit * 1.15 + vec3(0.18, 0.24, 0.32), 0.35), 0.45);
          vec3 snowCol = uSnowColor;
          float haze = clamp(uHazeStrength, 0.0, 1.3);

          vec4 result = vec4(0.0);

          // =========================================================================
          // Plan 4 : Chaîne Alpine Très Lointaine (HIGH uniquement) — large, désaturée & brumeuse
          // =========================================================================
          if (uQualityLevel >= 2) {
            vec4 r4 = evaluateMountainPlane(
              uv, aspect, 0.36, 0.34, 0.58, 7.2, 0.06, 0.88,
              baseRock, baseLit, aerialMist, snowCol, t, uMouse, aa * 1.6
            );
            if (r4.a > 0.004) {
              result = r4;
            }
          }

          // =========================================================================
          // Plan 3 : Chaîne Lointaine (MEDIUM & HIGH)
          // =========================================================================
          if (uQualityLevel >= 1) {
            vec4 r3 = evaluateMountainPlane(
              uv, aspect, 0.24, 0.34, 0.82, 21.8, 0.14, 0.58,
              baseRock, baseLit, aerialMist, snowCol, t, uMouse, aa * 1.25
            );
            if (r3.a > 0.004) {
              result.rgb = mix(result.rgb, r3.rgb, r3.a);
              result.a = max(result.a, r3.a);
            }

            // Brume d'altitude nichée entre Plan 3 et Plan 2
            if (haze > 0.02 && result.a > 0.02) {
              float mFar = evalAltitudeMist(uv, aspect, 0.31, 0.11, 0.14, 3.4, t) * haze * 0.55;
              result.rgb = mix(result.rgb, aerialMist * 1.12, clamp(mFar, 0.0, 0.72));
            }
          }

          // =========================================================================
          // Plan 2 : Massif Médian (Tous paliers) — arêtes nettes, versants contrastés, névés
          // =========================================================================
          {
            vec4 r2 = evaluateMountainPlane(
              uv, aspect, 0.12, 0.34, 1.08, 48.3, 0.28, 0.28,
              baseRock, baseLit, aerialMist, snowCol, t, uMouse, aa
            );
            if (r2.a > 0.004) {
              result.rgb = mix(result.rgb, r2.rgb, r2.a);
              result.a = max(result.a, r2.a);
            }

            // Brume d'altitude dérivant entre le massif médian et les contreforts d'avant-plan
            if (uQualityLevel >= 1 && haze > 0.02 && result.a > 0.02) {
              float mMid = evalAltitudeMist(uv, aspect, 0.19, 0.095, 0.22, 11.7, t) * haze * 0.48;
              vec3 midMistCol = mix(aerialMist, baseLit * 0.95, 0.18);
              result.rgb = mix(result.rgb, midMistCol, clamp(mMid, 0.0, 0.66));
            }
          }

          // =========================================================================
          // Plan 1 : Contreforts d'Avant-Plan (Tous paliers) — sombres, saturés, parallaxe forte
          // =========================================================================
          {
            vec4 r1 = evaluateMountainPlane(
              uv, aspect, -0.04, 0.31, 1.42, 89.6, 0.50, 0.0,
              baseRock * 0.82, baseLit * 0.92, baseMist * 0.95, snowCol, t, uMouse, aa
            );
            if (r1.a > 0.004) {
              result.rgb = mix(result.rgb, r1.rgb, r1.a);
              result.a = max(result.a, r1.a);
            }
          }

          // Nappe de brume basse rasante en vallée (HIGH uniquement)
          if (uQualityLevel >= 2 && haze > 0.02) {
            float lowMist = evalAltitudeMist(uv, aspect, 0.05, 0.095, 0.30, 27.1, t) * haze * 0.42;
            if (lowMist > 0.005) {
              result.rgb = mix(result.rgb, aerialMist * 0.92, clamp(lowMist, 0.0, 0.58));
              result.a = max(result.a, lowMist * 0.68);
            }
          }

          if (result.a <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(result.rgb, clamp(result.a * uIntensity, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -40
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxMountainsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.rockColor !== undefined) {
      this.rockColorVec.set(newProps.rockColor)
      this.material.uniforms.uRockColor.value = this.rockColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.sunColor !== undefined) {
      this.sunColorVec.set(newProps.sunColor)
      this.material.uniforms.uSunColor.value = this.sunColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.mistColor !== undefined) {
      this.mistColorVec.set(newProps.mistColor)
      this.material.uniforms.uMistColor.value = this.mistColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.snowColor !== undefined) {
      this.snowColorVec.set(newProps.snowColor)
      this.material.uniforms.uSnowColor.value = this.snowColorVec
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.snowLevel !== undefined)
      this.material.uniforms.uSnowLevel.value = newProps.snowLevel
    if (newProps.sunAngle !== undefined) this.material.uniforms.uSunAngle.value = newProps.sunAngle
    if (newProps.hazeStrength !== undefined)
      this.material.uniforms.uHazeStrength.value = newProps.hazeStrength
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

export const ParallaxMountainsDefinition: IBrickDefinition<ParallaxMountainsProps> = {
  type: 'parallax_mountains',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxMountainsInstance(id, props, context),
}

BrickRegistry.register(ParallaxMountainsDefinition)
