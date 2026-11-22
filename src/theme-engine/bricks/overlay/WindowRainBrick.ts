/**
 * src/theme-engine/bricks/overlay/WindowRainBrick.ts
 *
 * Brique d'overlay : Pluie & Ruissellement sur Vitre (Couche 5 : Overlay).
 * Shader procédural 1 draw call sans FBO simulant des gouttes de pluie sur une verrière :
 * - Gouttes coulantes multi-échelles à mouvement gravitaire irrégulier (stick-slip organique)
 *   et méandres latéraux sur imperfections du verre
 * - Micro-sillages de gouttelettes résiduelles derrière chaque goutte en mouvement
 * - Micro-gouttelettes statiques accrochées au verre (HIGH)
 * - Optique de lentille convexe analytique (normale sphérique, caustique interne inversée
 *   en croissant inférieur, spéculaire net orienté par la souris, ombre de contact)
 * - Buée périphérique douce (condensation) essuyée par les sillages, avec biais périphérique
 *   (edgeBias) garantissant la parfaite lisibilité du contenu UI au centre.
 *
 * Thèmes cibles : croft_manor, kingsman, the_couch.
 * Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
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
}

export class WindowRainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'window_rain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WindowRainProps
  private tintColorVec: THREE.Color
  private highlightColorVec: THREE.Color

  constructor(id: string, props: WindowRainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Grille de gouttes coulantes avec mouvement gravitaire stick-slip non-linéaire.
        // Retourne vec4(normalOffset.x, normalOffset.y, dropMask, trailWipeMask)
        vec4 rainDropLayer(vec2 uv, float t, float scale, float seedOffset, bool withWake) {
          vec2 aspectGrid = vec2(2.0, 1.0);
          vec2 st = uv * scale * aspectGrid;
          // Dérive verticale de la colonne cellulaire
          float fallScroll = t * 0.28;
          st.y += fallScroll;

          vec2 cellId = floor(st);
          vec2 h = hash22(cellId + seedOffset);
          // Décalage vertical aléatoire par colonne pour briser toute périodicité horizontale
          float colShift = hash12(vec2(cellId.x, seedOffset)) * 5.73;
          st.y += colShift;

          cellId = floor(st);
          vec2 gv = fract(st) - 0.5;
          h = hash22(cellId + seedOffset + 11.3);

          // Probabilité de présence d'une goutte dans la cellule (contrôlée par dropDensity)
          float presence = step(clamp(0.58 - uDropDensity * 0.28, 0.08, 0.72), h.x);
          if (presence < 0.5) {
            return vec4(0.0);
          }

          // Mouvement stick-slip organique : hésitation puis glissade accélérée
          float tCell = t * (0.62 + h.y * 0.68) + h.x * 19.37;
          float stickSlip = sin(tCell + sin(tCell + sin(tCell) * 0.52));
          float y = -stickSlip * 0.40;

          // Méandre latéral irrégulier le long des micro-imperfections de la vitre
          float wigPhase = uv.y * 16.0 + h.x * 6.2831;
          float xBase = (h.y - 0.5) * 0.62;
          float wiggle = sin(wigPhase) * pow(sin(wigPhase * 0.43 + h.y * 5.0), 2.0) * (0.14 + uRandomness * 0.16);
          float x = clamp(xBase + wiggle, -0.38, 0.38);

          vec2 dropPos = vec2(x, y);
          vec2 d = (gv - dropPos) / aspectGrid;

          // Forme de larme convexe (légèrement effilée vers le haut)
          float sizeVar = mix(0.75, 1.22, hash12(cellId + 31.7));
          float radius = 0.056 * sizeVar;
          vec2 tear = d;
          tear.y *= mix(0.78, 1.08, smoothstep(-radius, radius, d.y));
          float distMain = length(tear);
          float mainDrop = smoothstep(radius, radius * 0.25, distMain);

          // Sillage humide qui essuie la buée au-dessus de la goutte
          float dxTrail = abs(gv.x - x) / aspectGrid.x;
          float aboveDrop = smoothstep(y - 0.02, y + 0.06, gv.y);
          float trailFade = smoothstep(0.50, y, gv.y);
          float wipe = smoothstep(radius * 0.95, radius * 0.12, dxTrail) * aboveDrop * trailFade;

          vec2 normOff = vec2(0.0);
          float mask = mainDrop;
          if (mainDrop > 0.01) {
            normOff = (tear / max(0.001, radius)) * mainDrop;
          }

          // Chapelet de micro-gouttelettes résiduelles accrochées dans le sillage
          if (withWake && aboveDrop > 0.01) {
            vec2 trailGv = vec2(gv.x - x, fract(gv.y * 7.5 + h.x * 3.0) - 0.5);
            vec2 td = trailGv / vec2(aspectGrid.x, 7.5);
            float tRadius = radius * mix(0.46, 0.20, clamp((gv.y - y) * 1.4, 0.0, 1.0));
            float tDist = length(td);
            float trailBead = smoothstep(tRadius, tRadius * 0.25, tDist) * aboveDrop * trailFade;
            if (trailBead > mask) {
              mask = trailBead;
              normOff = (td / max(0.001, tRadius)) * trailBead * 0.85;
            }
          }

          return vec4(normOff, mask, max(wipe, mainDrop));
        }

        // Fine buée de micro-gouttelettes statiques accrochées à la vitre (HIGH)
        vec3 staticMicroDrops(vec2 uv, float t, float scale) {
          vec2 st = uv * scale;
          vec2 id = floor(st);
          vec2 gv = fract(st) - 0.5;
          vec2 h = hash22(id + 47.2);

          // Apparition/évaporation très lente et asynchrone
          float cycle = 0.5 + 0.5 * sin(t * 0.12 + h.x * 18.0 + h.y * 9.0);
          float dropActive = step(clamp(0.62 - uDropDensity * 0.22, 0.18, 0.78), h.y) * smoothstep(0.15, 0.55, cycle);
          if (dropActive < 0.01) return vec3(0.0);

          vec2 pos = (hash22(id + 91.4) - 0.5) * 0.58;
          vec2 d = gv - pos;
          float r = mix(0.09, 0.20, h.x) * (0.7 + 0.3 * cycle);
          float dist = length(d);
          float m = smoothstep(r, r * 0.28, dist) * dropActive;
          vec2 off = (d / max(0.001, r)) * m * 0.7;
          return vec3(off, m);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Distance au centre pour préserver la lisibilité des cartes et textes UI
          vec2 normCenter = (uv - 0.5) * 2.0;
          float radialCenter = length(normCenter * vec2(0.92, 1.0));
          float edgeFocus = smoothstep(0.24, 0.96, radialCenter);
          // Biais périphérique modulable (edgeBias = 0 => homogène, edgeBias = 1 => bordures privilégiées)
          float dropRegionMask = mix(1.0, 0.16 + 0.84 * edgeFocus, clamp(uEdgeBias, 0.0, 1.0));

          float t = uTime * max(0.02, uSpeed) * (0.45 + clamp(uTrailSpeed, 0.15, 1.0) * 1.35);

          // Légère dérive au scroll et inclinaison au vent/souris
          vec2 dropUv = vec2(p.x + uMouse.x * uDepth * 0.035, p.y - uScroll * uDepth * 0.14);
          float baseScale = 5.4 * clamp(uDensity, 0.4, 2.0);

          vec2 accumNorm = vec2(0.0);
          float dropMask = 0.0;
          float wipeMask = 0.0;

          if (uQualityLevel == 0) {
            // === PALIER LOW : 1 grille de gouttes coulantes sans sillage fin ===
            vec4 l1 = rainDropLayer(dropUv, t, baseScale, 1.7, false);
            accumNorm = l1.xy;
            dropMask = l1.z * dropRegionMask;
            wipeMask = l1.w;
          } else {
            // === PALIERS MEDIUM & HIGH : gouttes principales avec sillages ===
            vec4 l1 = rainDropLayer(dropUv, t, baseScale, 1.7, true);
            accumNorm = l1.xy;
            dropMask = l1.z;
            wipeMask = l1.w;

            if (uQualityLevel >= 2) {
              // Seconde strate plus fine et légèrement plus lente pour la profondeur optique
              vec4 l2 = rainDropLayer(dropUv + vec2(0.37, -0.19), t * 0.78, baseScale * 1.65, 29.3, true);
              if (l2.z > dropMask) {
                accumNorm = mix(accumNorm, l2.xy, 0.8);
                dropMask = max(dropMask, l2.z * 0.88);
              } else {
                accumNorm += l2.xy * 0.35;
              }
              wipeMask = max(wipeMask, l2.w * 0.85);

              // Micro-gouttelettes statiques sur le verre (essuyées par les coulures)
              vec3 micro = staticMicroDrops(dropUv + vec2(0.11, 0.23), t, baseScale * 5.2);
              float microVisible = micro.z * (1.0 - wipeMask * 0.92) * (0.32 + 0.68 * edgeFocus);
              if (microVisible > dropMask * 0.65) {
                accumNorm = mix(accumNorm, micro.xy, 0.65);
                dropMask = max(dropMask, microVisible * 0.72);
              }
            }

            dropMask *= dropRegionMask;
          }

          // Buée / condensation périphérique douce (essuyée par le passage des gouttes)
          float condMask = 0.0;
          if (uCondensation > 0.005) {
            float edgeCond = smoothstep(0.36, 1.12, radialCenter);
            float fogTex = 0.72;
            if (uQualityLevel >= 2) {
              float n1 = snoise(p * 2.8 + vec2(t * 0.015, -t * 0.01)) * 0.5 + 0.5;
              float n2 = snoise(p * 6.4 - vec2(1.7, t * 0.02)) * 0.5 + 0.5;
              fogTex = mix(0.55, 1.15, n1 * 0.68 + n2 * 0.32);
            } else if (uQualityLevel == 1) {
              fogTex = mix(0.65, 1.05, snoise(p * 3.0) * 0.5 + 0.5);
            }
            condMask = edgeCond * fogTex * clamp(uCondensation, 0.0, 0.6) * (1.0 - wipeMask * 0.78);
          }

          if (dropMask <= 0.004 && condMask <= 0.004) {
            discard;
          }

          vec3 colTint = uUseCustomColors ? uTintColor : uPalettePrimary;
          vec3 colHi = uUseCustomColors ? uHighlightColor : uPaletteAccent;

          // Optique convexe de la goutte : normale hémisphérique + caustique interne + spéculaire
          float r2 = clamp(dot(accumNorm, accumNorm), 0.0, 0.99);
          float nz = sqrt(max(0.01, 1.0 - r2));
          vec3 N = normalize(vec3(accumNorm, nz));

          vec3 lightDir = normalize(vec3(
            -0.38 + uMouse.x * uDepth * 0.75,
            0.58 + uMouse.y * uDepth * 0.55,
            0.88
          ));
          vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));

          // Reflet spéculaire net (éclat de verre mouillé)
          float spec = pow(max(0.0, dot(N, halfVec)), 34.0) * 1.45;
          // Caustique interne inversée dans le croissant inférieur de la goutte
          float bottomCaustic = smoothstep(0.05, 0.82, -N.y) * smoothstep(0.15, 0.85, dropMask) * 0.78;
          // Bord Fresnel fin autour de la goutte + légère ombre supérieure pour le volume 3D
          float fresnel = pow(1.0 - max(0.0, N.z), 2.4) * 0.65;
          float upperShade = smoothstep(0.15, 0.85, N.y) * 0.35;

          vec3 dropCol = mix(colTint * 0.45, colTint * 0.95, 1.0 - upperShade);
          dropCol += colHi * (bottomCaustic * 0.85 + fresnel * 0.55);
          dropCol += mix(colHi, vec3(1.0), 0.65) * spec;

          // Composition de la buée périphérique et des gouttes réfractives
          vec3 condCol = mix(colTint * 0.85, colHi * 0.65 + colTint * 0.35, 0.25);
          float dropAlpha = clamp(dropMask * (0.34 + fresnel * 0.42 + bottomCaustic * 0.35 + spec * 0.55) * uIntensity, 0.0, 0.88);
          float condAlpha = clamp(condMask * (0.65 + 0.35 * uIntensity), 0.0, 0.42);

          float totalAlpha = clamp(condAlpha + dropAlpha * (1.0 - condAlpha * 0.35), 0.0, 0.88);
          if (totalAlpha <= 0.004) {
            discard;
          }

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

export const WindowRainDefinition: IBrickDefinition<WindowRainProps> = {
  type: 'window_rain',
  category: 'overlay',
  create: (id, props, context) => new WindowRainInstance(id, props, context),
}

BrickRegistry.register(WindowRainDefinition)
