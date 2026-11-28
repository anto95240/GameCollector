/**
 * src/theme-engine/bricks/overlay/WindowRainBrick.ts
 *
 * Brique d'overlay : Pluie & Ruissellement sur Vitre (Couche 5 : Overlay).
 * Shader réaliste de verrière sous la pluie avec capture de scène FramebufferTexture (HIGH & MEDIUM) :
 * - Gouttes coulantes descendant strictement sous gravité avec mouvement stick-slip réaliste
 *   (hésitations puis glissades) et méandres organiques continus
 * - Traînées humides continues qui essuient la buée et micro-gouttelettes résiduelles irrégulières
 * - Fusion des gouttes (coalescence par champ métaballe lissé entre gouttes voisines, traînées et
 *   micro-gouttelettes statiques)
 * - Réfraction optique réelle (image inversée de la scène) à travers la lentille convexe de chaque goutte
 * - Arrière-plan flouté derrière la buée / condensation, tandis que les gouttes et traînées essuyées
 *   révèlent une image plus nette
 * - Biais périphérique (edgeBias) modulable pour préserver la lisibilité des cartes UI au centre
 * - Palier LOW sans copie FBO pour préserver 100 % des FPS mobiles.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export interface WindowRainProps {
  /** Teinte de la buée et de la réfraction ambiante sur la vitre (défaut #94a3b8 ou uPalettePrimary). */
  tintColor?: string
  /** Teinte des reflets spéculaires et caustiques lumineuses dans les gouttes (défaut #f8fafc ou uPaletteAccent). */
  highlightColor?: string
  /** Abondance des gouttes et colonnes de ruissellement (0.4 à 1.8, défaut 1.0). */
  dropDensity?: number
  /** Vitesse de ruissellement gravitaire irrégulier (0.15 à 1.0, défaut 0.42). */
  trailSpeed?: number
  /** Intensité de la buée périphérique douce sur la vitre (0.0 à 0.6, défaut 0.32). */
  condensation?: number
  /** Concentration périphérique préservant la netteté des textes UI centraux (0.0 à 1.0, défaut 0.65). */
  edgeBias?: number
  /** Multiplicateur global d'échelle cellulaire (0.4 à 2.0, défaut 1.0). */
  density?: number
  /** Multiplicateur de cadence temporelle (0.0 à 1.5, défaut 0.45). */
  speed?: number
  /** Sensibilité directionnelle des reflets spéculaires et dérive au scroll/souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Présence lumineuse et contraste optique global (0.2 à 1.8, défaut 0.85). */
  intensity?: number
  /** Irrégularité des trajectoires, méandres et tailles de gouttes (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Intensité du flou d'arrière-plan à travers la vitre embuée (0.0 à 1.0, défaut 0.65). */
  blurAmount?: number
  /** Force de la réfraction lenticulaire inversant la scène dans chaque goutte (0.0 à 0.15, défaut 0.06). */
  refractionStrength?: number
  /** Degré de fusion organique par tension de surface entre gouttes voisines (0.0 à 1.0, défaut 0.75). */
  coalescence?: number
}

export class WindowRainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'window_rain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: WindowRainProps
  private tintColorVec: THREE.Color
  private highlightColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: WindowRainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.tintColorVec = new THREE.Color(props.tintColor ?? '#94a3b8')
    this.highlightColorVec = new THREE.Color(props.highlightColor ?? '#f8fafc')

    const dropDensity = props.dropDensity ?? 1.0
    const trailSpeed = props.trailSpeed ?? 0.42
    const condensation = props.condensation ?? 0.32
    const edgeBias = props.edgeBias ?? 0.65
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.45
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 0.85
    const randomness = props.randomness ?? 0.45
    const blurAmount = props.blurAmount ?? 0.65
    const refractionStrength = props.refractionStrength ?? 0.06
    const coalescence = props.coalescence ?? 0.75

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uTintColor: { value: this.tintColorVec },
        uHighlightColor: { value: this.highlightColorVec },
        uUseCustomColors: { value: Boolean(props.tintColor || props.highlightColor) },
        uDropDensity: { value: dropDensity },
        uTrailSpeed: { value: trailSpeed },
        uCondensation: { value: condensation },
        uEdgeBias: { value: edgeBias },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uBlurAmount: { value: blurAmount },
        uRefractionStrength: { value: refractionStrength },
        uCoalescence: { value: coalescence },
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
          gl_Position = vec4(position.xy, -0.997, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uTintColor;
        uniform vec3 uHighlightColor;
        uniform bool uUseCustomColors;
        uniform float uDropDensity;
        uniform float uTrailSpeed;
        uniform float uCondensation;
        uniform float uEdgeBias;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uBlurAmount;
        uniform float uRefractionStrength;
        uniform float uCoalescence;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        // Méandre latéral continu le long d'une colonne de verre (pas de couture verticale)
        float columnMeander(float worldY, float colId, float seed, float randAmt) {
          float w = worldY * 6.5 + seed * 6.28318;
          return (sin(w) * 0.55 + sin(w * 2.13 + colId * 1.7) * 0.45) * (0.14 + randAmt * 0.16);
        }

        // Évalue une strate de gouttes coulantes avec fusion entre cellules voisines
        // Retourne vec4(normalX, normalY, metaballField, wipeTrailMask)
        vec4 rainDropLayer(vec2 p, float t, float scale, float seedOffset, bool checkNeighbors, bool withWake) {
          vec2 aspectGrid = vec2(2.2, 1.0);
          vec2 stBase = p * scale * aspectGrid;

          float fallRate = t * 0.34;
          vec2 st = vec2(stBase.x, stBase.y + fallRate);
          vec2 baseCell = floor(st);

          vec2 accumNorm = vec2(0.0);
          float fieldSum = 0.0;
          float wipeMax = 0.0;

          // En HIGH/MEDIUM on parcourt le voisinage horizontal pour permettre la fusion réelle
          // de gouttes entre colonnes/lignes adjacentes
          int iMin = checkNeighbors ? -1 : 0;
          int iMax = checkNeighbors ? 1 : 0;

          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              if (!checkNeighbors && (i != 0 || j != 0)) continue;
              if (i < iMin || i > iMax) continue;

              vec2 cellId = baseCell + vec2(float(i), float(j));
              float colShift = hash12(vec2(cellId.x, seedOffset)) * 7.13;
              vec2 h = hash22(cellId + vec2(seedOffset, colShift));

              // Probabilité de goutte dans cette cellule
              float presence = step(clamp(0.56 - uDropDensity * 0.26, 0.08, 0.72), h.x);
              if (presence < 0.5) continue;

              // Mouvement gravitaire STRICTEMENT descendant avec stick-slip (jamais de remontée)
              float speedVar = 0.70 + h.y * 0.65;
              float phase = t * speedVar * 0.26 + h.x * 13.7 + colShift;
              float saw = fract(phase);
              // Hésitation puis accélération sous gravité (dérivée toujours > 0)
              float stickSlip = saw + 0.12 * sin(saw * 6.2831853);
              float dropY = 0.45 - stickSlip * 0.90;

              // Coordonnée locale relative à cette cellule candidate
              vec2 cellLocal = st - (cellId + 0.5);
              float worldY = p.y * scale + fallRate * 0.1;
              float xBase = (h.y - 0.5) * 0.55;
              float wiggle = columnMeander(worldY - cellLocal.y, cellId.x, h.x, uRandomness);
              float dropX = clamp(xBase + wiggle, -0.40, 0.40);

              vec2 d = (cellLocal - vec2(dropX, dropY)) / aspectGrid;

              // Forme de larme convexe légèrement allongée en haut
              float sizeVar = mix(0.72, 1.32, hash12(cellId + 31.7));
              float radius = 0.058 * sizeVar;
              vec2 tear = d;
              tear.y *= mix(0.75, 1.10, smoothstep(-radius, radius, d.y));
              float distMain = length(tear);

              // Potentiel métaballe lissé pour fusion des gouttes voisines
              float normR = distMain / max(0.001, radius);
              float dropPot = clamp(1.0 - normR * normR, 0.0, 1.0);
              dropPot = dropPot * dropPot * (3.0 - 2.0 * dropPot);

              if (dropPot > 0.001) {
                fieldSum += dropPot;
                accumNorm += (tear / max(0.001, radius)) * dropPot;
              }

              // Sillage humide continu au-dessus de la goutte (essuie buée et micro-gouttes)
              float dxTrail = abs(cellLocal.x - dropX) / aspectGrid.x;
              float aboveDrop = smoothstep(dropY - 0.02, dropY + 0.08, cellLocal.y);
              float trailFade = smoothstep(0.95, dropY, cellLocal.y);
              float wipe = smoothstep(radius * 1.05, radius * 0.15, dxTrail) * aboveDrop * trailFade;
              wipeMax = max(wipeMax, max(wipe, dropPot));

              // Micro-gouttelettes résiduelles irrégulières laissées dans la traînée
              if (withWake && aboveDrop > 0.01 && dxTrail < radius * 1.3) {
                float wakeScale = 5.5 + h.x * 3.0;
                float wakeY = cellLocal.y * wakeScale + h.y * 4.0;
                float wakeId = floor(wakeY);
                float wh = hash12(vec2(cellId.x * 17.0 + wakeId, cellId.y * 13.0 + seedOffset));
                if (wh > 0.34) {
                  float jitterY = (hash12(vec2(wakeId, wh)) - 0.5) * 0.35;
                  float jitterX = (hash12(vec2(wh, wakeId + 5.1)) - 0.5) * 0.012;
                  vec2 wd = vec2(
                    (cellLocal.x - dropX) / aspectGrid.x - jitterX,
                    (fract(wakeY) - 0.5 - jitterY) / wakeScale
                  );
                  float wRadius = radius * mix(0.20, 0.44, wh) * mix(0.95, 0.45, clamp(cellLocal.y - dropY, 0.0, 1.0));
                  float wNorm = length(wd) / max(0.001, wRadius);
                  float wPot = clamp(1.0 - wNorm * wNorm, 0.0, 1.0);
                  wPot = wPot * wPot * aboveDrop * trailFade;
                  if (wPot > 0.001) {
                    fieldSum += wPot * 0.9;
                    accumNorm += (wd / max(0.001, wRadius)) * wPot * 0.85;
                  }
                }
              }
            }
          }

          // Seuil métaballe modulé par uCoalescence pour créer le pont de fusion liquide
          float thresh = mix(0.32, 0.18, clamp(uCoalescence, 0.0, 1.0));
          float dropMask = smoothstep(thresh, thresh + 0.36, fieldSum);
          vec2 finalNorm = fieldSum > 0.001 ? accumNorm / max(1.0, fieldSum) : vec2(0.0);

          return vec4(finalNorm, dropMask, wipeMax);
        }

        // Micro-gouttelettes statiques accrochées au verre (HIGH)
        vec3 staticMicroDrops(vec2 p, float t, float scale) {
          vec2 st = p * scale;
          vec2 id = floor(st);
          vec2 gv = fract(st) - 0.5;
          vec2 h = hash22(id + 47.2);

          float cycle = 0.5 + 0.5 * sin(t * 0.10 + h.x * 18.0 + h.y * 9.0);
          float dropActive = step(clamp(0.60 - uDropDensity * 0.24, 0.16, 0.78), h.y) * smoothstep(0.15, 0.55, cycle);
          if (dropActive < 0.01) return vec3(0.0);

          vec2 pos = (hash22(id + 91.4) - 0.5) * 0.56;
          vec2 d = gv - pos;
          float r = mix(0.10, 0.22, h.x) * (0.72 + 0.28 * cycle);
          float dist = length(d);
          float m = smoothstep(r, r * 0.25, dist) * dropActive;
          vec2 off = (d / max(0.001, r)) * m * 0.75;
          return vec3(off, m);
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          float aspect = res.x / res.y;
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Biais périphérique pour garder le centre UI propre et lisible
          vec2 normCenter = (uv - 0.5) * 2.0;
          float radialCenter = length(normCenter * vec2(0.92, 1.0));
          float edgeFocus = smoothstep(0.24, 0.96, radialCenter);
          float dropRegionMask = mix(1.0, 0.16 + 0.84 * edgeFocus, clamp(uEdgeBias, 0.0, 1.0));

          float t = uTime * max(0.02, uSpeed) * (0.45 + clamp(uTrailSpeed, 0.15, 1.0) * 1.35);

          // Légère dérive au scroll et inclinaison au vent/souris
          vec2 dropUv = vec2(p.x + uMouse.x * uDepth * 0.03, p.y - uScroll * uDepth * 0.12);
          float baseScale = 4.6 * clamp(uDensity, 0.4, 2.0);

          vec2 accumNorm = vec2(0.0);
          float dropMask = 0.0;
          float wipeMask = 0.0;

          if (uQualityLevel == 0) {
            // === PALIER LOW : 1 strate optimisée sans voisins ni copie FBO ===
            vec4 l1 = rainDropLayer(dropUv, t, baseScale, 1.7, false, false);
            accumNorm = l1.xy;
            dropMask = l1.z * dropRegionMask;
            wipeMask = l1.w;
          } else {
            // === PALIERS MEDIUM & HIGH : gouttes coulantes avec fusion et sillages ===
            vec4 l1 = rainDropLayer(dropUv, t, baseScale, 1.7, true, true);
            accumNorm = l1.xy;
            dropMask = l1.z;
            wipeMask = l1.w;

            if (uQualityLevel >= 2) {
              // Seconde strate plus fine + fusion liquide avec la strate principale
              vec4 l2 = rainDropLayer(dropUv + vec2(0.37, -0.19), t * 0.74, baseScale * 1.62, 29.3, true, true);
              float coal = clamp(uCoalescence, 0.0, 1.0);
              float merged = max(dropMask, l2.z * 0.90) + min(dropMask, l2.z * 0.90) * 0.35 * coal;
              dropMask = clamp(merged, 0.0, 1.0);
              accumNorm = mix(accumNorm, l2.xy, clamp(l2.z / max(0.001, dropMask + l2.z), 0.0, 1.0));
              wipeMask = max(wipeMask, l2.w * 0.85);

              // Micro-gouttelettes statiques essuyées par les traînées
              vec3 micro = staticMicroDrops(dropUv + vec2(0.11, 0.23), t, baseScale * 4.8);
              float microVisible = micro.z * (1.0 - wipeMask * 0.94) * (0.30 + 0.70 * edgeFocus);
              if (microVisible > 0.01) {
                float mergeM = max(dropMask, microVisible * 0.78) + min(dropMask, microVisible) * 0.25 * coal;
                accumNorm = mix(accumNorm, micro.xy, clamp(microVisible / max(0.001, dropMask + microVisible), 0.0, 0.75));
                dropMask = clamp(mergeM, 0.0, 1.0);
              }
            }

            dropMask *= dropRegionMask;
          }

          // Buée / condensation douce (essuyée dans le sillage des gouttes)
          float condMask = 0.0;
          if (uCondensation > 0.005 || uBlurAmount > 0.01) {
            float edgeCond = mix(1.0, smoothstep(0.28, 1.08, radialCenter), clamp(uEdgeBias, 0.0, 1.0));
            float fogTex = 0.78;
            if (uQualityLevel >= 2) {
              float n1 = snoise(p * 2.8 + vec2(t * 0.012, -t * 0.008)) * 0.5 + 0.5;
              float n2 = snoise(p * 6.2 - vec2(1.7, t * 0.016)) * 0.5 + 0.5;
              fogTex = mix(0.58, 1.12, n1 * 0.68 + n2 * 0.32);
            } else if (uQualityLevel == 1) {
              fogTex = mix(0.68, 1.04, snoise(p * 3.0) * 0.5 + 0.5);
            }
            condMask = edgeCond * fogTex * clamp(uCondensation, 0.0, 0.6) * (1.0 - wipeMask * 0.85);
          }

          vec3 colTint = uUseCustomColors ? uTintColor : uPalettePrimary;
          vec3 colHi = uUseCustomColors ? uHighlightColor : uPaletteAccent;

          // Optique convexe de la goutte : normale hémisphérique
          float r2 = clamp(dot(accumNorm, accumNorm), 0.0, 0.99);
          float nz = sqrt(max(0.01, 1.0 - r2));
          vec3 N = normalize(vec3(accumNorm, nz));

          vec3 lightDir = normalize(vec3(
            -0.38 + uMouse.x * uDepth * 0.75,
            0.58 + uMouse.y * uDepth * 0.55,
            0.88
          ));
          vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));

          float spec = pow(max(0.0, dot(N, halfVec)), 36.0) * 1.45;
          float bottomCaustic = smoothstep(0.05, 0.82, -N.y) * smoothstep(0.15, 0.85, dropMask) * 0.72;
          float fresnel = pow(1.0 - max(0.0, N.z), 2.4) * 0.62;

          if (uHasScreenTex && uQualityLevel >= 1) {
            vec4 rawCenter = texture2D(uScreenTex, uv);

            // Arrière-plan flou derrière la vitre embuée (plus net là où les gouttes ont essuyé la buée)
            float blurStrength = clamp(uBlurAmount, 0.0, 1.0)
              * mix(1.0, smoothstep(0.22, 0.98, radialCenter), clamp(uEdgeBias, 0.0, 1.0))
              * (1.0 - wipeMask * 0.78)
              * clamp(0.35 + uCondensation * 1.5, 0.0, 1.0);

            vec3 bgCol = unpremultiply(rawCenter);
            if (blurStrength > 0.02) {
              vec2 texel = (1.0 / res) * (blurStrength * (uQualityLevel >= 2 ? 7.5 : 4.2));
              if (uQualityLevel >= 2) {
                vec3 bSum = bgCol * 0.20;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( texel.x,  0.0), vec2(0.001), vec2(0.999)))) * 0.11;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2(-texel.x,  0.0), vec2(0.001), vec2(0.999)))) * 0.11;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( 0.0,  texel.y), vec2(0.001), vec2(0.999)))) * 0.11;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( 0.0, -texel.y), vec2(0.001), vec2(0.999)))) * 0.11;
                vec2 diag = texel * 0.7071;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( diag.x,  diag.y), vec2(0.001), vec2(0.999)))) * 0.09;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2(-diag.x,  diag.y), vec2(0.001), vec2(0.999)))) * 0.09;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( diag.x, -diag.y), vec2(0.001), vec2(0.999)))) * 0.09;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2(-diag.x, -diag.y), vec2(0.001), vec2(0.999)))) * 0.09;
                bgCol = bSum;
              } else {
                vec3 bSum = bgCol * 0.36;
                vec2 diag = texel * 0.7071;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( diag.x,  diag.y), vec2(0.001), vec2(0.999)))) * 0.16;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2(-diag.x,  diag.y), vec2(0.001), vec2(0.999)))) * 0.16;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2( diag.x, -diag.y), vec2(0.001), vec2(0.999)))) * 0.16;
                bSum += unpremultiply(texture2D(uScreenTex, clamp(uv + vec2(-diag.x, -diag.y), vec2(0.001), vec2(0.999)))) * 0.16;
                bgCol = bSum;
              }
            }

            // Voile de buée laiteux sur l'arrière-plan flou
            vec3 condCol = mix(colTint * 0.75, colHi * 0.45 + colTint * 0.55, 0.35);
            vec3 glassCol = mix(bgCol, condCol, clamp(condMask * (0.65 + 0.35 * uIntensity), 0.0, 0.46));

            // Réfraction de la scène (image inversée par la lentille convexe) dans chaque goutte
            if (dropMask > 0.01) {
              float refr = clamp(uRefractionStrength, 0.0, 0.15) * clamp(uIntensity, 0.3, 1.5);
              // Le signe négatif sur accumNorm inverse haut/bas et gauche/droite à l'intérieur de la goutte
              vec2 refrUv = clamp(uv - accumNorm * refr, vec2(0.001), vec2(0.999));
              vec3 refrScene = unpremultiply(texture2D(uScreenTex, refrUv));

              // Légère caustique lumineuse en bas de goutte + contour Fresnel + spéculaire net
              vec3 dropInterior = mix(refrScene, refrScene * 1.15 + colHi * 0.14, bottomCaustic * 0.48);
              dropInterior = mix(dropInterior, colHi * 0.85, fresnel * 0.40);
              dropInterior += mix(colHi, vec3(1.0), 0.68) * spec * 0.82;

              glassCol = mix(glassCol, dropInterior, dropMask);
            }

            float outAlpha = clamp(max(rawCenter.a, max(condMask * 0.5, dropMask * 0.7)), 0.0, 1.0);
            gl_FragColor = vec4(clamp(glassCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Rendu direct analytique sans copie FBO ===
          if (dropMask <= 0.004 && condMask <= 0.004) discard;
          float upperShade = smoothstep(0.15, 0.85, N.y) * 0.35;
          vec3 dropCol = mix(colTint * 0.45, colTint * 0.95, 1.0 - upperShade);
          dropCol += colHi * (bottomCaustic * 0.85 + fresnel * 0.55);
          dropCol += mix(colHi, vec3(1.0), 0.65) * spec;

          vec3 condCol = mix(colTint * 0.85, colHi * 0.65 + colTint * 0.35, 0.25);
          float dropAlpha = clamp(dropMask * (0.34 + fresnel * 0.42 + bottomCaustic * 0.35 + spec * 0.55) * uIntensity, 0.0, 0.88);
          float condAlpha = clamp(condMask * (0.65 + 0.35 * uIntensity), 0.0, 0.42);
          float totalAlpha = clamp(condAlpha + dropAlpha * (1.0 - condAlpha * 0.35), 0.0, 0.88);
          if (totalAlpha <= 0.004) discard;

          vec3 finalCol = mix(condCol, dropCol, clamp(dropAlpha / max(0.001, totalAlpha), 0.0, 1.0));
          gl_FragColor = vec4(finalCol, totalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 92

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

  public updateProps(newProps: Partial<WindowRainProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.tintColor !== undefined) {
      this.tintColorVec.set(newProps.tintColor)
      this.material.uniforms.uTintColor.value = this.tintColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.highlightColor !== undefined) {
      this.highlightColorVec.set(newProps.highlightColor)
      this.material.uniforms.uHighlightColor.value = this.highlightColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.dropDensity !== undefined)
      this.material.uniforms.uDropDensity.value = newProps.dropDensity
    if (newProps.trailSpeed !== undefined)
      this.material.uniforms.uTrailSpeed.value = newProps.trailSpeed
    if (newProps.condensation !== undefined)
      this.material.uniforms.uCondensation.value = newProps.condensation
    if (newProps.edgeBias !== undefined) this.material.uniforms.uEdgeBias.value = newProps.edgeBias
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.blurAmount !== undefined)
      this.material.uniforms.uBlurAmount.value = newProps.blurAmount
    if (newProps.refractionStrength !== undefined)
      this.material.uniforms.uRefractionStrength.value = newProps.refractionStrength
    if (newProps.coalescence !== undefined)
      this.material.uniforms.uCoalescence.value = newProps.coalescence
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

export const WindowRainDefinition: IBrickDefinition<WindowRainProps> = {
  type: 'window_rain',
  category: 'overlay',
  create: (id, props, context) => new WindowRainInstance(id, props, context),
}

BrickRegistry.register(WindowRainDefinition)
