/**
 * src/theme-engine/bricks/overlay/VignetteBrick.ts
 *
 * Brique de style et d'overlay : Vignettage Optique & Pénombre Radiale (Couche 5 : Overlay).
 * Rendu procédural réaliste de l'atténuation d'un objectif cinéma (loi cos^4(theta) douce) :
 * - Vignettage asymétrique (décentrement souris + asymétrie optique directionnelle + Simplex)
 * - Décroissance très douce sans bord dur
 * - Respiration organique multi-harmonique apériodique du diaphragme
 * - Teinte colorée profonde plutôt que noir pur (dérivée de la palette ou personnalisée)
 * - Léger flou optique progressif des bords vers la périphérie (HIGH & MEDIUM via FramebufferTexture)
 * - Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Vignettage.
 */
export interface VignetteProps {
  /** Teinte de la pénombre périphérique (défaut bleu nuit profond '#080c1c' dérivé de la palette). */
  vignetteColor?: string
  /** Densité et compacité du cône central de clarté (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de respiration organique feutrée du diaphragme (0.0 à 1.0, défaut 0.15). */
  speed?: number
  /** Profondeur et sensibilité du décentrement optique à la souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Intensité et opacité maximale aux bordures et coins (0.1 à 1.0, défaut 0.6). */
  intensity?: number
  /** Asymétrie organique de lentille et turbulence Simplex (0.0 à 1.0, défaut 0.2). */
  randomness?: number
  /** Forme de l'ouverture : 0.0 = épouse le ratio de l'écran, 1.0 = cercle optique parfait (défaut 0.65). */
  roundness?: number
  /** Progressivité et douceur de la transition vers la pénombre (0.2 à 1.5, défaut 0.85). */
  smoothness?: number
  /** Intensité du léger flou optique sur les bords (0.0 à 1.0, défaut 0.45). */
  edgeBlur?: number
  /** Amplitude du léger effet de respiration du diaphragme (0.0 à 1.5, défaut 0.5). */
  breathAmount?: number
}

export class VignetteInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'vignette'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: VignetteProps
  private vignetteColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: VignetteProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.vignetteColorVec = new THREE.Color(props.vignetteColor ?? '#080c1c')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.15
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 0.6
    const randomness = props.randomness ?? 0.2
    const roundness = props.roundness ?? 0.65
    const smoothness = props.smoothness ?? 0.85
    const edgeBlur = props.edgeBlur ?? 0.45
    const breathAmount = props.breathAmount ?? 0.5

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uVignetteColor: { value: this.vignetteColorVec },
        uUseCustomColor: { value: Boolean(props.vignetteColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uRoundness: { value: roundness },
        uSmoothness: { value: smoothness },
        uEdgeBlur: { value: edgeBlur },
        uBreathAmount: { value: breathAmount },
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
          // Couche d'overlay en premier plan immédiat (z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uVignetteColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uRoundness;
        uniform float uSmoothness;
        uniform float uEdgeBlur;
        uniform float uBreathAmount;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          float aspect = res.x / res.y;

          // Décentrement optique lié à la parallaxe souris + légère asymétrie naturelle d'objectif
          vec2 asymCenter = vec2(0.022, -0.016) * uRandomness;
          vec2 center = vec2(0.5) + uMouse * (uDepth * 0.12) + asymCenter;
          vec2 delta = uv - center;

          // Interpolation géométrique entre cercle optique pur et ellipse ratio écran
          vec2 circleCoord = delta * vec2(aspect, 1.0);
          vec2 ellipseCoord = delta * vec2(1.18, 1.0);
          vec2 coord = mix(ellipseCoord, circleCoord, clamp(uRoundness, 0.0, 1.0));

          // Respiration organique multi-harmonique apériodique du diaphragme
          float bt = uTime * max(0.0, uSpeed);
          float breath = (
            sin(bt * 1.45) * 0.55 +
            sin(bt * 2.31 + 1.27) * 0.30 +
            sin(bt * 0.73 + 2.61) * 0.15
          ) * 0.042 * uBreathAmount;

          // Asymétrie directionnelle (cat's-eye optique)
          float dirAsym = (coord.x * 0.11 - coord.y * 0.085) * uRandomness;
          float dist = length(coord) + dirAsym;

          if (uQualityLevel >= 2) {
            vec2 noiseCoord = coord * 1.9 + vec2(sin(bt * 0.65), cos(bt * 0.48));
            float lensNoise = snoise(noiseCoord) * (uRandomness * 0.085);
            dist += lensNoise;
          }
          dist = max(0.0, dist);

          // Courbe optique cos^4(theta) très douce sans cassure de gradient
          float innerR = max(0.05, (0.42 / max(0.2, uDensity)) + breath);
          float span = max(0.25, uSmoothness * 0.78);
          float tNorm = clamp((dist - innerR) / span, 0.0, 2.0);
          float cosTheta = 1.0 / sqrt(1.0 + tNorm * tNorm * 1.35);
          float cos4Falloff = 1.0 - pow(cosTheta, 4.0);
          float smoothEase = smoothstep(0.0, 0.32, tNorm);
          float factor = clamp(cos4Falloff * mix(0.35, 1.0, smoothEase), 0.0, 1.0);
          float vigAlpha = clamp(factor * uIntensity, 0.0, 0.96);

          // Teinte colorée profonde plutôt que noir pur
          vec3 defaultTint = mix(vec3(0.032, 0.048, 0.115), uPaletteSecondary * 0.30 + vec3(0.02, 0.028, 0.065), 0.45);
          vec3 baseTint = uUseCustomColor ? uVignetteColor : defaultTint;

          // Subtile nuance chromatique en bordure de pénombre pour éviter un gris/noir plat
          float penumbraBand = smoothstep(0.05, 0.45, factor) * (1.0 - smoothstep(0.55, 1.0, factor));
          vec3 shadowTint = mix(baseTint, baseTint + vec3(0.045, 0.026, 0.068), penumbraBand * 0.42);

          if (uHasScreenTex && uQualityLevel >= 1) {
            vec2 texel = 1.0 / res;
            float blurPx = vigAlpha * clamp(uEdgeBlur, 0.0, 1.0) * (uQualityLevel >= 2 ? 5.2 : 3.2);

            vec4 sceneCenter = texture2D(uScreenTex, uv);
            vec4 blurredSample = sceneCenter;

            if (blurPx > 0.25) {
              vec2 r = texel * blurPx;
              if (uQualityLevel >= 2) {
                // Disque optique 8 taps + centre pour un flou de lentille doux et homogène
                vec4 sum = sceneCenter * 0.20;
                sum += texture2D(uScreenTex, clamp(uv + vec2( r.x,  0.0), vec2(0.001), vec2(0.999))) * 0.11;
                sum += texture2D(uScreenTex, clamp(uv + vec2(-r.x,  0.0), vec2(0.001), vec2(0.999))) * 0.11;
                sum += texture2D(uScreenTex, clamp(uv + vec2( 0.0,  r.y), vec2(0.001), vec2(0.999))) * 0.11;
                sum += texture2D(uScreenTex, clamp(uv + vec2( 0.0, -r.y), vec2(0.001), vec2(0.999))) * 0.11;
                vec2 diag = r * 0.7071;
                sum += texture2D(uScreenTex, clamp(uv + vec2( diag.x,  diag.y), vec2(0.001), vec2(0.999))) * 0.09;
                sum += texture2D(uScreenTex, clamp(uv + vec2(-diag.x,  diag.y), vec2(0.001), vec2(0.999))) * 0.09;
                sum += texture2D(uScreenTex, clamp(uv + vec2( diag.x, -diag.y), vec2(0.001), vec2(0.999))) * 0.09;
                sum += texture2D(uScreenTex, clamp(uv + vec2(-diag.x, -diag.y), vec2(0.001), vec2(0.999))) * 0.09;
                blurredSample = sum;
              } else {
                // 4 taps croisés + centre en MEDIUM
                vec4 sum = sceneCenter * 0.36;
                sum += texture2D(uScreenTex, clamp(uv + vec2( r.x,  r.y) * 0.7071, vec2(0.001), vec2(0.999))) * 0.16;
                sum += texture2D(uScreenTex, clamp(uv + vec2(-r.x,  r.y) * 0.7071, vec2(0.001), vec2(0.999))) * 0.16;
                sum += texture2D(uScreenTex, clamp(uv + vec2( r.x, -r.y) * 0.7071, vec2(0.001), vec2(0.999))) * 0.16;
                sum += texture2D(uScreenTex, clamp(uv + vec2(-r.x, -r.y) * 0.7071, vec2(0.001), vec2(0.999))) * 0.16;
                blurredSample = sum;
              }
            }

            float sceneAlpha = blurredSample.a;
            vec3 sceneCol = sceneAlpha > 0.002 ? blurredSample.rgb / sceneAlpha : vec3(0.0);

            // Assombrissement optique teinté qui préserve la richesse des lumières périphériques
            vec3 multiplied = sceneCol * mix(vec3(1.0), shadowTint * 1.45 + vec3(0.06), vigAlpha);
            vec3 outCol = mix(multiplied, shadowTint, vigAlpha * 0.58);
            float outAlpha = clamp(max(sceneAlpha, vigAlpha), 0.0, 1.0);

            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Dégradé radial coloré léger sans copie framebuffer ni flou ===
          if (vigAlpha <= 0.004) discard;
          gl_FragColor = vec4(baseTint, vigAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 92 // Couche 5 (Overlay)

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

  public updateProps(newProps: Partial<VignetteProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.vignetteColor !== undefined) {
      this.vignetteColorVec.set(newProps.vignetteColor)
      this.material.uniforms.uVignetteColor.value = this.vignetteColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.roundness !== undefined)
      this.material.uniforms.uRoundness.value = newProps.roundness
    if (newProps.smoothness !== undefined)
      this.material.uniforms.uSmoothness.value = newProps.smoothness
    if (newProps.edgeBlur !== undefined) this.material.uniforms.uEdgeBlur.value = newProps.edgeBlur
    if (newProps.breathAmount !== undefined)
      this.material.uniforms.uBreathAmount.value = newProps.breathAmount
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

export const VignetteDefinition: IBrickDefinition<VignetteProps> = {
  type: 'vignette',
  category: 'overlay',
  create: (id, props, context) => new VignetteInstance(id, props, context),
}

export const VignetteAliasDefinition: IBrickDefinition<VignetteProps> = {
  type: 'vignettage',
  category: 'overlay',
  create: (id, props, context) => new VignetteInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(VignetteDefinition)
BrickRegistry.register(VignetteAliasDefinition)
