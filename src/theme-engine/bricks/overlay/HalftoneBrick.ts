/**
 * src/theme-engine/bricks/overlay/HalftoneBrick.ts
 *
 * Brique de style et d'overlay : Trame Comics & Demi-teintes Pop Art (Couche 5 : Overlay).
 * Rendu d'imprimerie offset vintage et bande dessinée :
 * - Points inclinés à 45 degrés dont le diamètre suit la luminance réelle de la scène (FramebufferTexture)
 * - Décalage angulaire et spatial des couches de couleur CMJN (misregistration d'imprimerie)
 * - Texture fibreuse de papier presse mat ancrée dans l'espace écran (HIGH)
 * - Bords imprimés réalistes avec micro-rugosité capillaire et anneau de séchage d'encre
 * - Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Trame Comics (Halftone).
 */
export interface HalftoneProps {
  /** Teinte de l'encre d'impression (défaut noir d'imprimerie '#000000'). */
  dotColor?: string
  /** Densité et compacité de la grille de points (0.4 à 3.0, défaut 1.2). */
  density?: number
  /** Vitesse de pulsation et d'ondulation cinétique de la trame (0.0 à 1.5, défaut 0.2). */
  speed?: number
  /** Profondeur et sensibilité de la trame à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Intensité et contraste de l'encrage des points (0.1 à 1.0, défaut 0.5). */
  intensity?: number
  /** Facteur de bavure d'encre et irrégularité organique de papier (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Angle d'inclinaison de la trame en radians (défaut 0.785398 = 45 degrés). */
  patternAngle?: number
  /** Rayon de base des points de trame (0.1 à 0.85, défaut 0.45). */
  dotRadius?: number
  /** Décalage des couches couleur CMJN type imprimerie (0.0 à 1.0, défaut 0.45). */
  colorOffset?: number
  /** Grain fibreux du papier et rugosité des bords imprimés (0.0 à 1.0, défaut 0.35). */
  paperTexture?: number
}

export class HalftoneInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'halftone'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: HalftoneProps
  private dotColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: HalftoneProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.dotColorVec = new THREE.Color(props.dotColor ?? '#000000')

    const density = props.density ?? 1.2
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 0.5
    const randomness = props.randomness ?? 0.3
    const patternAngle = props.patternAngle ?? 0.785398
    const dotRadius = props.dotRadius ?? 0.45
    const colorOffset = props.colorOffset ?? 0.45
    const paperTexture = props.paperTexture ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uDotColor: { value: this.dotColorVec },
        uUseCustomColor: { value: Boolean(props.dotColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uPatternAngle: { value: patternAngle },
        uDotRadius: { value: dotRadius },
        uColorOffset: { value: colorOffset },
        uPaperTexture: { value: paperTexture },
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
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uDotColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uPatternAngle;
        uniform float uDotRadius;
        uniform float uColorOffset;
        uniform float uPaperTexture;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        // Calcule pour une grille tournée : (distance au centre du point, couleur échantillonnée au centre de la cellule)
        vec4 sampleHalftoneCell(vec2 px, float angle, float cellSize, vec2 shiftPx, vec2 mouseOff, vec2 res) {
          float s = sin(angle);
          float c = cos(angle);
          mat2 rot = mat2(c, -s, s, c);
          mat2 invRot = mat2(c, s, -s, c);

          vec2 rotatedPos = rot * (px + shiftPx);
          vec2 cellId = floor(rotatedPos / cellSize);
          vec2 cellUv = fract(rotatedPos / cellSize) - 0.5;
          float dist = length(cellUv);

          vec2 cellCenterPx = invRot * ((cellId + 0.5) * cellSize) - shiftPx;
          vec2 sampleUv = clamp((cellCenterPx - mouseOff) / res, vec2(0.001), vec2(0.999));
          vec3 col = unpremultiply(texture2D(uScreenTex, sampleUv));
          return vec4(dist, col);
        }

        // Masque de point avec bords imprimés (rugosité papier + léger anneau de séchage d'encre)
        vec2 evalPrintedDot(float dist, float targetR, float aa, float edgeRough) {
          float rFinal = clamp(targetR + edgeRough, 0.02, 0.52);
          float core = smoothstep(rFinal + aa, rFinal - aa, dist);
          // Léger bourrelet d'encre sur le pourtour du point pressé sur le papier
          float inkRim = smoothstep(rFinal + aa * 1.4, rFinal - aa * 0.3, dist)
                       * (1.0 - smoothstep(rFinal - aa * 0.2, rFinal - aa * 2.2, dist));
          return vec2(core, inkRim);
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          vec2 px = uv * res;

          // Parallaxe souris
          vec2 mouseOffset = uMouse * (uDepth * 20.0);
          px += mouseOffset;

          // Calibre d'une cellule de trame en pixels CSS
          float cellSize = clamp(14.5 / max(0.25, uDensity), 5.0, 34.0);

          // Onde cinétique douce + légère dilatation sous le curseur
          vec2 centerDist = uv - 0.5;
          float radialDist = length(centerDist);
          float kineticWave = uSpeed > 0.001 ? sin(radialDist * 8.5 - uTime * uSpeed * 2.2) * 0.035 : 0.0;
          vec2 mouseNorm = uMouse * 0.5 + 0.5;
          float distToMouse = length(uv - mouseNorm);
          float mouseBulge = exp(-distToMouse * 5.0) * (uDepth * 0.08);

          if (uHasScreenTex && uQualityLevel >= 1) {
            // === PALIERS HIGH & MEDIUM : Trame pilotée par luminance + couches couleur décalées ===
            vec4 centerSample = texture2D(uScreenTex, uv);
            vec3 baseScene = unpremultiply(centerSample);

            // Texture de papier statique ancrée à la page (HIGH)
            float paperNoise = 0.0;
            float inkEdgeRough = 0.0;
            if (uQualityLevel >= 2) {
              float fiber1 = snoise(px * 0.22);
              float fiber2 = snoise(px * 0.65 + vec2(17.3, 9.1));
              paperNoise = fiber1 * 0.62 + fiber2 * 0.38;
              inkEdgeRough = paperNoise * (0.042 * uPaperTexture + 0.032 * uRandomness);
            }

            // Légère éclaircie chaude façon papier imprimé pour que les points sombres se détachent même en basse lumière
            vec3 paperTint = vec3(0.97, 0.94, 0.88);
            vec3 paperBase = mix(baseScene, max(baseScene, vec3(0.06)) * 1.18 + paperTint * 0.045, clamp(uIntensity * 0.45, 0.0, 0.55));
            if (uQualityLevel >= 2 && uPaperTexture > 0.01) {
              paperBase *= 1.0 + paperNoise * (0.045 * uPaperTexture);
            }

            // 1. Couche principale d'encre (45° par défaut) : la taille du point suit l'obscurité (1 - luma)
            vec4 kSample = sampleHalftoneCell(px, uPatternAngle, cellSize, vec2(0.0), mouseOffset, res);
            float kLuma = dot(kSample.yzw, vec3(0.299, 0.587, 0.114));
            float kDarkness = clamp(1.0 - kLuma, 0.0, 1.0);
            float kRadius = clamp((0.07 + pow(kDarkness, 0.85) * 0.82) * uDotRadius + kineticWave + mouseBulge, 0.03, 0.48);

            float aa = clamp(1.35 / cellSize, 0.025, 0.08);
            vec2 kDot = evalPrintedDot(kSample.x, kRadius, aa, inkEdgeRough);
            float kMask = kDot.x;
            float kRim = kDot.y;

            vec3 printedCol = paperBase;

            if (uQualityLevel >= 2) {
              // 2. Couches Cyan (+30° soit 75°) et Magenta (-30° soit 15°) avec décalage d'imprimerie (misregistration)
              float misregPx = cellSize * 0.22 * clamp(uColorOffset, 0.0, 1.0);
              vec2 cShift = vec2(misregPx, -misregPx * 0.65);
              vec2 mShift = vec2(-misregPx * 0.85, misregPx * 0.75);

              vec4 cSample = sampleHalftoneCell(px, uPatternAngle + 0.523599, cellSize * 0.98, cShift, mouseOffset, res);
              vec4 mSample = sampleHalftoneCell(px, uPatternAngle - 0.523599, cellSize * 0.98, mShift, mouseOffset, res);

              // Densités d'encre Cyan (1 - R) et Magenta (1 - G)
              float cDensity = clamp(1.0 - cSample.y, 0.0, 1.0);
              float mDensity = clamp(1.0 - mSample.z, 0.0, 1.0);

              float cRadius = clamp((0.05 + cDensity * 0.76) * uDotRadius + kineticWave * 0.6, 0.02, 0.46);
              float mRadius = clamp((0.05 + mDensity * 0.76) * uDotRadius + kineticWave * 0.6, 0.02, 0.46);

              vec2 cDot = evalPrintedDot(cSample.x, cRadius, aa, inkEdgeRough * 0.8);
              vec2 mDot = evalPrintedDot(mSample.x, mRadius, aa, inkEdgeRough * 0.8);

              // Absorption soustractive douce des encres Cyan et Magenta sur le papier
              float cInkStrength = clamp(uColorOffset * 0.62 * uIntensity, 0.0, 0.65);
              float mInkStrength = clamp(uColorOffset * 0.62 * uIntensity, 0.0, 0.65);
              printedCol *= mix(vec3(1.0), vec3(0.28, 0.86, 0.98), cDot.x * cInkStrength);
              printedCol *= mix(vec3(1.0), vec3(0.96, 0.30, 0.72), mDot.x * mInkStrength);

              // Légère bavure d'encre imprimée sur les bords des points
              printedCol = mix(printedCol, printedCol * 0.78, (kRim + (cDot.y + mDot.y) * 0.35) * 0.25 * uPaperTexture);
            } else {
              // MEDIUM : 1 couche couleur décalée légère en plus du noir 45°
              float misregPx = cellSize * 0.18 * clamp(uColorOffset, 0.0, 1.0);
              vec4 cSample = sampleHalftoneCell(px, uPatternAngle + 0.523599, cellSize, vec2(misregPx, -misregPx * 0.6), mouseOffset, res);
              float cDensity = clamp(1.0 - cSample.y, 0.0, 1.0);
              float cRadius = clamp((0.05 + cDensity * 0.74) * uDotRadius, 0.02, 0.46);
              float cMask = smoothstep(cRadius + aa, cRadius - aa, cSample.x);
              printedCol *= mix(vec3(1.0), vec3(0.32, 0.85, 0.96), cMask * clamp(uColorOffset * 0.5 * uIntensity, 0.0, 0.55));
            }

            // Application de l'encre principale (45°) : dotColor ou noir d'imprimerie profond
            vec3 inkTone = uUseCustomColor ? uDotColor : vec3(0.03, 0.03, 0.045);
            // Préservation douce de la lisibilité au centre tout en gardant la trame présente
            float centerFocus = mix(0.68, 1.0, smoothstep(0.10, 0.56, radialDist));
            float kInkAlpha = clamp(kMask * (0.42 + uIntensity * 0.52) * centerFocus, 0.0, 0.88);
            printedCol = mix(printedCol, inkTone, kInkAlpha);

            // Bords imprimés façon presse (légère patine/marge en périphérie)
            if (uQualityLevel >= 2 && uPaperTexture > 0.01) {
              float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
              float pressEdge = 1.0 - smoothstep(0.0, 0.035 + paperNoise * 0.012, edgeDist);
              printedCol = mix(printedCol, inkTone * 0.8 + vec3(0.08, 0.07, 0.05), pressEdge * 0.35 * uPaperTexture);
            }

            vec3 outCol = mix(baseScene, printedCol, clamp(uIntensity * 1.15, 0.0, 1.0));
            float outAlpha = clamp(max(centerSample.a, kInkAlpha * 0.7), 0.0, 1.0);
            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Grille orthogonale inclinée à 45° ultra-rapide (0 copie FBO) ===
          float s = sin(uPatternAngle);
          float c = cos(uPatternAngle);
          vec2 rotatedPos = mat2(c, -s, s, c) * px;
          vec2 cellUv = fract(rotatedPos / cellSize) - 0.5;
          float distToDotCenter = length(cellUv);
          float targetRadius = clamp(uDotRadius * 0.45 + mouseBulge, 0.05, 0.45);
          float dotMask = distToDotCenter < targetRadius ? 1.0 : 0.0;

          float alpha = clamp(dotMask * uIntensity * 0.55, 0.0, 0.75);
          if (alpha <= 0.005) discard;

          gl_FragColor = vec4(uDotColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 95 // Couche 5 (Overlay)

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

  public updateProps(newProps: Partial<HalftoneProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.dotColor !== undefined) {
      this.dotColorVec.set(newProps.dotColor)
      this.material.uniforms.uDotColor.value = this.dotColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.patternAngle !== undefined)
      this.material.uniforms.uPatternAngle.value = newProps.patternAngle
    if (newProps.dotRadius !== undefined)
      this.material.uniforms.uDotRadius.value = newProps.dotRadius
    if (newProps.colorOffset !== undefined)
      this.material.uniforms.uColorOffset.value = newProps.colorOffset
    if (newProps.paperTexture !== undefined)
      this.material.uniforms.uPaperTexture.value = newProps.paperTexture
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    if (!this.material) return
    const tierVal = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    this.material.uniforms.uQualityLevel.value = tierVal

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

export const HalftoneDefinition: IBrickDefinition<HalftoneProps> = {
  type: 'halftone',
  category: 'overlay',
  create: (id, props, context) => new HalftoneInstance(id, props, context),
}

export const HalftoneAliasDefinition: IBrickDefinition<HalftoneProps> = {
  type: 'comic_halftone',
  category: 'overlay',
  create: (id, props, context) => new HalftoneInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(HalftoneDefinition)
BrickRegistry.register(HalftoneAliasDefinition)
