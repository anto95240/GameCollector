/**
 * src/theme-engine/bricks/overlay/ChromaticAberrationBrick.ts
 *
 * Brique de style et d'overlay : Aberration Chromatique & Dispersion Spectrale (Couche 5 : Overlay).
 * Simulation optique réelle d'objectif grand-angle / anamorphique via FramebufferTexture :
 * - Dispersion latérale radiale réelle des 3 canaux (Rouge, Vert, Bleu) croissant du centre
 *   optique (strictement nul pour préserver 100 % la lisibilité UI) vers les bords et coins
 * - Échantillonnage spectral multi-taps (HIGH) pour des franges continues sans dédoublement dur
 * - Léger flou optique progressif des bords (coma / aberration sphérique périphérique)
 * - Décentrement du centre optique réactif à la souris et micro-modulation Simplex organique
 * - Palier LOW sans copie FBO (frange radiale légère) pour préserver les FPS mobiles.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Aberration Chromatique.
 */
export interface ChromaticAberrationProps {
  /** Teinte subtile d'accentuation de frange prismatique (défaut cyan optique '#00f0ff'). */
  aberrationColor?: string
  /** Densité de la micro-modulation spectrale Simplex (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de respiration / dérive prismatique douce (0.0 à 2.0, défaut 0.3). */
  speed?: number
  /** Profondeur et sensibilité du centre optique à la souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Intensité globale de la dispersion chromatique et de son éclat (0.1 à 1.5, défaut 0.6). */
  intensity?: number
  /** Asymétrie spectrale et perturbation organique Simplex (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Écartement spectral maximal de dispersion aux bordures en UV (0.005 à 0.08, défaut 0.025). */
  spread?: number
  /** Exposant d'atténuation au centre pour préserver la netteté UI (0.5 à 3.0, défaut 1.6). */
  radialFalloff?: number
  /** Intensité du léger flou optique sur les bords et coins (0.0 à 1.0, défaut 0.35). */
  edgeBlur?: number
}

export class ChromaticAberrationInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'chromatic_aberration'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: ChromaticAberrationProps
  private aberrationColorVec: THREE.Color
  private currentQuality: QualityTier

  constructor(id: string, props: ChromaticAberrationProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.aberrationColorVec = new THREE.Color(props.aberrationColor ?? '#00f0ff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 0.6
    const randomness = props.randomness ?? 0.3
    const spread = props.spread ?? 0.025
    const radialFalloff = props.radialFalloff ?? 1.6
    const edgeBlur = props.edgeBlur ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uAberrationColor: { value: this.aberrationColorVec },
        uUseCustomColor: { value: Boolean(props.aberrationColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSpread: { value: spread },
        uRadialFalloff: { value: radialFalloff },
        uEdgeBlur: { value: edgeBlur },
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
        uniform vec3 uAberrationColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSpread;
        uniform float uRadialFalloff;
        uniform float uEdgeBlur;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        vec3 unpremultiply(vec4 s) {
          return s.a > 0.002 ? s.rgb / s.a : vec3(0.0);
        }

        void main() {
          vec2 uv = vUv;
          vec2 res = max(uResolution, vec2(1.0));
          float aspect = res.x / res.y;

          // Centre optique influencé par la souris (légère déflexion de lentille)
          vec2 center = vec2(0.5) + uMouse * (uDepth * 0.10);
          vec2 delta = uv - center;
          vec2 aspectDelta = delta * vec2(aspect, 1.0);
          float cornerDist = length(vec2(aspect * 0.5, 0.5));
          float normDist = length(aspectDelta) / max(0.001, cornerDist);

          // Croissance radiale progressive : zéro au centre optique, montée continue vers les bords
          float falloffExp = clamp(uRadialFalloff, 0.5, 3.0);
          float edgeFactor = pow(smoothstep(0.16, 1.02, normDist), falloffExp);

          if (uHasScreenTex && uQualityLevel >= 1) {
            vec4 centerSample = texture2D(uScreenTex, uv);
            if (edgeFactor <= 0.002) {
              gl_FragColor = centerSample;
              return;
            }

            // Direction radiale normalisée depuis le centre optique
            float rawLen = length(delta);
            vec2 radDir = rawLen > 0.0001 ? delta / rawLen : vec2(0.0);
            vec2 tangDir = vec2(-radDir.y, radDir.x);

            // Modulation optique organique subtile (imperfection de lentille + respiration)
            float modFactor = 1.0;
            if (uQualityLevel >= 2 && uRandomness > 0.005) {
              vec2 noiseCoord = uv * (3.2 * uDensity) + vec2(sin(uTime * uSpeed * 0.45), cos(uTime * uSpeed * 0.38));
              modFactor += snoise(noiseCoord) * (uRandomness * 0.25);
            }

            // Déplacement spectral radial croissant vers les bords (réglable via spread & intensity)
            float dispMag = edgeFactor * clamp(uSpread, 0.001, 0.08) * clamp(uIntensity, 0.0, 1.5) * 0.85 * modFactor;
            vec2 radShift = radDir * dispMag;

            // Légère dérive de flou optique périphérique (coma radiale/tangentielle)
            float blurRadius = edgeFactor * clamp(uEdgeBlur, 0.0, 1.0) * clamp(uIntensity, 0.2, 1.5);
            vec2 texelBlur = (1.0 / res) * (blurRadius * (uQualityLevel >= 2 ? 3.8 : 2.2));

            vec3 outCol;
            if (uQualityLevel >= 2) {
              // === PALIER HIGH : Dispersion spectrale 3 canaux multi-échantillons + flou doux des bords ===
              // Chaque canal R, G, B est réfracté à une échelle radiale différente (+s, 0, -s)
              // avec un léger étalement spectral le long du rayon + flou tangentiel optique.
              vec2 uvR1 = clamp(uv + radShift * 1.05, vec2(0.001), vec2(0.999));
              vec2 uvR2 = clamp(uv + radShift * 0.65 + tangDir * texelBlur.x, vec2(0.001), vec2(0.999));
              vec2 uvR3 = clamp(uv + radShift * 0.65 - tangDir * texelBlur.x, vec2(0.001), vec2(0.999));

              vec2 uvG1 = clamp(uv + radShift * 0.08, vec2(0.001), vec2(0.999));
              vec2 uvG2 = clamp(uv - radShift * 0.08 + tangDir * texelBlur.y, vec2(0.001), vec2(0.999));
              vec2 uvG3 = clamp(uv - radShift * 0.08 - tangDir * texelBlur.y, vec2(0.001), vec2(0.999));

              vec2 uvB1 = clamp(uv - radShift * 1.05, vec2(0.001), vec2(0.999));
              vec2 uvB2 = clamp(uv - radShift * 0.65 + tangDir * texelBlur.x, vec2(0.001), vec2(0.999));
              vec2 uvB3 = clamp(uv - radShift * 0.65 - tangDir * texelBlur.x, vec2(0.001), vec2(0.999));

              float rVal = (
                unpremultiply(texture2D(uScreenTex, uvR1)).r * 0.50 +
                unpremultiply(texture2D(uScreenTex, uvR2)).r * 0.25 +
                unpremultiply(texture2D(uScreenTex, uvR3)).r * 0.25
              );
              float gVal = (
                unpremultiply(texture2D(uScreenTex, uvG1)).g * 0.50 +
                unpremultiply(texture2D(uScreenTex, uvG2)).g * 0.25 +
                unpremultiply(texture2D(uScreenTex, uvG3)).g * 0.25
              );
              float bVal = (
                unpremultiply(texture2D(uScreenTex, uvB1)).b * 0.50 +
                unpremultiply(texture2D(uScreenTex, uvB2)).b * 0.25 +
                unpremultiply(texture2D(uScreenTex, uvB3)).b * 0.25
              );

              outCol = vec3(rVal, gVal, bVal);

              // Subtil halo prismatique sur les forts contrastes en bordure extrême
              float edgeDiff = abs(rVal - bVal);
              if (uUseCustomColor) {
                outCol += uAberrationColor * edgeDiff * edgeFactor * 0.14 * uIntensity;
              }
            } else {
              // === PALIER MEDIUM : Séparation radiale 3 canaux + léger flou de bord ===
              vec2 uvR = clamp(uv + radShift + tangDir * texelBlur.x * 0.5, vec2(0.001), vec2(0.999));
              vec2 uvB = clamp(uv - radShift - tangDir * texelBlur.x * 0.5, vec2(0.001), vec2(0.999));
              vec2 uvG2 = clamp(uv + radDir * texelBlur.y, vec2(0.001), vec2(0.999));

              float rVal = unpremultiply(texture2D(uScreenTex, uvR)).r;
              float gVal = mix(unpremultiply(centerSample).g, unpremultiply(texture2D(uScreenTex, uvG2)).g, 0.35);
              float bVal = unpremultiply(texture2D(uScreenTex, uvB)).b;

              outCol = vec3(rVal, gVal, bVal);
            }

            float outAlpha = centerSample.a;
            gl_FragColor = vec4(clamp(outCol, 0.0, 1.0) * outAlpha, outAlpha);
            return;
          }

          // === PALIER LOW : Frange spectrale radiale directe sans copie FBO ===
          if (edgeFactor <= 0.004) discard;
          vec3 baseFringe = uUseCustomColor ? uAberrationColor : vec3(0.0, 0.85, 1.0);
          vec3 dualFringe = mix(baseFringe, vec3(1.0, 0.18, 0.45), step(0.0, delta.x * delta.y) * 0.35);
          float lowAlpha = clamp(edgeFactor * uIntensity * 0.24, 0.0, 0.55);
          gl_FragColor = vec4(dualFringe * lowAlpha, lowAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 98 // Couche 5 (Overlay)

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

  public updateProps(newProps: Partial<ChromaticAberrationProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.aberrationColor !== undefined) {
      this.aberrationColorVec.set(newProps.aberrationColor)
      this.material.uniforms.uAberrationColor.value = this.aberrationColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.spread !== undefined) this.material.uniforms.uSpread.value = newProps.spread
    if (newProps.radialFalloff !== undefined)
      this.material.uniforms.uRadialFalloff.value = newProps.radialFalloff
    if (newProps.edgeBlur !== undefined) this.material.uniforms.uEdgeBlur.value = newProps.edgeBlur
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

export const ChromaticAberrationDefinition: IBrickDefinition<ChromaticAberrationProps> = {
  type: 'chromatic_aberration',
  category: 'overlay',
  create: (id, props, context) => new ChromaticAberrationInstance(id, props, context),
}

export const ChromaticAberrationAliasDefinition: IBrickDefinition<ChromaticAberrationProps> = {
  type: 'aberration_chromatique',
  category: 'overlay',
  create: (id, props, context) => new ChromaticAberrationInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(ChromaticAberrationDefinition)
BrickRegistry.register(ChromaticAberrationAliasDefinition)
