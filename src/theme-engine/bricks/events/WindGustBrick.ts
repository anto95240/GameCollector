/**
 * src/theme-engine/bricks/events/WindGustBrick.ts
 *
 * Brique d'Événement Organique : Rafale de Vent & Bourrasque Aérienne.
 * Balayage aérodynamique traversant l'écran avec lignes de courant (streamlines)
 * sinueuses, tourbillons de Kelvin-Helmholtz, micro-filaments de condensation
 * et poussée cinétique asynchrone non-linéaire.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { BrickRegistry } from '../registry'

export interface WindGustProps {
  /** Teinte des filaments de vent et brume de rafale (défaut #e2e8f0). */
  windColor?: string
  /** Densité et nombre de lignes de courant (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vélocité du flux d'air de la rafale (0.2 à 3.0, défaut 1.3). */
  speed?: number
  /** Profondeur Z et étagement parallaxe (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Visibilité et contraste des volutes de vent (0.2 à 2.5, défaut 1.1). */
  intensity?: number
  /** Turbulence tourbillonnaire et ondulation (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Angle de direction du vent en radians (-3.14 à 3.14, défaut 0.15). */
  gustAngle?: number
  /** Intervalle moyen en secondes entre rafales (1.0 à 15.0, défaut 4.0). */
  gustInterval?: number
  /** Échelle des vortex et tourbillons d'air (0.3 à 2.0, défaut 1.0). */
  swirlScale?: number
}

export class WindGustInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'wind_gust'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: WindGustProps
  private windColorVec: THREE.Color

  private lastGustTime = 0
  private manualTriggerTime = 0

  constructor(id: string, props: WindGustProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.windColorVec = new THREE.Color(props.windColor ?? '#e2e8f0')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.3
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.1
    const randomness = props.randomness ?? 0.45
    const gustAngle = props.gustAngle ?? 0.15
    const gustInterval = props.gustInterval ?? 4.0
    const swirlScale = props.swirlScale ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uWindColor: { value: this.windColorVec },
        uUseCustomColor: { value: Boolean(props.windColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uGustAngle: { value: gustAngle },
        uGustInterval: { value: gustInterval },
        uSwirlScale: { value: swirlScale },
        uGustSeed: { value: 1.0 },
        uGustProgress: { value: 0.0 }, // 0.0 à 1.0
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.982, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uWindColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uGustAngle;
        uniform float uGustInterval;
        uniform float uSwirlScale;
        uniform float uGustSeed;
        uniform float uGustProgress;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          p += uMouse * (uDepth * 0.18);

          float progress = uGustProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          // Angle orienté de la bourrasque + influence souris
          float angle = uGustAngle + uMouse.y * 0.15;
          vec2 windDir = vec2(cos(angle), sin(angle));
          vec2 windPerp = vec2(-windDir.y, windDir.x);

          // Front de la rafale balayant l'écran
          // Progression de -1.5 à +1.5 sur l'axe du vent
          float frontPos = mix(-1.6, 1.6, progress);
          float distToFront = dot(p, windDir) - frontPos;

          // Cloche d'intensité de la rafale (épaisseur du front d'air)
          float gustEnvelope = exp(-pow(distToFront / 0.55, 2.0));
          if (gustEnvelope <= 0.01) {
            discard;
          }

          // Coordonnées locales alignées sur le vent
          float coordAlong = dot(p, windDir);
          float coordAcross = dot(p, windPerp);

          float totalStreamlines = 0.0;
          float t = uTime * uSpeed;

          if (uQualityLevel >= 1) {
            // Lignes de courant ondulantes (streamlines)
            float numLines = 6.0 * uDensity;
            for (int i = 0; i < 5; i++) {
              if (float(i) >= numLines) break;
              float fi = float(i);
              
              // Décalage vertical / transverse de chaque ruban
              float lineAcrossOffset = (fi / numLines - 0.5) * 1.4;
              
              // Ondulation de vortex sinueuse
              float wave = snoise(vec2(coordAlong * 2.5 * uSwirlScale - t * 1.5, fi * 3.7 + uGustSeed)) * (0.08 * uRandomness);
              float distToLine = abs(coordAcross - lineAcrossOffset - wave);
              
              // Profil de ruban d'air fin
              float lineProfile = exp(-distToLine * 65.0);
              
              // Modulation de longueur de ruban
              float lineLengthMask = sin(coordAlong * 4.0 + fi * 2.1 - t * 3.0);
              lineLengthMask = smoothstep(-0.2, 0.8, lineLengthMask);
              
              totalStreamlines += lineProfile * lineLengthMask;
            }
          } else {
            // Palier LOW : onde fluide unique lissée
            float wave = sin(coordAlong * 5.0 - t * 3.0) * 0.06;
            totalStreamlines = exp(-abs(coordAcross - wave) * 25.0);
          }

          // Volutes de brume entraînées par la rafale (FBM doux en HIGH)
          float mistCloud = 0.0;
          if (uQualityLevel >= 2) {
            vec2 mistCoord = vec2(coordAlong * 2.0 - t * 2.0, coordAcross * 3.0);
            float fbmMist = fbm2D(mistCoord * uSwirlScale, 3);
            mistCloud = smoothstep(0.1, 0.7, fbmMist) * 0.45;
          }

          // Enveloppe d'entrée/sortie de la rafale
          float lifeFade = sin(progress * 3.1415);
          float alpha = (totalStreamlines * 0.85 + mistCloud * 0.6) * gustEnvelope * lifeFade * uIntensity;
          alpha = clamp(alpha, 0.0, 0.88);

          if (alpha <= 0.005) {
            discard;
          }

          vec3 baseColor = uUseCustomColor ? uWindColor : uPaletteAccent;
          vec3 finalRgb = mix(baseColor, vec3(1.0), totalStreamlines * 0.5);

          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -7
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    if (!this.material) return

    const interval = this.props.gustInterval ?? 4.0
    const speed = this.props.speed ?? 1.3
    const duration = 1.4 / Math.max(0.3, speed)

    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < duration) {
      progress = timeSinceManual / duration
    } else {
      const cycleTime = time % (interval * 1.3)
      if (cycleTime < duration) {
        progress = cycleTime / duration
        if (Math.abs(time - this.lastGustTime) > interval * 0.5) {
          this.lastGustTime = time
          this.material.uniforms.uGustSeed.value = Math.sin(time * 23.4) * 5123.0
        }
      }
    }

    this.material.uniforms.uGustProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'wind_gust') {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
      if (this.material) {
        this.material.uniforms.uGustSeed.value = Math.random() * 777.0
      }
    }
  }

  public updateProps(newProps: Partial<WindGustProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.windColor !== undefined) {
      this.windColorVec.set(newProps.windColor)
      this.material.uniforms.uWindColor.value = this.windColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.gustAngle !== undefined)
      this.material.uniforms.uGustAngle.value = newProps.gustAngle
    if (newProps.gustInterval !== undefined)
      this.material.uniforms.uGustInterval.value = newProps.gustInterval
    if (newProps.swirlScale !== undefined)
      this.material.uniforms.uSwirlScale.value = newProps.swirlScale
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

export const WindGustDefinition: IBrickDefinition<WindGustProps> = {
  type: 'wind_gust',
  category: 'events',
  create: (id, props, context) => new WindGustInstance(id, props, context),
}

BrickRegistry.register(WindGustDefinition)
