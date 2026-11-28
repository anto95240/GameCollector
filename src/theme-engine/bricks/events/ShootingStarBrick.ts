/**
 * src/theme-engine/bricks/events/ShootingStarBrick.ts
 *
 * Brique d'Événement Organique : Étoile Filante & Météore Traversant.
 * Bolide hypersonique fendant la voûte céleste selon un angle et une vitesse
 * variables, avec tête brillante incandescente, longue traînée spectrale qui
 * s'estompe progressivement, apparition rare non-périodique et fragmentation
 * légère réaliste en fin de course.
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
  /** Densité et fréquence relative des météores (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vélocité moyenne de traversée (0.2 à 3.0, défaut 1.4). */
  speed?: number
  /** Profondeur Z et réactivité à la parallaxe (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Radiance et émission lumineuse de la traînée (0.2 à 3.0, défaut 1.25). */
  intensity?: number
  /** Variabilité des angles d'entrée, positions et vitesses (0.0 à 1.0, défaut 0.45). */
  randomness?: number
  /** Angle d'incidence nominal en radians (-2.0 à 2.0, défaut -0.65). */
  angle?: number
  /** Longueur d'étirement de la traînée de plasma (0.3 à 2.5, défaut 1.2). */
  trailLength?: number
  /** Intervalle moyen en secondes entre apparitions rares (1.0 à 15.0, défaut 3.0). */
  starInterval?: number
  /** Intensité de la fragmentation légère en fin de course (0.0 à 1.5, défaut 0.65). */
  fragmentation?: number
  /** Richesse de la teinte spectrale colorée le long de la traînée (0.0 à 1.0, défaut 0.6). */
  colorShift?: number
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

  private startTime: number | null = null
  private nextSpawnTime = 1.35
  private isActive = false
  private starStartTime = 0
  private activeDuration = 0.85
  private pendingManualTrigger = false

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
    const fragmentation = props.fragmentation ?? 0.65
    const colorShift = props.colorShift ?? 0.6

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
        uFragmentation: { value: fragmentation },
        uColorShift: { value: colorShift },
        uStarSeed: { value: 7.3 },
        uStarProgress: { value: 1.0 },
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
        uniform float uFragmentation;
        uniform float uColorShift;
        uniform float uStarSeed;
        uniform float uStarProgress;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          float progress = uStarProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe perspective
          p += uMouse * (uDepth * 0.15);

          float seed = uStarSeed;
          float r1 = hash12(vec2(seed, 2.3));
          float r2 = hash12(vec2(seed, 5.9));
          float r3 = hash12(vec2(seed, 8.7));
          float r4 = hash12(vec2(seed, 14.1));

          // Angle variable (possibilité d'entrée miroir si randomness élevé)
          float theta = uAngle + (r1 - 0.5) * (0.28 + uRandomness * 0.95);
          if (uRandomness > 0.45 && r2 > 0.65) {
            theta = sign(theta) * 3.14159 - theta;
          }
          vec2 dir = vec2(cos(theta), sin(theta));
          vec2 perp = vec2(-dir.y, dir.x);

          // Position de départ et longueur de course variables dans la voûte céleste
          float startX = (r3 - 0.5) * aspect * 0.95 - dir.x * 0.72;
          float startY = 0.22 + r4 * 0.32 - dir.y * 0.28;
          vec2 startPos = vec2(startX, startY);
          float travelDist = 1.45 + r2 * 0.65;
          vec2 endPos = startPos + dir * travelDist;

          // Vitesse non-linéaire : entrée rapide puis légère décélération atmosphérique
          float easedProgress = 1.0 - pow(1.0 - progress, 1.32);
          vec2 headPos = mix(startPos, endPos, easedProgress);

          // Enveloppe globale d'éclat (montée rapide d'ionisation puis extinction douce)
          float lifeFade = smoothstep(0.0, 0.14, progress) * pow(1.0 - smoothstep(0.62, 1.0, progress), 1.4);
          // Léger sursaut lumineux d'ablation avant la fin de course
          float flareBoost = 1.0 + 0.35 * exp(-pow((progress - 0.58) / 0.14, 2.0));

          // Coordonnées locales par rapport à la tête
          vec2 d = p - headPos;
          float distAlong = -dot(d, dir);
          float distAcross = abs(dot(d, perp));

          // 1. Tête brillante (noyau incandescent + coma allongée)
          float headRadius = 0.0048 * (0.65 + 0.35 * uIntensity);
          vec2 headLocal = vec2(dot(d, dir) * 0.72, dot(d, perp) * 1.25);
          float headDist = length(headLocal);
          float headCore = exp(-headDist / (headRadius * 0.55)) * 2.5;
          float headGlow = exp(-headDist / (headRadius * 3.8)) * 0.85;

          // 2. Longue traînée effilée qui s'estompe progressivement
          float maxTrailLen = (0.72 + 0.25 * r2) * uTrailLength * smoothstep(0.0, 0.28, progress);
          float trailLight = 0.0;
          float trailCore = 0.0;
          float tailU = 0.0;

          if (distAlong > 0.0 && distAlong < maxTrailLen) {
            tailU = distAlong / maxTrailLen;
            // Atténuation continue vers la queue
            float longitudinalDecay = pow(1.0 - tailU, 2.25);

            // Profil fin au noyau et halo ionisé légèrement évasé puis affiné en pointe
            float coreWidth = mix(0.0022, 0.0008, tailU);
            float haloWidth = mix(0.0038, 0.0072, sqrt(tailU)) * (1.0 - tailU * 0.35);

            float coreProfile = exp(-distAcross / coreWidth);
            float haloProfile = exp(-distAcross / haloWidth);

            // Micro-turbulence de sillage sur HIGH
            float sillage = 1.0;
            if (uQualityLevel >= 2) {
              float sn = snoise(vec2(distAlong * 26.0 - uTime * 3.5, distAcross * 110.0 + seed));
              sillage = 0.86 + sn * 0.24 * uRandomness;
            }

            trailCore = coreProfile * pow(1.0 - tailU, 3.0) * 1.4;
            trailLight = (haloProfile * 0.85 + coreProfile * 0.7) * longitudinalDecay * sillage;
          }

          // 3. Fragmentation légère en fin de course (HIGH & MEDIUM)
          float fragLight = 0.0;
          float fragWarmth = 0.0;
          if (uQualityLevel >= 1 && uFragmentation > 0.02 && progress > 0.45) {
            float fragProgress = (progress - 0.45) / 0.55;
            int fragCount = uQualityLevel >= 2 ? 3 : 2;
            for (int i = 0; i < 3; i++) {
              if (i >= fragCount) break;
              float fi = float(i);
              float splitAt = 0.45 + 0.07 * fi;
              if (progress > splitAt) {
                float fp = (progress - splitAt) / (1.0 - splitAt);
                float side = (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) * (0.014 + 0.012 * hash12(vec2(seed, 30.0 + fi)));
                // Chaque fragment ralentit par rapport à la tête et dérive légèrement
                float lag = (0.055 + 0.045 * fi) * pow(fp, 1.35);
                vec2 fragPos = headPos - dir * lag + perp * (side * fp * 2.2);

                vec2 fd = p - fragPos;
                float fAlong = -dot(fd, dir);
                float fAcross = abs(dot(fd, perp));
                float fFade = smoothstep(0.0, 0.12, fp) * pow(1.0 - fp, 1.8);

                float fPoint = exp(-length(fd) / 0.0026) * 1.1;
                float fStreak = (fAlong > 0.0 && fAlong < 0.065)
                  ? exp(-fAcross / 0.0016) * pow(1.0 - fAlong / 0.065, 2.0) * 0.7
                  : 0.0;

                float contrib = (fPoint + fStreak) * fFade * uFragmentation;
                fragLight += contrib;
                fragWarmth += contrib;
              }
            }
          }

          float headTotal = (headCore + headGlow) * flareBoost;
          float totalLight = (headTotal + trailLight * 1.15 + trailCore * 0.5) * lifeFade * uIntensity + fragLight * uIntensity;

          if (totalLight <= 0.004) {
            discard;
          }

          // Teinte spectrale réaliste : cœur blanc, traînée légèrement colorée (cyan/ionisé puis ambre doux en queue)
          vec3 baseTrail = uUseCustomColor ? uTrailColor : uPaletteAccent;
          vec3 coolTail = vec3(0.95, 0.62, 0.36);
          vec3 ionizedColor = mix(baseTrail, coolTail, smoothstep(0.35, 0.95, tailU) * uColorShift * 0.45);
          vec3 trailMixColor = mix(uStarColor, ionizedColor, clamp(uColorShift * (0.35 + tailU * 0.75), 0.0, 0.95));

          float headDominance = clamp((headTotal + trailCore) / max(0.001, headTotal + trailLight + trailCore), 0.0, 1.0);
          vec3 finalRgb = mix(trailMixColor, uStarColor, headDominance * 0.9);
          finalRgb = mix(finalRgb, vec3(1.0, 0.74, 0.42), clamp(fragWarmth * 0.7, 0.0, 0.85));

          float alpha = clamp(totalLight * 0.88, 0.0, 0.96);
          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.renderOrder = -8
    this.scene.add(this.mesh)
  }

  public init(): void {}

  private spawnStar(now: number, seed?: number): void {
    const speed = Math.max(0.25, this.props.speed ?? 1.4)
    const randomness = this.props.randomness ?? 0.45
    // Vitesse variable par apparition
    const speedVariation = 1.0 + (Math.random() - 0.5) * (0.3 + randomness * 0.55)
    this.isActive = true
    this.starStartTime = now
    this.activeDuration = Math.max(0.4, 0.95 / speed / Math.max(0.55, speedVariation))

    if (this.material) {
      this.material.uniforms.uStarSeed.value = seed ?? Math.random() * 888.0 + 1.0
    }
  }

  public update(_delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    if (this.startTime === null) {
      this.startTime = time
      const interval = Math.max(1.0, this.props.starInterval ?? 3.0)
      this.nextSpawnTime = time + Math.min(1.4, interval * 0.45)
    }

    if (this.pendingManualTrigger) {
      this.pendingManualTrigger = false
      this.spawnStar(time)
    } else if (!this.isActive && time >= this.nextSpawnTime) {
      this.spawnStar(time)
    }

    let progress = 1.0
    if (this.isActive) {
      const elapsed = time - this.starStartTime
      if (elapsed >= this.activeDuration) {
        this.isActive = false
        const interval = Math.max(1.0, this.props.starInterval ?? 3.0)
        const densityFactor = 1.0 / Math.max(0.4, Math.min(2.0, this.props.density ?? 1.0))
        // Apparition rare et non-périodique
        this.nextSpawnTime = time + interval * densityFactor * (0.75 + Math.random() * 1.15)
      } else {
        progress = elapsed / this.activeDuration
      }
    }

    this.mesh.visible = progress < 1.0
    this.material.uniforms.uStarProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'shooting_star') {
      this.pendingManualTrigger = true
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
    if (newProps.fragmentation !== undefined)
      this.material.uniforms.uFragmentation.value = newProps.fragmentation
    if (newProps.colorShift !== undefined)
      this.material.uniforms.uColorShift.value = newProps.colorShift
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
