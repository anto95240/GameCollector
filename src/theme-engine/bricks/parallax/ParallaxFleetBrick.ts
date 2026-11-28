/**
 * src/theme-engine/bricks/parallax/ParallaxFleetBrick.ts
 *
 * Brique de silhouettes de Vaisseaux Lointains en Parallaxe (Couche 2 : Intermediate).
 * Flotte spatiale réaliste étagée sur 3 profondeurs avec :
 * - 4 modèles de vaisseaux distincts (cuirassé amiral, croiseur d'escorte, corvette lourde, intercepteur)
 * - Tailles, profondeurs et parallaxe variées avec correction de ratio d'aspect
 * - Trajectoires courbes lentes avec tangente d'assiette alignée sur la courbe
 * - Feux de navigation à double impulsion stroboscopique asynchrone + hublots de pont
 * - Tuyères multi-réacteurs et traînées ioniques courbes qui suivent le sillage
 * - Flou optique de distance et voile atmosphérique selon l'éloignement
 * - Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW)
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Vaisseaux Lointains.
 */
export interface ParallaxFleetProps {
  /** Teinte de la coque des vaisseaux (défaut #0a1120 ou uPaletteSecondary * 0.35). */
  hullColor?: string
  /** Teinte de la flamme de propulsion plasmique / ionique (défaut #38bdf8 ou uPaletteAccent). */
  engineColor?: string
  /** Densité et nombre de vaisseaux dans la flottille (défaut 1.0). */
  density?: number
  /** Vitesse de croisière sub-luminique différentielle (défaut 0.2). */
  speed?: number
  /** Échelonnement en profondeur et sensibilité à la parallaxe spatiale (défaut 0.4). */
  depth?: number
  /** Radiance des tuyères de réacteurs et lumières de bord (défaut 1.2). */
  intensity?: number
  /** Dispersion des trajectoires, variété de modèles et décalages (défaut 0.4). */
  randomness?: number
  /** Longueur relative des traînées de propulsion plasmique (défaut 0.8). */
  trailLength?: number
  /** Intensité du voile atmosphérique et du flou de distance sur les plans lointains (0.0 à 1.2, défaut 0.55). */
  atmosphericHaze?: number
  /** Courbure des trajectoires lentes en arc (0.0 à 1.0, défaut 0.45). */
  curveAmount?: number
}

export class ParallaxFleetInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_fleet'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxFleetProps
  private hullColorVec: THREE.Color
  private engineColorVec: THREE.Color

  constructor(id: string, props: ParallaxFleetProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.hullColorVec = new THREE.Color(props.hullColor ?? '#0a1120')
    this.engineColorVec = new THREE.Color(props.engineColor ?? '#38bdf8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.4
    const trailLength = props.trailLength ?? 0.8
    const atmosphericHaze = props.atmosphericHaze ?? 0.55
    const curveAmount = props.curveAmount ?? 0.45

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
        uHullColor: { value: this.hullColorVec },
        uEngineColor: { value: this.engineColorVec },
        uUseCustomColors: {
          value: Boolean(props.hullColor || props.engineColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uTrailLength: { value: trailLength },
        uAtmosphericHaze: { value: atmosphericHaze },
        uCurveAmount: { value: curveAmount },
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
        uniform vec3 uHullColor;
        uniform vec3 uEngineColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uTrailLength;
        uniform float uAtmosphericHaze;
        uniform float uCurveAmount;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // SDF boîte orientée centrée
        float sdBox(vec2 p, vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        // SDF trapèze horizontal (coques cunéiformes / profils aérodynamiques)
        float sdTaperedHull(vec2 p, float halfLen, float rearHalfH, float noseHalfH) {
          float u = clamp((p.x + halfLen) / max(0.0001, 2.0 * halfLen), 0.0, 1.0);
          float h = mix(rearHalfH, noseHalfH, u);
          float dx = abs(p.x) - halfLen;
          float dy = abs(p.y) - h;
          return max(dx, dy);
        }

        // Stroboscope aéronautique/spatial réaliste (double flash bref + longue pause)
        float navStrobe(float t, float period, float phase) {
          float cyc = fract((t + phase) / max(0.3, period));
          float f1 = exp(-pow((cyc - 0.08) * 32.0, 2.0));
          float f2 = exp(-pow((cyc - 0.21) * 32.0, 2.0)) * 0.85;
          return clamp(f1 + f2, 0.0, 1.0);
        }

        // Distance SDF du modèle de vaisseau dans son repère local normalisé
        // modelType: 0 = Cuirassé amiral, 1 = Croiseur d'escorte, 2 = Corvette/Cargo lourd, 3 = Intercepteur rapide
        float shipHullSDF(vec2 q, float len, float h, int modelType) {
          float hl = len * 0.5;
          if (modelType == 0) {
            // Cuirassé amiral : coque longue en coin + pont supérieur étagé + tour de commandement + quille ventrale
            float mainBody = sdTaperedHull(q, hl, h * 0.56, h * 0.14);
            float upperDeck = sdTaperedHull(q - vec2(-hl * 0.14, h * 0.34), hl * 0.58, h * 0.26, h * 0.06);
            float bridge = sdBox(q - vec2(-hl * 0.44, h * 0.68), vec2(hl * 0.14, h * 0.28));
            float towerMast = sdBox(q - vec2(-hl * 0.48, h * 0.98), vec2(hl * 0.04, h * 0.14));
            float keel = sdTaperedHull(q - vec2(-hl * 0.22, -h * 0.34), hl * 0.42, h * 0.24, h * 0.05);
            float engineBlock = sdBox(q - vec2(-hl * 0.92, 0.0), vec2(hl * 0.10, h * 0.46));
            return min(min(min(mainBody, upperDeck), min(bridge, towerMast)), min(keel, engineBlock));
          } else if (modelType == 1) {
            // Croiseur d'escorte : silhouette effilée en flèche + nacelles latérales + aileron dorsal
            float mainBody = sdTaperedHull(q, hl, h * 0.44, h * 0.07);
            float dorsalFin = sdTaperedHull(q - vec2(-hl * 0.32, h * 0.36), hl * 0.34, h * 0.30, h * 0.03);
            float ventralPod = sdTaperedHull(q - vec2(-hl * 0.10, -h * 0.26), hl * 0.46, h * 0.16, h * 0.04);
            float nacelle = sdBox(q - vec2(-hl * 0.70, h * 0.12), vec2(hl * 0.26, h * 0.22));
            return min(min(mainBody, dorsalFin), min(ventralPod, nacelle));
          } else if (modelType == 2) {
            // Corvette lourde / Cargo : proue marteau + fuselage articulé + double bloc moteur arrière
            float spine = sdBox(q - vec2(-hl * 0.04, 0.0), vec2(hl * 0.78, h * 0.24));
            float hammerProw = sdTaperedHull(q - vec2(hl * 0.64, 0.0), hl * 0.32, h * 0.44, h * 0.32);
            float cargoPod = sdBox(q - vec2(-hl * 0.05, -h * 0.24), vec2(hl * 0.38, h * 0.22));
            float aftDrive = sdBox(q - vec2(-hl * 0.78, 0.0), vec2(hl * 0.22, h * 0.48));
            return min(min(spine, hammerProw), min(cargoPod, aftDrive));
          } else {
            // Intercepteur / Chasseur : dard très fin à ailes arrière balayées
            float fuselage = sdTaperedHull(q, hl, h * 0.26, h * 0.04);
            float sweptWingTop = sdTaperedHull(q - vec2(-hl * 0.42, h * 0.38), hl * 0.36, h * 0.36, h * 0.02);
            float sweptWingBot = sdTaperedHull(q - vec2(-hl * 0.42, -h * 0.32), hl * 0.30, h * 0.26, h * 0.02);
            return min(fuselage, min(sweptWingTop, sweptWingBot));
          }
        }

        // Évalue un vaisseau individuel sur sa trajectoire courbe avec flou de distance et voile atmosphérique
        vec4 evaluateStarship(
          vec2 p,
          vec2 shipPos,
          float pitchAngle,
          float curveK,
          float shipLen,
          float shipH,
          float heading,
          int modelType,
          float distFactor,       // 0 = très proche, 1 = très lointain
          vec3 hullCol,
          vec3 engCol,
          vec3 hazeCol,
          float time,
          float seed,
          float baseAA
        ) {
          vec2 d = p - shipPos;
          // Rejet rapide boîte englobante généreuse
          float maxReach = shipLen * (0.75 + uTrailLength * 1.9);
          if (abs(d.x) > maxReach || abs(d.y) > shipLen * 0.85) {
            return vec4(0.0);
          }

          // Rotation dans le repère local aligné sur la tangente de la courbe
          float c = cos(-pitchAngle);
          float s = sin(-pitchAngle);
          vec2 local = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
          local.x *= heading;

          float hl = shipLen * 0.5;
          // Flou de distance : plus le vaisseau est loin, plus ses contours s'adoucissent
          float distBlur = baseAA * (1.0 + distFactor * 2.8 * (0.4 + uAtmosphericHaze));

          vec3 col = vec3(0.0);
          float alpha = 0.0;

          // 1. Traînée de propulsion ionique suivant la courbure de la trajectoire
          if (local.x < -hl * 0.78) {
            float trailX = (-hl * 0.88) - local.x;
            float maxTrailLen = shipLen * (0.55 + uTrailLength * 1.45);
            if (trailX > -shipH * 0.25 && trailX < maxTrailLen) {
              float uT = clamp(trailX / max(0.001, maxTrailLen), 0.0, 1.0);
              // La traînée s'incurve doucement selon la courbure locale de trajectoire
              float wakeCurveY = curveK * trailX * trailX * 1.85;
              float wy = local.y - wakeCurveY;

              // Nombre de tuyères selon la classe du vaisseau
              float plumeMask = 0.0;
              float coreMask = 0.0;
              float spread = 1.0 + uT * (1.1 + distFactor * 0.9);

              if (modelType == 0 || modelType == 2) {
                // Double tuyère principale (cuirassé / corvette)
                float sep = shipH * (modelType == 0 ? 0.24 : 0.26);
                float halfW = shipH * (modelType == 0 ? 0.16 : 0.14) * spread;
                float d1 = abs(wy - sep);
                float d2 = abs(wy + sep);
                float dMin = min(d1, d2);
                plumeMask = exp(-pow(dMin / max(0.0005, halfW), 1.65));
                coreMask = exp(-pow(dMin / max(0.0004, halfW * 0.36), 2.0));
              } else {
                // Tuyère centrale effilée (croiseur / intercepteur)
                float halfW = shipH * (modelType == 3 ? 0.16 : 0.20) * spread;
                plumeMask = exp(-pow(abs(wy) / max(0.0005, halfW), 1.6));
                coreMask = exp(-pow(abs(wy) / max(0.0004, halfW * 0.38), 2.0));
              }

              float longitudinal = pow(max(0.0, 1.0 - uT), 1.75) * smoothstep(-shipH * 0.2, shipH * 0.08, trailX);
              // Légère pulsation plasma et turbulence FBM dans le sillage (MEDIUM/HIGH)
              float turb = 1.0;
              if (uQualityLevel >= 1) {
                float machWave = 0.88 + 0.12 * sin(trailX * 140.0 - time * 14.0 + seed * 9.0);
                float wakeNoise = 0.78 + 0.22 * snoise(vec2(trailX * 32.0 - time * 6.5, wy * 80.0 + seed * 5.0));
                turb = machWave * wakeNoise;
              }

              float trailAlpha = clamp(plumeMask * longitudinal * turb * (0.95 - distFactor * 0.35), 0.0, 1.0);
              if (trailAlpha > 0.005) {
                // Coeur blanc-bleu incandescent proche de la tuyère -> teinte ionique -> dissipation froide
                vec3 hotCore = mix(engCol, vec3(0.96, 0.99, 1.0), clamp(coreMask * (1.0 - uT * 0.85), 0.0, 0.92));
                vec3 trailCol = mix(engCol * 0.75, hotCore * 1.45, coreMask * 0.7 + (1.0 - uT) * 0.3);
                // Voile atmosphérique sur la traînée lointaine
                trailCol = mix(trailCol, hazeCol, distFactor * uAtmosphericHaze * 0.45);
                col = trailCol;
                alpha = trailAlpha * 0.88;
              }
            }
          }

          // 2. Coque du vaisseau (SDF anti-aliasée + flou de distance)
          float dHull = shipHullSDF(local, shipLen, shipH, modelType);
          float hullMask = 1.0 - smoothstep(-distBlur * 0.5, distBlur * 0.85, dHull);

          if (hullMask > 0.004) {
            // Éclairage directionnel de la coque : arête dorsale éclairée, ventre dans l'ombre
            float yNorm = clamp(local.y / max(0.0005, shipH), -1.0, 1.0);
            float dorsalLight = smoothstep(-0.35, 0.75, yNorm);
            vec3 litRim = mix(hullCol * 1.85, vec3(0.72, 0.80, 0.92), 0.24);
            vec3 shadowHull = hullCol * 0.52;
            vec3 shipCol = mix(shadowHull, litRim, dorsalLight);

            // Micro-panneaux de blindage et liseré dorsal (HIGH uniquement)
            if (uQualityLevel >= 2) {
              float panelLine = smoothstep(0.45, 0.55, snoise(vec2(local.x / max(0.002, shipLen) * 18.0 + seed, local.y / max(0.001, shipH) * 6.0)));
              shipCol *= (0.92 + 0.14 * panelLine);
              // Fin reflet spéculaire sur le bord supérieur de la coque
              float rimEdge = smoothstep(-distBlur * 2.5, 0.0, dHull) * smoothstep(0.1, 0.65, yNorm);
              shipCol += vec3(0.75, 0.84, 0.96) * rimEdge * (0.28 * (1.0 - distFactor * 0.6));
            }

            // Hublots / ponts éclairés sur les vaisseaux capitaux (cuirassé et croiseur, MEDIUM/HIGH)
            if (uQualityLevel >= 1 && (modelType == 0 || modelType == 1)) {
              float deckBand = smoothstep(shipH * 0.14, shipH * 0.02, abs(local.y - shipH * 0.10));
              if (deckBand > 0.05 && local.x > -hl * 0.62 && local.x < hl * 0.58) {
                float winCell = floor((local.x + hl) / max(0.0015, shipLen * 0.032));
                float winPhase = fract((local.x + hl) / max(0.0015, shipLen * 0.032));
                float winOn = step(0.54, hash12(vec2(winCell, seed * 11.3)));
                float winDot = smoothstep(0.32, 0.12, abs(winPhase - 0.5)) * deckBand * winOn;
                vec3 deckWarm = mix(vec3(1.0, 0.86, 0.62), engCol, 0.25);
                shipCol += deckWarm * winDot * (0.85 - distFactor * 0.35);
              }
            }

            // Lueur directe des tuyères sur l'arrière de la coque + point lumineux de tuyère
            float aftGlow = exp(-max(0.0, (local.x + hl * 0.92)) / max(0.001, shipLen * 0.09)) * smoothstep(shipH * 0.72, 0.0, abs(local.y));
            vec3 nozzleBright = mix(engCol, vec3(0.95, 0.98, 1.0), 0.55);
            shipCol += nozzleBright * aftGlow * 0.95;

            // Désaturation & voile atmosphérique selon la distance
            float lum = dot(shipCol, vec3(0.299, 0.587, 0.114));
            shipCol = mix(shipCol, vec3(lum), distFactor * 0.42);
            float veil = clamp(distFactor * uAtmosphericHaze * 0.78, 0.0, 0.82);
            shipCol = mix(shipCol, hazeCol, veil);

            // Les vaisseaux très lointains deviennent légèrement plus translucides dans la brume
            float hullAlpha = hullMask * (1.0 - distFactor * uAtmosphericHaze * 0.28);
            col = mix(col, shipCol, hullAlpha);
            alpha = max(alpha, hullAlpha);
          }

          // 3. Feux de navigation clignotants (marqueur permanent discret + double flash stroboscopique asynchrone)
          if (uQualityLevel >= 1 || modelType == 0) {
            float strobeR = 0.24 + 0.92 * navStrobe(time, 2.25 + fract(seed * 3.1) * 1.2, seed * 7.3);
            float strobeW = 0.20 + 0.95 * navStrobe(time, 2.85 + fract(seed * 5.7) * 1.4, seed * 13.1 + 1.4);

            // Feu de proue / tribord (rouge/ambre) + feu dorsal/passerelle (blanc-cyan)
            vec2 noseLightPos = vec2(hl * 0.84, shipH * 0.05);
            vec2 dorsalLightPos = vec2(-hl * 0.44, modelType == 0 ? shipH * 0.98 : shipH * 0.48);

            float haloR = max(baseAA * 2.6, shipH * (0.34 + distFactor * 0.35));
            float dNose = length(local - noseLightPos);
            float dDorsal = length(local - dorsalLightPos);

            float glowNose = exp(-pow(dNose / haloR, 1.75)) * strobeR;
            float glowDorsal = exp(-pow(dDorsal / (haloR * 1.15), 1.75)) * strobeW;

            vec3 beaconRed = vec3(1.0, 0.30, 0.22);
            vec3 beaconWhite = mix(vec3(0.96, 0.99, 1.0), engCol, 0.30);
            float navFade = 1.0 - distFactor * 0.34;

            vec3 navAdd = (beaconRed * glowNose + beaconWhite * glowDorsal) * navFade * 1.55;
            float navAlpha = clamp((glowNose + glowDorsal) * navFade * 0.92, 0.0, 1.0);
            col += navAdd;
            alpha = max(alpha, navAlpha);
          }

          return vec4(col, alpha);
        }

        // Calcule position, pente (angle d'assiette) et courbure locale d'une trajectoire courbe lente
        void evalCurvedFlight(
          float progress,
          float baseY,
          float heading,
          float aspect,
          float curveAmp,
          float curveFreq,
          float phase,
          out vec2 pos,
          out float pitchAngle,
          out float curveK
        ) {
          float span = aspect + 0.95;
          float x = (heading > 0.0)
            ? (-0.475 + progress * span)
            : (aspect + 0.475 - progress * span);
          float arg = x * curveFreq + phase;
          float y = baseY + sin(arg) * curveAmp;
          float dydx = cos(arg) * curveAmp * curveFreq;
          float d2ydx2 = -sin(arg) * curveAmp * curveFreq * curveFreq;

          pos = vec2(x, y);
          // Orientation de la tangente locale (local.x *= heading gère le retournement gauche/droite)
          pitchAngle = atan(dydx, 1.0);
          curveK = d2ydx2 * 0.5;
        }

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          float baseAA = 1.35 / max(1.0, uResolution.y);
          vec2 uv = vUv;
          vec2 pBase = vec2(uv.x * aspect, uv.y);
          float t = uTime;

          vec3 baseHull = uUseCustomColors ? uHullColor : (uPaletteSecondary * 0.34);
          vec3 baseEngine = uUseCustomColors ? uEngineColor : uPaletteAccent;
          // Teinte du voile atmosphérique cosmique/ciel
          vec3 hazeCol = mix(uPalettePrimary * 0.42, mix(baseHull * 1.45, vec3(0.32, 0.42, 0.58), 0.45), 0.55);

          float densityFactor = clamp(uDensity, 0.4, 2.0);
          float randVar = clamp(uRandomness, 0.0, 1.0);
          float curveBase = clamp(uCurveAmount, 0.0, 1.0) * (0.068 + 0.038 * randVar);

          vec4 result = vec4(0.0);

          // =========================================================================
          // STRATE 3 : Plan Lointain (Cuirassé amiral + escorte lointaine) — fort voile atmosphérique
          // =========================================================================
          {
            float shiftX = uMouse.x * uDepth * 0.08 * aspect;
            float shiftY = uMouse.y * uDepth * 0.045 + uScroll * 0.045;
            vec2 pFar = pBase + vec2(shiftX, shiftY);

            // Cuirassé amiral colossal en arc lent majestueux
            float prog0 = fract(t * uSpeed * 0.022 + 0.24);
            vec2 pos0;
            float ang0;
            float k0;
            evalCurvedFlight(prog0, 0.72 + (randVar - 0.5) * 0.08, 1.0, aspect, curveBase * 0.85, 1.45, 0.6, pos0, ang0, k0);
            vec4 dread = evaluateStarship(
              pFar, pos0, ang0, k0,
              0.36, 0.056, 1.0, 0, 0.82,
              baseHull, baseEngine * 0.85, hazeCol, t, 1.3, baseAA
            );
            if (dread.a > 0.004) {
              result = dread;
            }

            // Second vaisseau capital lointain en HIGH si densité suffisante
            if (uQualityLevel >= 2 && densityFactor >= 0.75) {
              float prog1 = fract(t * uSpeed * 0.019 + 0.71);
              vec2 pos1;
              float ang1;
              float k1;
              evalCurvedFlight(prog1, 0.81 - randVar * 0.06, 1.0, aspect, curveBase * 0.65, 1.25, 2.4, pos1, ang1, k1);
              vec4 escortFar = evaluateStarship(
                pFar, pos1, ang1, k1,
                0.19, 0.030, 1.0, 2, 0.90,
                baseHull, baseEngine * 0.75, hazeCol, t, 4.7, baseAA
              );
              if (escortFar.a > 0.004) {
                result.rgb = mix(result.rgb, escortFar.rgb, escortFar.a);
                result.a = max(result.a, escortFar.a);
              }
            }
          }

          // =========================================================================
          // STRATE 2 : Plan Intermédiaire (Croiseurs & Corvettes en formation étagée)
          // =========================================================================
          {
            float shiftX = uMouse.x * uDepth * 0.22 * aspect;
            float shiftY = uMouse.y * uDepth * 0.12 + uScroll * 0.10;
            vec2 pMid = pBase + vec2(shiftX, shiftY);

            int midCount = (uQualityLevel == 0) ? 1 : (uQualityLevel == 1 ? 3 : 4);
            int activeMid = int(clamp(floor(float(midCount) * densityFactor + 0.45), 1.0, 4.0));

            for (int i = 0; i < 4; i++) {
              if (i >= activeMid) break;
              float fi = float(i);
              float hA = hash12(vec2(fi + 1.0, 17.3));
              float hB = hash12(vec2(fi + 5.0, 41.9));

              float spd = uSpeed * (0.048 + hA * 0.028);
              float prog = fract(t * spd + fi * 0.27 + hB * 0.25 * randVar);
              float baseY = 0.42 + (fi - 1.5) * 0.085 + (hA - 0.5) * 0.14 * randVar;
              float dir = (i == 2) ? -1.0 : 1.0;
              int model = (i == 1 || i == 3) ? 2 : 1;
              float scaleS = 0.85 + hB * 0.38;
              float distF = 0.38 + hA * 0.24;

              vec2 posM;
              float angM;
              float kM;
              evalCurvedFlight(
                prog, baseY, dir, aspect,
                curveBase * (0.8 + hB * 0.6),
                1.6 + hA * 0.9,
                fi * 1.9 + hB * 3.0,
                posM, angM, kM
              );

              vec4 cruiser = evaluateStarship(
                pMid, posM, angM, kM,
                0.155 * scaleS, 0.025 * scaleS, dir, model, distF,
                baseHull, baseEngine, hazeCol, t, fi * 7.3 + 11.1, baseAA
              );
              if (cruiser.a > 0.004) {
                result.rgb = mix(result.rgb, cruiser.rgb, cruiser.a);
                result.a = max(result.a, cruiser.a);
              }
            }
          }

          // =========================================================================
          // STRATE 1 : Avant-Plan (Intercepteurs & Frégates agiles, nets, parallaxe vive)
          // =========================================================================
          if (uQualityLevel >= 2) {
            float shiftX = uMouse.x * uDepth * 0.44 * aspect;
            float shiftY = uMouse.y * uDepth * 0.24 + uScroll * 0.19;
            vec2 pNear = pBase + vec2(shiftX, shiftY);

            int activeNear = int(clamp(floor(2.2 * densityFactor + 0.35), 1.0, 3.0));
            for (int j = 0; j < 3; j++) {
              if (j >= activeNear) break;
              float fj = float(j);
              float hA = hash12(vec2(fj + 11.0, 29.7));
              float hB = hash12(vec2(fj + 19.0, 63.1));

              float spd = uSpeed * (0.105 + hA * 0.045);
              float prog = fract(t * spd + fj * 0.36 + 0.14);
              float dir = (j == 1) ? 1.0 : -1.0;
              float baseY = 0.22 + fj * 0.13 + (hB - 0.5) * 0.10 * randVar;
              int model = (j == 2) ? 1 : 3;
              float scaleN = 0.85 + hA * 0.35;

              vec2 posN;
              float angN;
              float kN;
              evalCurvedFlight(
                prog, baseY, dir, aspect,
                curveBase * (1.1 + hA * 0.7),
                1.95 + hB * 0.8,
                fj * 2.7 + 0.9,
                posN, angN, kN
              );

              vec4 fighter = evaluateStarship(
                pNear, posN, angN, kN,
                0.095 * scaleN, 0.017 * scaleN, dir, model, 0.08 + fj * 0.05,
                baseHull * 1.15, baseEngine * 1.18, hazeCol, t, fj * 13.7 + 31.4, baseAA
              );
              if (fighter.a > 0.004) {
                result.rgb = mix(result.rgb, fighter.rgb, fighter.a);
                result.a = max(result.a, fighter.a);
              }
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

  public updateProps(newProps: Partial<ParallaxFleetProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.hullColor !== undefined) {
      this.hullColorVec.set(newProps.hullColor)
      this.material.uniforms.uHullColor.value = this.hullColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.engineColor !== undefined) {
      this.engineColorVec.set(newProps.engineColor)
      this.material.uniforms.uEngineColor.value = this.engineColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.trailLength !== undefined)
      this.material.uniforms.uTrailLength.value = newProps.trailLength
    if (newProps.atmosphericHaze !== undefined)
      this.material.uniforms.uAtmosphericHaze.value = newProps.atmosphericHaze
    if (newProps.curveAmount !== undefined)
      this.material.uniforms.uCurveAmount.value = newProps.curveAmount
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

export const ParallaxFleetDefinition: IBrickDefinition<ParallaxFleetProps> = {
  type: 'parallax_fleet',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxFleetInstance(id, props, context),
}

BrickRegistry.register(ParallaxFleetDefinition)
