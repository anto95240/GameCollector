/**
 * src/theme-engine/bricks/overlay/PixelationBrick.ts
 *
 * Brique de style et d'overlay : Pixellisation Rétro & Mosaïque Numérique (Couche 5 : Overlay).
 * Rendu authentique de console rétro 8-bit / 16-bit / LCD portable :
 * - Quantification réelle de la scène capturée via FramebufferTexture (HIGH & MEDIUM)
 * - Pixels carrés de taille cohérente en pixels CSS (indépendants du DPR) avec sous-échantillonnage
 *   anti-scintillement (box filter 4 points en HIGH)
 * - Palette limitée par quantification de canaux + matrice de tramage ordonné de Bayer 4x4 (HIGH)
 *   ou 2x2 (MEDIUM) évaluée par bloc pour des dégradés rétro authentiques
 * - Transitions douces autour de la loupe de focus interactive (souris) et morphing doux
 * - Scanlines horizontales légères, biseau LCD subtil et gigue temporelle discrète
 * - Palier LOW sans copie FBO pour préserver 100 % des FPS mobiles.
 */

import * as THREE from 'three'

import { GLSL_HASH } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Pixelisation.
 */
export interface PixelationProps {
  /** Teinte de la trame de mosaïque, des scanlines et joints de pixels (défaut noir '#000000'). */
  tintColor?: string
  /** Échelle et finesse de la grille de blocs (0.3 à 3.0, défaut 1.0). */
  density?: number
  /** Vitesse de pulsation ou balayage temporel rétro (0.0 à 2.0, défaut 0.25). */
  speed?: number
  /** Rayon de la zone nette de focus interactif sous le curseur souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Intensité et force de la pixellisation et du tramage (0.1 à 1.0, défaut 0.65). */
  intensity?: number
  /** Gigue stochastique et instabilité de blocs rétro (0.0 à 1.0, défaut 0.2). */
  randomness?: number
  /** Taille unitaire nominale d'un bloc de pixel en px CSS (2.0 à 32.0, défaut 8.0). */
  pixelSize?: number
  /** Force du tramage ordonné de Bayer rétro (0.0 à 1.0, défaut 0.35). */
  ditherStrength?: number
  /** Nombre de niveaux de quantification par canal RVB pour simuler une palette limitée (2.0 à 16.0, défaut 6.0). */
  colorDepth?: number
  /** Intensité des scanlines rétro légères sur la grille de pixels (0.0 à 0.6, défaut 0.18). */
  scanlineStrength?: number
  /** Douceur de la transition entre zone nette et zone pixellisée (0.0 à 1.0, défaut 0.35). */
  smoothTransition?: number
}

export class PixelationInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'pixelation'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: PixelationProps
  private tintColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: PixelationProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.tintColorVec = new THREE.Color(props.tintColor ?? '#000000')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 0.65
    const randomness = props.randomness ?? 0.2
    const pixelSize = props.pixelSize ?? 8.0
    const ditherStrength = props.ditherStrength ?? 0.35
    const colorDepth = props.colorDepth ?? 6.0
    const scanlineStrength = props.scanlineStrength ?? 0.18
    const smoothTransition = props.smoothTransition ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uTintColor: { value: this.tintColorVec },
        uUseCustomColor: { value: Boolean(props.tintColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uPixelSize: { value: pixelSize },
        uDitherStrength: { value: ditherStrength },
        uColorDepth: { value: colorDepth },
        uScanlineStrength: { value: scanlineStrength },
        uSmoothTransition: { value: smoothTransition },
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
          // Overlay premier plan immédiat (z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uTintColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uPixelSize;
        uniform float uDitherStrength;
        uniform float uColorDepth;
        uniform float uScanlineStrength;
        uniform float uSmoothTransition;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        // Matrice de Bayer 4x4 ordonnée pour dithering rétro authentique
        float getBayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int index = x + y * 4;

          if (index == 0) return 0.0 / 16.0;
          if (index == 1) return 8.0 / 16.0;
          if (index == 2) return 2.0 / 16.0;
          if (index == 3) return 10.0 / 16.0;
          if (index == 4) return 12.0 / 16.0;
          if (index == 5) return 4.0 / 16.0;
          if (index == 6) return 14.0 / 16.0;
          if (index == 7) return 6.0 / 16.0;
          if (index == 8) return 3.0 / 16.0;
          if (index == 9) return 11.0 / 16.0;
          if (index == 10) return 1.0 / 16.0;
          if (index == 11) return 9.0 / 16.0;
          if (index == 12) return 15.0 / 16.0;
          if (index == 13) return 7.0 / 16.0;
          if (index == 14) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          // Coordonnées cohérentes en pixels CSS (indépendantes du DPR)
          vec2 px = uv * res;

          // Taille cohérente du pixel rétro (entière pour éviter les franges moirées)
          float rawSize = clamp(uPixelSize / clamp(uDensity, 0.3, 3.0), 2.0, 48.0);
          float effectivePixelSize = max(2.0, floor(rawSize + 0.5));

          // Zone de focus interactive sous le curseur souris avec transition douce réglable
          vec2 mousePx = (uMouse * 0.5 + 0.5) * res;
          float distToMouse = length(px - mousePx);
          float focusRadius = 210.0 * clamp(uDepth, 0.0, 1.2);
          float feather = mix(0.25, 0.85, clamp(uSmoothTransition, 0.0, 1.0));
          float focusFactor = uDepth <= 0.01
            ? 1.0
            : smoothstep(focusRadius * (1.0 - feather), focusRadius * (1.0 + feather * 0.35), distToMouse);

          // Grille stricte de blocs pixels carrés
          vec2 blockId = floor(px / effectivePixelSize);
          vec2 inBlock = fract(px / effectivePixelSize);

          if (uHasScreenTex && uQualityLevel >= 1) {
            vec4 sharpSample = texture2D(uScreenTex, uv);
            vec3 sharpCol = unpremultiply(sharpSample);

            // Transition progressive de l'effet (force + loupe de netteté)
            float pixMix = clamp(uIntensity * 1.15, 0.0, 1.0) * focusFactor;
            if (pixMix <= 0.002) {
              gl_FragColor = sharpSample;
              return;
            }

            // Légère micro-instabilité de bloc optionnelle si randomness > 0
            vec2 jitterOffset = vec2(0.0);
            if (uQualityLevel >= 2 && uRandomness > 0.01 && uSpeed > 0.001) {
              float tick = floor(uTime * max(0.1, uSpeed) * 8.0);
              float blockRand = hash12(blockId + vec2(tick * 1.37, tick * 0.71));
              float glitchGate = step(1.0 - uRandomness * 0.04, blockRand);
              jitterOffset.x = (hash12(blockId + tick) - 0.5) * 2.0 * glitchGate * effectivePixelSize;
            }

            vec2 blockCenterPx = (blockId + 0.5) * effectivePixelSize + jitterOffset;
            vec2 blockUv = clamp(blockCenterPx / res, vec2(0.001), vec2(0.999));

            vec3 pixCol;
            if (uQualityLevel >= 2) {
              // === PALIER HIGH : Sous-échantillonnage 4 points anti-scintillement + Bayer 4x4 ===
              vec2 qOff = (effectivePixelSize * 0.25) / res;
              vec3 s0 = unpremultiply(texture2D(uScreenTex, clamp(blockUv + vec2(-qOff.x, -qOff.y), vec2(0.001), vec2(0.999))));
              vec3 s1 = unpremultiply(texture2D(uScreenTex, clamp(blockUv + vec2( qOff.x, -qOff.y), vec2(0.001), vec2(0.999))));
              vec3 s2 = unpremultiply(texture2D(uScreenTex, clamp(blockUv + vec2(-qOff.x,  qOff.y), vec2(0.001), vec2(0.999))));
              vec3 s3 = unpremultiply(texture2D(uScreenTex, clamp(blockUv + vec2( qOff.x,  qOff.y), vec2(0.001), vec2(0.999))));
              pixCol = (s0 + s1 + s2 + s3) * 0.25;
            } else {
              // === PALIER MEDIUM : Échantillonnage direct du centre de bloc ===
              pixCol = unpremultiply(texture2D(uScreenTex, blockUv));
            }

            // Matrice de Bayer évaluée à l'échelle du bloc pixel (pas du pixel écran)
            float bayer = uQualityLevel >= 2
              ? getBayer4x4(blockId)
              : ((mod(blockId.x, 2.0) + mod(blockId.y, 2.0) * 2.0) + 0.5) / 4.0;

            // Subtile respiration temporelle de contraste sans clignotement brutal
            float pulse = sin(uTime * uSpeed * 1.4) * 0.025 * (uSpeed > 0.001 ? 1.0 : 0.0);

            // Quantification vers une palette limitée avec tramage ordonné de Bayer
            float levels = clamp(floor(uColorDepth + 0.5), 2.0, 24.0);
            float ditherAmp = clamp(uDitherStrength, 0.0, 1.0) * (1.25 / levels) + pulse;
            vec3 dithered = clamp(pixCol + (bayer - 0.5) * ditherAmp, 0.0, 1.0);
            vec3 quantized = floor(dithered * (levels - 1.0) + 0.5) / (levels - 1.0);

            // Mélange doux entre couleur continue sous-échantillonnée et palette tramée
            float quantBlend = mix(0.45, 1.0, clamp(uIntensity, 0.0, 1.0));
            vec3 retroCol = mix(pixCol, quantized, quantBlend);

            // Si une teinte personnalisée colorée (non noire) est fournie, harmonisation palette rétro
            float tintLum = dot(uTintColor, vec3(0.299, 0.587, 0.114));
            if (uUseCustomColor && tintLum > 0.04) {
              float luma = dot(retroCol, vec3(0.299, 0.587, 0.114));
              vec3 tintedPalette = mix(uTintColor * 0.22, mix(uTintColor, vec3(0.92, 0.96, 0.88), 0.55), luma);
              retroCol = mix(retroCol, tintedPalette, 0.52);
            }

            // Scanlines horizontales légères (douces, respectueuses de la lisibilité)
            float scanAmt = clamp(uScanlineStrength, 0.0, 0.6);
            if (scanAmt > 0.005) {
              float scanWave = 0.5 + 0.5 * cos((inBlock.y - 0.5) * 6.2831853);
              float scanFactor = mix(1.0 - scanAmt * 0.55, 1.0 + scanAmt * 0.08, scanWave);
              retroCol *= scanFactor;
            }

            // Biseau très discret entre pixels (effet grille LCD rétro en HIGH)
            if (uQualityLevel >= 2 && effectivePixelSize >= 4.0) {
              float borderDist = min(min(inBlock.x, 1.0 - inBlock.x), min(inBlock.y, 1.0 - inBlock.y));
              float groove = 1.0 - smoothstep(0.0, 0.09, borderDist);
              vec3 grooveTint = uUseCustomColor ? uTintColor : vec3(0.0);
              retroCol = mix(retroCol, grooveTint, groove * 0.16 * clamp(uIntensity, 0.0, 1.0));
            }

            // Transition douce entre scène nette et rendu pixellisé
            vec3 outCol = mix(sharpCol, retroCol, pixMix);
            float outAlpha = sharpSample.a;
            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Grille rétro + Bayer 2x2 + scanline légère sans copie FBO ===
          vec2 b2 = mod(blockId, 2.0);
          float bayer2 = (b2.x + b2.y * 2.0) / 4.0;
          float ditherMask = abs(bayer2 - 0.5) * uDitherStrength * 0.7;
          float borderDist = min(min(inBlock.x, 1.0 - inBlock.x), min(inBlock.y, 1.0 - inBlock.y));
          float joint = (1.0 - step(0.08, borderDist)) * 0.28;
          float scanLow = (1.0 - step(0.5, inBlock.y)) * clamp(uScanlineStrength, 0.0, 0.6) * 0.28;

          float lowAlpha = clamp((ditherMask + joint + scanLow) * uIntensity * focusFactor, 0.0, 0.75);
          if (lowAlpha <= 0.005) discard;
          gl_FragColor = vec4(uTintColor, lowAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 96 // Couche 5 (Overlay)

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

  public updateProps(newProps: Partial<PixelationProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.tintColor !== undefined) {
      this.tintColorVec.set(newProps.tintColor)
      this.material.uniforms.uTintColor.value = this.tintColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.pixelSize !== undefined)
      this.material.uniforms.uPixelSize.value = newProps.pixelSize
    if (newProps.ditherStrength !== undefined)
      this.material.uniforms.uDitherStrength.value = newProps.ditherStrength
    if (newProps.colorDepth !== undefined)
      this.material.uniforms.uColorDepth.value = newProps.colorDepth
    if (newProps.scanlineStrength !== undefined)
      this.material.uniforms.uScanlineStrength.value = newProps.scanlineStrength
    if (newProps.smoothTransition !== undefined)
      this.material.uniforms.uSmoothTransition.value = newProps.smoothTransition
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

export const PixelationDefinition: IBrickDefinition<PixelationProps> = {
  type: 'pixelation',
  category: 'overlay',
  create: (id, props, context) => new PixelationInstance(id, props, context),
}

export const PixelationAliasDefinition: IBrickDefinition<PixelationProps> = {
  type: 'pixelisation',
  category: 'overlay',
  create: (id, props, context) => new PixelationInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(PixelationDefinition)
BrickRegistry.register(PixelationAliasDefinition)
