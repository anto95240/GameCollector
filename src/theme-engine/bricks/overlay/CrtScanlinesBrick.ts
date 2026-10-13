/**
 * src/theme-engine/bricks/overlay/CrtScanlinesBrick.ts
 *
 * Brique de style et d'overlay : Lignes de Balayage Cathodique & Rétro CRT (Couche 5 : Overlay).
 * Émulation authentique d'un moniteur cathodique vintage (Sony Trinitron / borne d'arcade),
 * avec scanlines horizontales entrelacées, balayage vertical à barre de phosphore (phosphor roll),
 * courbure d'écran bombée (barrel distortion 3D), masque de phosphore RVB sub-pixel,
 * micro-flicker cathodique à 60Hz, et adaptation stricte aux 3 paliers de qualité.
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
}

export class CrtScanlinesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'crt_scanlines'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: CrtScanlinesProps
  private scanlineColorVec: THREE.Color

  constructor(id: string, props: CrtScanlinesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.scanlineColorVec = new THREE.Color(props.scanlineColor ?? '#000000')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 0.45
    const randomness = props.randomness ?? 0.25
    const curvature = props.curvature ?? 0.12
    const rollIntensity = props.rollIntensity ?? 0.15

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
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;

          // Micro-décentrement sous la parallaxe souris
          vec2 mouseCenter = uMouse * (uDepth * 0.08);

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Courbure tube 3D + Phosphor roll + Masque RVB sub-pixel + Flicker ===
            vec2 centerNorm = (uv - 0.5 - mouseCenter);
            float r2 = dot(centerNorm, centerNorm);
            vec2 crtUv = centerNorm * (1.0 + r2 * (uCurvature * 2.8)) + 0.5 + mouseCenter;

            // Découpage du cadre du tube cathodique avec coins arrondis
            if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
              // Bordure de châssis plastique/métal sombre
              gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(uIntensity * 1.5, 0.0, 0.98));
              return;
            }

            // Fréquence des scanlines alignée sur la résolution verticale
            float lineFreq = uResolution.y * 0.45 * uDensity;
            float linePhase = crtUv.y * lineFreq;
            float scanlineWave = sin(linePhase * 6.2831853);
            float scanDarkness = pow(0.5 + 0.5 * scanlineWave, 1.45);

            // Barre de rafraîchissement descendante (phosphor roll) avec traînée de rémanence
            float rollPos = fract(uTime * uSpeed * 0.35);
            float distToRoll = abs(crtUv.y - rollPos);
            distToRoll = min(distToRoll, 1.0 - distToRoll);
            float phosphorRoll = exp(-distToRoll * 12.0) * uRollIntensity;
            float phosphorTrail = smoothstep(0.15, 0.0, mod(crtUv.y - rollPos + 1.0, 1.0)) * (uRollIntensity * 0.35);
            phosphorRoll = max(phosphorRoll, phosphorTrail);

            // Micro-flicker haute fréquence 60Hz
            float flickerSeed = floor(uTime * 60.0);
            float flicker = 1.0 - (hash12(vec2(flickerSeed, flickerSeed * 1.618)) - 0.5) * (uRandomness * 0.15);

            // Masque de phosphore RVB sub-pixel (Trinitron aperture grille)
            float subPixel = mod(gl_FragCoord.x, 3.0);
            vec3 phosphorMask = subPixel < 1.0 ? vec3(1.0, 0.85, 0.85) :
                               (subPixel < 2.0 ? vec3(0.85, 1.0, 0.85) : vec3(0.85, 0.85, 1.0));

            // Vignette intérieure de verre cathodique
            vec2 tubeDist = (crtUv - 0.5) * 2.0;
            float glassVig = 1.0 - dot(tubeDist, tubeDist) * 0.18;

            // Calcul de l'alpha et de la couleur résultante
            float shadowAlpha = (1.0 - scanDarkness) * uIntensity * flicker;
            float totalAlpha = clamp(shadowAlpha + phosphorRoll * 0.4, 0.0, 0.85);

            vec3 baseCol = uUseCustomColor ? uScanlineColor : vec3(0.0);
            vec3 rollGlowCol = vec3(0.85, 0.95, 1.0) * phosphorRoll;

            vec3 finalColor = mix(baseCol * phosphorMask * glassVig, rollGlowCol, phosphorRoll * 0.7);

            gl_FragColor = vec4(finalColor, totalAlpha);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Scanlines nettes + Phosphor roll sans masque sub-pixel ===
            vec2 centerNorm = (uv - 0.5 - mouseCenter);
            float r2 = dot(centerNorm, centerNorm);
            vec2 crtUv = centerNorm * (1.0 + r2 * (uCurvature * 1.5)) + 0.5 + mouseCenter;

            if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, uIntensity * 0.9);
              return;
            }

            float lineFreq = uResolution.y * 0.40 * uDensity;
            float scanlineWave = sin(crtUv.y * lineFreq * 6.2831853);
            float scanDarkness = 0.5 + 0.5 * scanlineWave;

            float rollPos = fract(uTime * uSpeed * 0.3);
            float distToRoll = abs(crtUv.y - rollPos);
            float phosphorRoll = exp(-distToRoll * 12.0) * uRollIntensity;

            float shadowAlpha = (1.0 - scanDarkness) * uIntensity;
            float totalAlpha = clamp(shadowAlpha + phosphorRoll * 0.35, 0.0, 0.8);

            gl_FragColor = vec4(uScanlineColor, totalAlpha);

          } else {
            // === PALIER LOW : Scanlines sinusoïdales 1D directes ultra-rapides ===
            float lineFreq = uResolution.y * 0.30 * uDensity;
            float scanline = sin(uv.y * lineFreq * 6.2831853);
            float alpha = (1.0 - (0.5 + 0.5 * scanline)) * (uIntensity * 0.75);

            if (alpha <= 0.005) discard;

            gl_FragColor = vec4(uScanlineColor, alpha);
          }
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
