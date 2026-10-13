/**
 * src/theme-engine/bricks/events/GlitchBrick.ts
 *
 * Brique d'Événement Organique : Glitch Numérique & Artefact Cybernétique.
 * Défaillance stochastique de signal avec découpage par blocs horizontaux (slicing),
 * aberration chromatique RVB dissociée (RGB split), trames de balayage corrompues
 * et salves impulsionnelles asynchrones.
 */

import * as THREE from 'three'

import { GLSL_HASH } from '../../shaders/noise.glsl'
import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export interface GlitchProps {
  /** Teinte dominante des franges de glitch (défaut #00f0ff). */
  glitchColor?: string
  /** Densité et nombre de blocs découpés (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vivacité et cadence des sauts d'artefacts (0.2 à 3.0, défaut 1.5). */
  speed?: number
  /** Profondeur Z et réactivité à la parallaxe (0.0 à 1.0, défaut 0.25). */
  depth?: number
  /** Amplitude de décalage et intensité des franges (0.2 à 2.5, défaut 1.2). */
  intensity?: number
  /** Imprévisibilité, gigue et asymétrie des blocs (0.0 à 1.0, défaut 0.6). */
  randomness?: number
  /** Épaisseur moyenne des tranches de décalage (0.01 à 0.25, défaut 0.08). */
  sliceHeight?: number
  /** Intervalle moyen en secondes entre salves de glitch (1.0 à 12.0, défaut 3.0). */
  glitchInterval?: number
  /** Séparation chromatique RVB (RGB split) (0.01 à 0.15, défaut 0.04). */
  chromaticShift?: number
}

export class GlitchInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'glitch'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: GlitchProps
  private glitchColorVec: THREE.Color

  private lastGlitchTime = 0
  private manualTriggerTime = 0

  constructor(id: string, props: GlitchProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.glitchColorVec = new THREE.Color(props.glitchColor ?? '#00f0ff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.5
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.6
    const sliceHeight = props.sliceHeight ?? 0.08
    const glitchInterval = props.glitchInterval ?? 3.0
    const chromaticShift = props.chromaticShift ?? 0.04

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uGlitchColor: { value: this.glitchColorVec },
        uUseCustomColor: { value: Boolean(props.glitchColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSliceHeight: { value: sliceHeight },
        uGlitchInterval: { value: glitchInterval },
        uChromaticShift: { value: chromaticShift },
        uGlitchProgress: { value: 0.0 }, // 0.0 à 1.0
        uGlitchSeed: { value: 1.0 },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.99, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uGlitchColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSliceHeight;
        uniform float uGlitchInterval;
        uniform float uChromaticShift;
        uniform float uGlitchProgress;
        uniform float uGlitchSeed;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          float progress = uGlitchProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          // Enveloppe de salve (impulsion courte et saccadée)
          float burstPulse = sin(progress * 3.1415);
          // Micro-flicker à haute fréquence pendant la salve
          float microFlicker = step(0.3, fract(sin(uTime * 50.0 + uGlitchSeed) * 43758.5453));
          burstPulse *= mix(0.7, 1.3, microFlicker);

          if (burstPulse <= 0.01) {
            discard;
          }

          // Découpage en tranches horizontales
          float sliceSize = max(0.01, uSliceHeight / max(0.4, uDensity));
          float sliceIndex = floor(uv.y / sliceSize);
          
          // Aléatoire par tranche
          float sliceRand = hash12(vec2(sliceIndex, floor(uTime * 14.0 * uSpeed) + uGlitchSeed));

          // Probabilité d'activation de la tranche
          float sliceActive = step(1.0 - (0.35 * uDensity * uRandomness), sliceRand);

          // Décalage horizontal du bloc
          float shiftX = (hash12(vec2(sliceIndex * 3.1, uGlitchSeed)) - 0.5) * 0.12 * uIntensity;
          shiftX *= sliceActive * burstPulse;

          // Franges chromatiques RVB
          vec3 glitchRgb = vec3(0.0);
          float alpha = 0.0;

          if (sliceActive > 0.5) {
            // Lignes de balayage CRT corrompues à l'intérieur du bloc
            float scanline = sin(uv.y * uResolution.y * 1.5);
            scanline = smoothstep(-0.2, 0.8, scanline);

            // Bruit numérique haute fréquence (PALIER HIGH / MEDIUM)
            float digitalNoise = 1.0;
            if (uQualityLevel >= 1) {
              vec2 noiseCoord = uv * vec2(80.0, 30.0) + vec2(uTime * 20.0, 0.0);
              digitalNoise = hash12(floor(noiseCoord));
            }

            // Séparation RVB (RGB split)
            float chromDist = uChromaticShift * burstPulse * uIntensity;

            // Masque de bloc décalé
            float blockAlpha = smoothstep(0.0, 0.08, sliceRand) * 0.7;

            if (uQualityLevel >= 2) {
              // PALIER HIGH : Décomposition 3 canaux R, V, B déphasés
              float redEdge = smoothstep(0.02, 0.0, abs(shiftX - chromDist));
              float cyanEdge = smoothstep(0.02, 0.0, abs(shiftX + chromDist));
              
              glitchRgb.r = (redEdge + 0.3) * digitalNoise;
              glitchRgb.g = (cyanEdge * 0.7 + 0.2) * digitalNoise;
              glitchRgb.b = (cyanEdge + 0.5) * digitalNoise;
            } else {
              // PALIER MEDIUM / LOW : Teinte glitch directe
              vec3 baseCol = uUseCustomColor ? uGlitchColor : uPaletteAccent;
              glitchRgb = baseCol * digitalNoise;
            }

            alpha = blockAlpha * scanline * burstPulse * uIntensity;
          }

          // Lueur de cadre flash en début de salve
          float edgeBurst = exp(-abs(uv.y - 0.5) * 4.0) * smoothstep(0.0, 0.06, progress) * exp(-progress * 6.0) * 0.25;
          alpha += edgeBurst;
          glitchRgb += vec3(0.3) * edgeBurst;

          alpha = clamp(alpha, 0.0, 0.92);
          if (alpha <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(glitchRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -4
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    if (!this.material) return

    const interval = this.props.glitchInterval ?? 3.0
    const speed = this.props.speed ?? 1.5
    const duration = 0.45 / Math.max(0.3, speed)

    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < duration) {
      progress = timeSinceManual / duration
    } else {
      const cycleTime = time % (interval * 1.2)
      if (cycleTime < duration) {
        progress = cycleTime / duration
        if (Math.abs(time - this.lastGlitchTime) > interval * 0.5) {
          this.lastGlitchTime = time
          this.material.uniforms.uGlitchSeed.value = Math.sin(time * 41.3) * 6543.0
        }
      }
    }

    this.material.uniforms.uGlitchProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'light_flicker' || (event.params && event.params.type === 'glitch')) {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
      if (this.material) {
        this.material.uniforms.uGlitchSeed.value = Math.random() * 999.0
      }
    }
  }

  public updateProps(newProps: Partial<GlitchProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.glitchColor !== undefined) {
      this.glitchColorVec.set(newProps.glitchColor)
      this.material.uniforms.uGlitchColor.value = this.glitchColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.sliceHeight !== undefined)
      this.material.uniforms.uSliceHeight.value = newProps.sliceHeight
    if (newProps.glitchInterval !== undefined)
      this.material.uniforms.uGlitchInterval.value = newProps.glitchInterval
    if (newProps.chromaticShift !== undefined)
      this.material.uniforms.uChromaticShift.value = newProps.chromaticShift
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

export const GlitchDefinition: IBrickDefinition<GlitchProps> = {
  type: 'glitch',
  category: 'events',
  create: (id, props, context) => new GlitchInstance(id, props, context),
}

BrickRegistry.register(GlitchDefinition)
