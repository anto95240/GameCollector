/**
 * src/theme-engine/bricks/events/GlitchBrick.ts
 *
 * Brique d'Événement Organique : Glitch Numérique & Artefact Cybernétique.
 * Défaillance stochastique réelle du signal vidéo (HIGH/MEDIUM via copie
 * framebuffer) : décalage RGB par blocs horizontaux, déchirures nettes de
 * lignes de balayage (scanline tears), artefacts de compression MPEG/macroblocs,
 * bruit numérique haute fréquence et rafales irrégulières multi-spasmes.
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
  /** Intensité des artefacts de compression par macroblocs (0.0 à 1.5, défaut 0.75). */
  blockArtifacts?: number
  /** Intensité des déchirures de lignes de balayage (0.0 à 1.5, défaut 0.8). */
  scanlineTear?: number
  /** Densité du bruit numérique dans les zones corrompues (0.0 à 1.5, défaut 0.65). */
  noiseAmount?: number
}

export class GlitchInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'glitch'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private frameTex: THREE.FramebufferTexture | null = null
  private dbSize = new THREE.Vector2()
  private scene: THREE.Scene
  private props: GlitchProps
  private glitchColorVec: THREE.Color
  private currentQuality: QualityTier

  private startTime: number | null = null
  private nextGlitchTime = 1.4
  private isActive = false
  private glitchStartTime = 0
  private activeDuration = 0.55
  private activeHasDoubleBurst = true
  private pendingManualTrigger = false

  constructor(id: string, props: GlitchProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene
    this.currentQuality = context.quality

    this.glitchColorVec = new THREE.Color(props.glitchColor ?? '#00f0ff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.5
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.6
    const sliceHeight = props.sliceHeight ?? 0.08
    const glitchInterval = props.glitchInterval ?? 3.0
    const chromaticShift = props.chromaticShift ?? 0.04
    const blockArtifacts = props.blockArtifacts ?? 0.75
    const scanlineTear = props.scanlineTear ?? 0.8
    const noiseAmount = props.noiseAmount ?? 0.65

    const geometry = new THREE.PlaneGeometry(2, 2)
    const qualityTier = context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0

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
        uBlockArtifacts: { value: blockArtifacts },
        uScanlineTear: { value: scanlineTear },
        uNoiseAmount: { value: noiseAmount },
        uGlitchProgress: { value: 1.0 },
        uGlitchPulse: { value: 0.0 },
        uGlitchSeed: { value: 11.4 },
        uScreenTex: { value: null },
        uHasScreenTex: { value: false },
        uQualityLevel: { value: qualityTier },
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
        uniform float uBlockArtifacts;
        uniform float uScanlineTear;
        uniform float uNoiseAmount;
        uniform float uGlitchProgress;
        uniform float uGlitchPulse;
        uniform float uGlitchSeed;
        uniform sampler2D uScreenTex;
        uniform bool uHasScreenTex;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        void main() {
          float pulse = uGlitchPulse;
          if (uGlitchProgress >= 1.0 || pulse <= 0.005) {
            discard;
          }

          vec2 uv = vUv;
          float stepTime = floor(uTime * (16.0 * uSpeed)) + uGlitchSeed;
          float fastTime = floor(uTime * (34.0 * uSpeed)) + uGlitchSeed * 1.7;

          // 1. Découpage en blocs horizontaux à hauteurs irrégulières
          float baseSlice = max(0.012, uSliceHeight / max(0.4, uDensity));
          float bandIdxA = floor(uv.y / baseSlice);
          float bandIdxB = floor((uv.y + 0.37) / (baseSlice * 0.42));

          float randA = hash12(vec2(bandIdxA, stepTime));
          float randB = hash12(vec2(bandIdxB + 19.0, fastTime));

          float activeThresh = clamp(1.0 - (0.38 * uDensity * (0.4 + 0.6 * uRandomness) * pulse), 0.12, 0.96);
          float blockActiveA = step(activeThresh, randA);
          float blockActiveB = step(activeThresh + 0.08, randB);

          // Décalage horizontal des blocs actifs
          float shiftDirA = (hash12(vec2(bandIdxA * 2.7, stepTime + 3.1)) - 0.5) * 2.0;
          float shiftDirB = (hash12(vec2(bandIdxB * 4.3, fastTime + 7.9)) - 0.5) * 2.0;
          float blockShift = (shiftDirA * blockActiveA * 0.055 + shiftDirB * blockActiveB * 0.035) * uIntensity * pulse;

          // 2. Déchirures nettes de lignes de balayage (scanline tears)
          float tearShift = 0.0;
          float tearMask = 0.0;
          float resY = max(120.0, uResolution.y);
          float scanIdx = floor(uv.y * resY * 0.42);
          float clusterIdx = floor(uv.y * 18.0);
          float clusterActive = step(0.68 - 0.25 * uRandomness, hash12(vec2(clusterIdx, fastTime * 0.5)));
          float lineRand = hash12(vec2(scanIdx, fastTime));
          if (clusterActive > 0.5 && lineRand > 0.62) {
            tearMask = (lineRand - 0.62) / 0.38;
            tearShift = (hash12(vec2(scanIdx * 1.9, stepTime)) - 0.5) * 0.095 * uScanlineTear * uIntensity * pulse;
          }

          // 3. Artefacts de compression par macroblocs 2D (HIGH)
          vec2 blockUvOffset = vec2(0.0);
          float macroCorrupt = 0.0;
          float chromaCorrupt = 0.0;
          if (uQualityLevel >= 2 && uBlockArtifacts > 0.02) {
            vec2 macroGrid = vec2(26.0, 16.0) * clamp(uDensity, 0.5, 2.0);
            vec2 macroId = floor(uv * macroGrid);
            float mRand = hash12(macroId + vec2(stepTime * 0.7, 4.3));
            float mThreshold = 1.0 - 0.16 * uBlockArtifacts * pulse;
            if (mRand > mThreshold) {
              macroCorrupt = (mRand - mThreshold) / max(0.01, 1.0 - mThreshold);
              // Quantification / copie d'un macrobloc voisin
              vec2 blockOrigin = (macroId + 0.5) / macroGrid;
              vec2 srcJump = (hash22(macroId + stepTime) - 0.5) * 0.12;
              blockUvOffset = (blockOrigin - uv) * 0.65 + srcJump;
              chromaCorrupt = step(0.45, hash12(macroId * 3.1 + fastTime));
            }
          }

          // 4. Bruit numérique haute fréquence localisé
          float staticNoise = 0.0;
          if (uNoiseAmount > 0.01) {
            vec2 pxGrid = floor(uv * vec2(uResolution.x * 0.35, uResolution.y * 0.35));
            float n = hash12(pxGrid + vec2(fastTime * 13.0, stepTime * 7.0));
            float zone = clamp(blockActiveA + blockActiveB * 0.8 + tearMask * 0.9 + macroCorrupt, 0.0, 1.0);
            staticNoise = (n - 0.5) * 2.0 * zone * uNoiseAmount * 0.28 * pulse;
          }

          // Décalage RGB par blocs horizontaux + scanline tears
          float totalShiftX = blockShift + tearShift;
          float rgbSplit = uChromaticShift * (0.35 + 1.15 * max(blockActiveA, blockActiveB) + tearMask * 0.7) * uIntensity * pulse;

          vec3 accentCol = uUseCustomColor ? uGlitchColor : uPaletteAccent;

          if (uHasScreenTex) {
            vec2 baseUv = uv + vec2(totalShiftX, 0.0) + blockUvOffset;
            vec2 uvR = clamp(baseUv + vec2(rgbSplit, 0.002 * blockActiveB * shiftDirB), vec2(0.001), vec2(0.999));
            vec2 uvG = clamp(baseUv - vec2(rgbSplit * 0.25, 0.0), vec2(0.001), vec2(0.999));
            vec2 uvB = clamp(baseUv - vec2(rgbSplit, -0.002 * blockActiveA * shiftDirA), vec2(0.001), vec2(0.999));

            vec4 sampR = texture2D(uScreenTex, uvR);
            vec4 sampG = texture2D(uScreenTex, uvG);
            vec4 sampB = texture2D(uScreenTex, uvB);

            vec3 glitched = vec3(sampR.r, sampG.g, sampB.b);
            float outAlpha = max(sampG.a, max(sampR.a, sampB.a));

            // Corruption chroma YUV typique des blocs compressés (vert / magenta)
            if (chromaCorrupt > 0.5) {
              vec3 yuvCorrupt = mix(vec3(0.05, 0.95, 0.35), vec3(0.95, 0.12, 0.85), hash12(vec2(bandIdxB, fastTime)));
              glitched = mix(glitched, yuvCorrupt * max(0.35, outAlpha), 0.38 * macroCorrupt * uBlockArtifacts);
            }

            // Lignes de balayage sombres/brillantes dans les déchirures
            if (tearMask > 0.01) {
              float scanStripe = 0.85 + 0.35 * sin(uv.y * resY * 1.6);
              glitched *= mix(1.0, scanStripe, tearMask * 0.65);
              glitched += accentCol * tearMask * 0.18 * pulse * max(0.2, outAlpha);
            }

            // Ajout du bruit numérique et frange accent
            glitched += vec3(staticNoise) * max(0.25, outAlpha);
            glitched += accentCol * blockActiveB * 0.08 * pulse * max(0.2, outAlpha);

            outAlpha = clamp(max(outAlpha, abs(staticNoise) * 0.8), 0.0, 1.0);
            gl_FragColor = vec4(clamp(glitched, 0.0, 1.0), outAlpha);
          } else {
            // Palier LOW : sans copie framebuffer, franges RGB et lignes déchirées légères
            float effectMask = clamp(blockActiveA * 0.6 + blockActiveB * 0.5 + tearMask * 0.7, 0.0, 1.0);
            if (effectMask <= 0.01) {
              discard;
            }
            float scan = 0.65 + 0.35 * sin(uv.y * resY * 1.4);
            vec3 fringe = mix(accentCol, vec3(1.0, 0.15, 0.55), blockActiveB);
            vec3 rgb = fringe * scan + vec3(staticNoise);
            float alpha = clamp(effectMask * 0.45 * pulse * uIntensity, 0.0, 0.72);
            if (alpha <= 0.004) discard;
            gl_FragColor = vec4(rgb, alpha);
          }
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.renderOrder = -4

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

  private startGlitch(now: number, seed?: number): void {
    const speed = Math.max(0.3, this.props.speed ?? 1.5)
    this.isActive = true
    this.glitchStartTime = now
    this.activeHasDoubleBurst = Math.random() < 0.62
    this.activeDuration = (this.activeHasDoubleBurst ? 0.62 : 0.38) / Math.sqrt(speed)

    if (this.material) {
      this.material.uniforms.uGlitchSeed.value = seed ?? Math.random() * 999.0 + 1.0
    }
  }

  public update(_delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    if (this.startTime === null) {
      this.startTime = time
      const interval = Math.max(1.0, this.props.glitchInterval ?? 3.0)
      this.nextGlitchTime = time + Math.min(1.5, interval * 0.48)
    }

    if (this.pendingManualTrigger) {
      this.pendingManualTrigger = false
      this.startGlitch(time)
    } else if (!this.isActive && time >= this.nextGlitchTime) {
      this.startGlitch(time)
    }

    let progress = 1.0
    let pulse = 0.0

    if (this.isActive) {
      const elapsed = time - this.glitchStartTime
      if (elapsed >= this.activeDuration) {
        this.isActive = false
        const interval = Math.max(1.0, this.props.glitchInterval ?? 3.0)
        // Rafales irrégulières non-périodiques
        this.nextGlitchTime = time + interval * (0.55 + Math.random() * 1.1)
      } else {
        progress = elapsed / this.activeDuration
        if (this.activeHasDoubleBurst) {
          // Spasme 1 [0..0.38], courte pause [0.38..0.52], spasme 2 [0.52..1.0]
          if (progress < 0.38) {
            const p1 = progress / 0.38
            pulse = Math.sin(p1 * Math.PI) * 1.05
          } else if (progress < 0.52) {
            pulse = 0.08
          } else {
            const p2 = (progress - 0.52) / 0.48
            pulse = Math.sin(p2 * Math.PI) * 0.92
          }
        } else {
          pulse = Math.sin(progress * Math.PI)
        }
      }
    }

    this.mesh.visible = pulse > 0.005
    this.material.uniforms.uGlitchProgress.value = progress
    this.material.uniforms.uGlitchPulse.value = pulse
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (
      event.type === 'glitch' ||
      event.type === 'light_flicker' ||
      (event.params && event.params.type === 'glitch')
    ) {
      this.pendingManualTrigger = true
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
    if (newProps.blockArtifacts !== undefined)
      this.material.uniforms.uBlockArtifacts.value = newProps.blockArtifacts
    if (newProps.scanlineTear !== undefined)
      this.material.uniforms.uScanlineTear.value = newProps.scanlineTear
    if (newProps.noiseAmount !== undefined)
      this.material.uniforms.uNoiseAmount.value = newProps.noiseAmount
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

export const GlitchDefinition: IBrickDefinition<GlitchProps> = {
  type: 'glitch',
  category: 'events',
  create: (id, props, context) => new GlitchInstance(id, props, context),
}

BrickRegistry.register(GlitchDefinition)
