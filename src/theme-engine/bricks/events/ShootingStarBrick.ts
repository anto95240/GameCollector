/**
 * src/theme-engine/bricks/events/ShootingStarBrick.ts
 *
 * Brique d'Événement Organique : Étoile Filante & Météore Traversant.
 * Bolide hypersonique fendant la voûte céleste avec tête incandescente ablative,
 * longue traînée de plasma ionisé persistant, micro-fragmentation thermique
 * et trajectoire oblique asynchrone non-périodique.
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

export interface ShootingStarProps {
  /** Teinte de la tête incandescente du météore (défaut #ffffff). */
  starColor?: string
  /** Teinte de la traînée de plasma ionisé (défaut #38bdf8). */
  trailColor?: string
  /** Densité et nombre de météores par séquence (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vélocité supersonique de traversée (0.2 à 3.0, défaut 1.4). */
  speed?: number
  /** Profondeur Z et réactivité à la parallaxe (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance et émission lumineuse de la traînée (0.2 à 3.0, défaut 1.25). */
  intensity?: number
  /** Variabilité des angles d'entrée et asymétrie (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Angle d'incidence en radians (-2.0 à 2.0, défaut -0.65). */
  angle?: number
  /** Longueur d'étirement de la traînée de plasma (0.3 à 2.5, défaut 1.2). */
  trailLength?: number
  /** Intervalle moyen en secondes entre apparitions (1.0 à 15.0, défaut 3.0). */
  starInterval?: number
}

export class ShootingStarInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'shooting_star'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ShootingStarProps
  private starColorVec: THREE.Color
  private trailColorVec: THREE.Color

  private lastSpawnTime = 0
  private manualTriggerTime = 0

  constructor(id: string, props: ShootingStarProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.starColorVec = new THREE.Color(props.starColor ?? '#ffffff')
    this.trailColorVec = new THREE.Color(props.trailColor ?? '#38bdf8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.4
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.25
    const randomness = props.randomness ?? 0.45
    const angle = props.angle ?? -0.65
    const trailLength = props.trailLength ?? 1.2
    const starInterval = props.starInterval ?? 3.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uStarColor: { value: this.starColorVec },
        uTrailColor: { value: this.trailColorVec },
        uUseCustomColor: { value: Boolean(props.trailColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uAngle: { value: angle },
        uTrailLength: { value: trailLength },
        uStarInterval: { value: starInterval },
        uStarSeed: { value: 1.0 },
        uStarProgress: { value: 0.0 }, // 0.0 (apparition) à 1.0 (disparition)
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.98, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uStarColor;
        uniform vec3 uTrailColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uAngle;
        uniform float uTrailLength;
        uniform float uStarInterval;
        uniform float uStarSeed;
        uniform float uStarProgress;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe perspective
          p += uMouse * (uDepth * 0.15);

          float progress = uStarProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          // Angle dynamique avec perturbation aléatoire selon la graine
          float theta = uAngle + (hash12(vec2(uStarSeed, 2.3)) - 0.5) * uRandomness * 0.6;
          vec2 dir = vec2(cos(theta), sin(theta));
          vec2 perp = vec2(-dir.y, dir.x);

          // Origine du bolide : démarre hors écran ou en haut à gauche
          float startOffset = (hash12(vec2(uStarSeed, 8.7)) - 0.5) * 0.8;
          vec2 startPos = vec2(-aspect * 0.7 + startOffset, 0.7 - startOffset * 0.4);
          vec2 endPos = startPos + dir * 2.8;

          // Position courante de la tête
          vec2 headPos = mix(startPos, endPos, progress);

          // Vecteur du pixel par rapport à la tête
          vec2 d = p - headPos;
          float distAlong = -dot(d, dir); // Distance derrière la tête (> 0)
          float distAcross = abs(dot(d, perp)); // Distance perpendiculaire

          // 1. Tête incandescente (bolide ablative)
          float headRadius = 0.008 * uIntensity;
          float headDist = length(p - headPos);
          float headCore = exp(-headDist / (headRadius * 0.6)) * 2.2;
          float headGlow = exp(-headDist / (headRadius * 3.5)) * 0.8;

          // 2. Traînée de plasma ionisé
          float maxTrailLen = 0.65 * uTrailLength;
          float trailLight = 0.0;
          float trailWidth = 0.0035 + (distAlong / maxTrailLen) * 0.009; // Évasement conique

          if (distAlong > 0.0 && distAlong < maxTrailLen) {
            float decay = 1.0 - (distAlong / maxTrailLen);
            // Atténuation non-linéaire douce
            decay = pow(decay, 1.6);

            // Largeur de profil gaussien
            float acrossGlow = exp(-distAcross / trailWidth);

            // Bruit de turbulence de sillage (qualité HIGH / MEDIUM)
            float sillageNoise = 1.0;
            if (uQualityLevel >= 2) {
              float sn = snoise(vec2(distAlong * 30.0 - uTime * 4.0, distAcross * 120.0));
              sillageNoise = 0.8 + sn * 0.35 * uRandomness;
            }

            trailLight = acrossGlow * decay * sillageNoise;
          }

          // 3. Étincelles de fragmentation détachées derrière le bolide (HIGH)
          float spallation = 0.0;
          if (uQualityLevel >= 2 && distAlong > 0.05 && distAlong < maxTrailLen * 0.7) {
            vec2 sparkCoord = vec2(distAlong * 45.0, distAcross * 200.0);
            float h = hash12(floor(sparkCoord));
            if (h > 0.82) {
              float dSpark = length(fract(sparkCoord) - 0.5);
              spallation = exp(-dSpark * 6.0) * (1.0 - distAlong / maxTrailLen) * 0.6;
            }
          }

          // Évanouissement en fin de vie
          float lifeFade = smoothstep(0.0, 0.08, progress) * smoothstep(1.0, 0.78, progress);

          float totalLight = (headCore + headGlow + trailLight * 1.3 + spallation) * lifeFade * uIntensity;
          if (totalLight <= 0.005) {
            discard;
          }

          vec3 baseTrail = uUseCustomColor ? uTrailColor : uPaletteAccent;
          vec3 finalRgb = mix(baseTrail, uStarColor, clamp(headCore * 0.9 + trailLight * 0.3, 0.0, 1.0));
          finalRgb += vec3(0.2) * spallation;

          float alpha = clamp(totalLight, 0.0, 0.95);
          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -8
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    if (!this.material) return

    const interval = this.props.starInterval ?? 3.0
    const speed = this.props.speed ?? 1.4
    const duration = 0.85 / Math.max(0.3, speed)

    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < duration) {
      progress = timeSinceManual / duration
    } else {
      const cycleTime = time % (interval * 1.25)
      if (cycleTime < duration) {
        progress = cycleTime / duration
        if (Math.abs(time - this.lastSpawnTime) > interval * 0.5) {
          this.lastSpawnTime = time
          this.material.uniforms.uStarSeed.value = Math.sin(time * 19.3) * 3141.5
        }
      }
    }

    this.material.uniforms.uStarProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'shooting_star') {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
      if (this.material) {
        this.material.uniforms.uStarSeed.value = Math.random() * 888.0
      }
    }
  }

  public updateProps(newProps: Partial<ShootingStarProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.starColor !== undefined) {
      this.starColorVec.set(newProps.starColor)
      this.material.uniforms.uStarColor.value = this.starColorVec
    }
    if (newProps.trailColor !== undefined) {
      this.trailColorVec.set(newProps.trailColor)
      this.material.uniforms.uTrailColor.value = this.trailColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.angle !== undefined) this.material.uniforms.uAngle.value = newProps.angle
    if (newProps.trailLength !== undefined)
      this.material.uniforms.uTrailLength.value = newProps.trailLength
    if (newProps.starInterval !== undefined)
      this.material.uniforms.uStarInterval.value = newProps.starInterval
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

export const ShootingStarDefinition: IBrickDefinition<ShootingStarProps> = {
  type: 'shooting_star',
  category: 'events',
  create: (id, props, context) => new ShootingStarInstance(id, props, context),
}

BrickRegistry.register(ShootingStarDefinition)
