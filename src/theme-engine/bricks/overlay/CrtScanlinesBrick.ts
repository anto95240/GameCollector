/**
 * src/theme-engine/bricks/overlay/CrtScanlinesBrick.ts
 *
 * Brique de style et d'overlay : Lignes de Balayage Cathodique & Rétro CRT (Couche 5 : Overlay).
 * Émulation réaliste d'un moniteur cathodique vintage (Sony Trinitron / borne d'arcade) :
 * - Courbure barillet réelle de l'image via FramebufferTexture + cadre arrondi doux
 * - Masque de phosphores RVB à conservation d'énergie (Aperture Grille)
 * - Bloom / halation des phosphores brillants et convergence chromatique en bord de tube
 * - Entrelacement des trames paires et impaires
 * - Scanlines modulées par la luminance (faisceau plus large sur les blancs)
 * - Barre de balayage descendante lente (phosphor roll) avec rémanence et micro-synchro
 * - Léger scintillement d'alimentation / 60Hz
 * - Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Scanlines CRT.
 */
export interface CrtScanlinesProps {
  /** Teinte des lignes d'interstice de balayage (défaut noir '#000000'). */
  scanlineColor?: string
  /** Densité et nombre de lignes horizontales à l'écran (0.3 à 3.0, défaut 1.0). */
  density?: number
  /** Vitesse de défilement vertical du faisceau de phosphore roll (0.0 à 2.0, défaut 0.3). */
  speed?: number
  /** Profondeur et sensibilité de la courbure 3D sous la parallaxe souris (0.0 à 1.0, défaut 0.25). */
  depth?: number
  /** Intensité et obscurcissement des lignes de trame (0.1 à 1.0, défaut 0.45). */
  intensity?: number
  /** Instabilité, micro-flicker 60Hz et gigue cathodique (0.0 à 1.0, défaut 0.25). */
  randomness?: number
  /** Courbure barillet bombée du verre cathodique (0.0 à 0.4, défaut 0.12). */
  curvature?: number
  /** Intensité de la barre lumineuse de balayage phosphor roll (0.0 à 0.4, défaut 0.15). */
  rollIntensity?: number
  /** Intensité du bloom / halo des phosphores lumineux (0.0 à 1.0, défaut 0.35). */
  bloomIntensity?: number
  /** Visibilité du masque de phosphores RVB (0.0 à 1.0, défaut 0.45). */
  phosphorStrength?: number
  /** Intensité de l'entrelacement entre trames paires et impaires (0.0 à 1.0, défaut 0.25). */
  interlaceStrength?: number
}

export class CrtScanlinesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'crt_scanlines'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: CrtScanlinesProps
  private scanlineColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: CrtScanlinesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.scanlineColorVec = new THREE.Color(props.scanlineColor ?? '#000000')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 0.45
    const randomness = props.randomness ?? 0.25
    const curvature = props.curvature ?? 0.12
    const rollIntensity = props.rollIntensity ?? 0.15
    const bloomIntensity = props.bloomIntensity ?? 0.35
    const phosphorStrength = props.phosphorStrength ?? 0.45
    const interlaceStrength = props.interlaceStrength ?? 0.25

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uScanlineColor: { value: this.scanlineColorVec },
        uUseCustomColor: { value: Boolean(props.scanlineColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uCurvature: { value: curvature },
        uRollIntensity: { value: rollIntensity },
        uBloomIntensity: { value: bloomIntensity },
        uPhosphorStrength: { value: phosphorStrength },
        uInterlaceStrength: { value: interlaceStrength },
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
          // Plan d'overlay en avant-scène immédiate (z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uScanlineColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uCurvature;
        uniform float uRollIntensity;
        uniform float uBloomIntensity;
        uniform float uPhosphorStrength;
        uniform float uInterlaceStrength;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));

          if (uHasScreenTex && uQualityLevel >= 1) {
            // === PALIERS HIGH & MEDIUM : Courbure réelle + Masque RVB + Bloom + Entrelacement ===
            vec2 mouseCenter = uMouse * (uDepth * 0.05);
            vec2 dc = (uv - 0.5) * 2.0;
            vec2 offset = dc - mouseCenter;
            float r2 = dot(offset, offset);

            // Déformation barillet réelle de l'écran CRT
            float curv = max(0.0, uCurvature);
            float warpScale = 1.0 + r2 * (curv * (uQualityLevel >= 2 ? 1.25 : 0.95));
            float normFactor = 1.0 + curv * 0.28;
            vec2 crtUv = (offset * warpScale / normFactor) * 0.5 + 0.5 + mouseCenter * 0.5;

            // Cadre arrondi doux du tube cathodique (SDF rounded box)
            float screenMask = 1.0;
            float bezelShade = 1.0;
            if (curv > 0.002) {
              float cornerR = clamp(curv * 0.22, 0.006, 0.045);
              vec2 q = abs(crtUv - 0.5) - vec2(0.5 - cornerR);
              float bezelDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cornerR;
              screenMask = 1.0 - smoothstep(-0.003, 0.004, bezelDist);
              bezelShade = smoothstep(0.0, -0.025, bezelDist);
            } else if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
              screenMask = 0.0;
            }

            if (screenMask <= 0.002) {
              gl_FragColor = vec4(0.012, 0.015, 0.020, 1.0);
              return;
            }

            // Barre de balayage qui descend lentement (de 1.0 en haut vers 0.0 en bas)
            float rollPos = 1.0 - fract(uTime * max(0.0, uSpeed) * 0.14);
            float dyDown = mod(crtUv.y - rollPos + 1.0, 1.0);
            float distToRoll = min(dyDown, 1.0 - dyDown);
            float rollCore = exp(-distToRoll * 18.0);
            // Traînée de persistance phosphorescente au-dessus de la barre descendante
            float rollTrail = smoothstep(0.18, 0.0, dyDown) * 0.42;
            float phosphorRoll = max(rollCore, rollTrail) * uRollIntensity;

            // Légère gigue horizontale de synchronisation au passage de la barre
            float rollSyncWobble = sin(dyDown * 42.0) * rollCore * uRollIntensity * 0.006;
            vec2 sUv = clamp(crtUv + vec2(rollSyncWobble, 0.0), vec2(0.001), vec2(0.999));

            // Échantillonnage de la scène avec légère aberration de convergence CRT vers les bords
            vec4 centerSample = texture2D(uScreenTex, sUv);
            vec3 sceneCol = unpremultiply(centerSample);
            if (uQualityLevel >= 2) {
              float edgeConv = r2 * (0.0012 + curv * 0.006);
              vec4 rSamp = texture2D(uScreenTex, clamp(sUv + vec2(edgeConv, 0.0), vec2(0.001), vec2(0.999)));
              vec4 bSamp = texture2D(uScreenTex, clamp(sUv - vec2(edgeConv, 0.0), vec2(0.001), vec2(0.999)));
              sceneCol.r = unpremultiply(rSamp).r;
              sceneCol.b = unpremultiply(bSamp).b;
            }

            // Bloom des phosphores lumineux (halation douce sur le verre CRT)
            vec3 bloomCol = vec3(0.0);
            if (uBloomIntensity > 0.01) {
              vec2 texel = 1.0 / res;
              vec2 bStep1 = texel * 2.4;
              vec3 bSum = vec3(0.0);
              vec3 s1 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2( bStep1.x, 0.0), vec2(0.001), vec2(0.999))));
              vec3 s2 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2(-bStep1.x, 0.0), vec2(0.001), vec2(0.999))));
              vec3 s3 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2(0.0,  bStep1.y), vec2(0.001), vec2(0.999))));
              vec3 s4 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2(0.0, -bStep1.y), vec2(0.001), vec2(0.999))));
              bSum += max(s1 - 0.25, 0.0) + max(s2 - 0.25, 0.0) + max(s3 - 0.25, 0.0) + max(s4 - 0.25, 0.0);

              if (uQualityLevel >= 2) {
                vec2 bStep2 = texel * 5.2;
                vec3 d1 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2( bStep2.x,  bStep2.y), vec2(0.001), vec2(0.999))));
                vec3 d2 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2(-bStep2.x,  bStep2.y), vec2(0.001), vec2(0.999))));
                vec3 d3 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2( bStep2.x, -bStep2.y), vec2(0.001), vec2(0.999))));
                vec3 d4 = unpremultiply(texture2D(uScreenTex, clamp(sUv + vec2(-bStep2.x, -bStep2.y), vec2(0.001), vec2(0.999))));
                bSum += (max(d1 - 0.22, 0.0) + max(d2 - 0.22, 0.0) + max(d3 - 0.22, 0.0) + max(d4 - 0.22, 0.0)) * 0.7;
                bloomCol = bSum * (0.14 * uBloomIntensity);
              } else {
                bloomCol = bSum * (0.20 * uBloomIntensity);
              }
            }

            // Scanlines horizontales + entrelacement des trames + modulation par luminance
            float lineCount = clamp(res.y * 0.36 * uDensity, 90.0, 540.0);
            float field = mod(floor(uTime * 30.0), 2.0);
            float interlaceOffset = (field - 0.5) * 0.35 * clamp(uInterlaceStrength, 0.0, 1.0);
            float linePhase = crtUv.y * lineCount + interlaceOffset;
            float scanWave = 0.5 + 0.5 * cos(linePhase * 6.2831853);

            // Faisceau plus large dans les zones lumineuses (effet halation scanline)
            float luma = dot(sceneCol, vec3(0.299, 0.587, 0.114));
            float beamExp = mix(1.85, 0.72, clamp(luma * 1.15, 0.0, 1.0));
            float beamProfile = pow(max(0.0, scanWave), beamExp);

            // Alternance douce de luminance entre lignes paires et impaires (entrelacement)
            float interlaceField = 1.0 - (0.09 * clamp(uInterlaceStrength, 0.0, 1.0)) *
              (0.5 + 0.5 * sin(crtUv.y * lineCount * 3.1415926 + field * 3.1415926));

            float scanDarkMin = 1.0 - clamp(uIntensity * 0.72, 0.05, 0.85);
            float scanGain = mix(scanDarkMin, 1.08, beamProfile) * interlaceField;

            // Masque de phosphores RVB (Aperture Grille Trinitron en HIGH)
            vec3 phosphorMask = vec3(1.0);
            if (uQualityLevel >= 2 && uPhosphorStrength > 0.01) {
              vec2 cssPx = crtUv * res;
              float subCol = mod(floor(cssPx.x), 3.0);
              // Conservation d'énergie : moyenne des 3 canaux = 1.0
              vec3 triad = subCol < 0.5
                ? vec3(1.48, 0.76, 0.76)
                : (subCol < 1.5 ? vec3(0.76, 1.48, 0.76) : vec3(0.76, 0.76, 1.48));
              // Légère grille de séparation slot-mask horizontale
              float slotSep = 0.92 + 0.08 * cos((cssPx.y + floor(cssPx.x / 3.0) * 1.5) * 2.09439);
              phosphorMask = mix(vec3(1.0), triad * slotSep, clamp(uPhosphorStrength, 0.0, 1.0));
            }

            // Léger scintillement 60Hz et ondulation d'alimentation
            float flickerSeed = floor(uTime * 60.0);
            float flicker = 1.0
              - (hash12(vec2(flickerSeed, flickerSeed * 1.618)) - 0.5) * (uRandomness * 0.065)
              - sin(uTime * 11.7) * (uRandomness * 0.015);

            // Composition de l'image CRT : scanlines + masque RVB + bloom + barre descendante
            vec3 litCol = sceneCol * phosphorMask * scanGain;
            if (uUseCustomColor) {
              litCol = mix(uScanlineColor * 0.35, litCol, clamp(scanGain, 0.0, 1.0));
            }
            litCol += bloomCol * mix(vec3(1.0), phosphorMask, 0.5);

            // Surexcitation des phosphores au passage de la barre de balayage descendante
            litCol += (sceneCol * 0.85 + vec3(0.12, 0.16, 0.20)) * (phosphorRoll * 1.55);

            // Vignettage naturel et reflet subtil du verre bombé
            float glassVig = mix(0.68, 1.0, bezelShade) * (1.0 - r2 * (0.10 + curv * 0.45));
            vec2 sheenPos = crtUv - vec2(0.28, 0.78);
            float glassSheen = exp(-dot(sheenPos, sheenPos) * 8.5) * (0.025 + curv * 0.08);

            vec3 outCol = litCol * flicker * glassVig + vec3(0.85, 0.92, 1.0) * glassSheen;
            outCol = mix(vec3(0.012, 0.015, 0.020), outCol, screenMask);

            float outAlpha = clamp(max(centerSample.a, max(1.0 - screenMask, phosphorRoll * 0.5)), 0.0, 1.0);
            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Scanlines sinusoïdales 1D directes ultra-rapides (0 copie FBO) ===
          float lineFreq = res.y * 0.30 * uDensity;
          float scanline = sin(uv.y * lineFreq * 6.2831853);
          float rollPos = 1.0 - fract(uTime * max(0.0, uSpeed) * 0.14);
          float distToRoll = min(abs(uv.y - rollPos), 1.0 - abs(uv.y - rollPos));
          float rollGlow = exp(-distToRoll * 14.0) * uRollIntensity * 0.35;

          float alpha = (1.0 - (0.5 + 0.5 * scanline)) * (uIntensity * 0.72) + rollGlow;
          if (alpha <= 0.005) discard;

          vec3 lowCol = mix(uScanlineColor, vec3(0.8, 0.92, 1.0), clamp(rollGlow * 2.0, 0.0, 0.4));
          gl_FragColor = vec4(lowCol, clamp(alpha, 0.0, 0.8));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 94 // Couche 5 (Overlay)

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

  public updateProps(newProps: Partial<CrtScanlinesProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.scanlineColor !== undefined) {
      this.scanlineColorVec.set(newProps.scanlineColor)
      this.material.uniforms.uScanlineColor.value = this.scanlineColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.curvature !== undefined)
      this.material.uniforms.uCurvature.value = newProps.curvature
    if (newProps.rollIntensity !== undefined)
      this.material.uniforms.uRollIntensity.value = newProps.rollIntensity
    if (newProps.bloomIntensity !== undefined)
      this.material.uniforms.uBloomIntensity.value = newProps.bloomIntensity
    if (newProps.phosphorStrength !== undefined)
      this.material.uniforms.uPhosphorStrength.value = newProps.phosphorStrength
    if (newProps.interlaceStrength !== undefined)
      this.material.uniforms.uInterlaceStrength.value = newProps.interlaceStrength
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

export const CrtScanlinesDefinition: IBrickDefinition<CrtScanlinesProps> = {
  type: 'crt_scanlines',
  category: 'overlay',
  create: (id, props, context) => new CrtScanlinesInstance(id, props, context),
}

export const CrtScanlinesAliasDefinition: IBrickDefinition<CrtScanlinesProps> = {
  type: 'scanlines',
  category: 'overlay',
  create: (id, props, context) => new CrtScanlinesInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(CrtScanlinesDefinition)
BrickRegistry.register(CrtScanlinesAliasDefinition)
