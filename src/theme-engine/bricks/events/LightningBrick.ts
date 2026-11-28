/**
 * src/theme-engine/bricks/events/LightningBrick.ts
 *
 * Brique d'Événement Organique : Éclair & Foudre Atmosphérique.
 * Génère des décharges plasma fractales anguleuses avec ramifications connectées
 * aux nœuds du tronc (forked lightning), canal incandescent blanc-bleu saturé,
 * halo volumétrique épais, illumination interne du nuage et flash lumineux
 * global de scène (100 à 200 ms) avec double impact réaliste (return stroke).
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

export interface LightningProps {
  /** Teinte du canal d'éclair plasma (défaut #c4b5fd). */
  lightningColor?: string
  /** Teinte du flash d'illumination globale du ciel (défaut #ffffff). */
  flashColor?: string
  /** Densité et complexité des ramifications fractales (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de décharge et de dissipation du flash (0.2 à 3.0, défaut 1.2). */
  speed?: number
  /** Profondeur Z et réactivité à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Radiance du plasma et puissance du flash (0.2 à 3.0, défaut 1.3). */
  intensity?: number
  /** Sinuosité, irrégularité et gigue fractale (0.0 à 1.0, défaut 0.55). */
  randomness?: number
  /** Intervalle moyen en secondes entre les frappes automatiques (1.0 à 15.0, défaut 3.5). */
  strikeInterval?: number
  /** Écartement latéral des bifurcations (0.2 à 1.5, défaut 0.6). */
  forkSpread?: number
  /** Durée du flash lumineux global éclairant la scène en secondes (0.08 à 0.35, défaut 0.16). */
  flashDuration?: number
  /** Probabilité d'un double impact / return stroke (0.0 à 1.0, défaut 0.75). */
  doubleStrikeChance?: number
  /** Épaisseur du halo volumétrique autour du trait (0.4 à 2.0, défaut 1.0). */
  haloSize?: number
}

export class LightningInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'lightning'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: LightningProps
  private lightningColorVec: THREE.Color
  private flashColorVec: THREE.Color

  // État temporel non-périodique synchronisé sur le temps moteur
  private startTime: number | null = null
  private nextStrikeTime = 1.45
  private isStriking = false
  private strikeStartTime = 0
  private activeStrikeDuration = 0.75
  private activeHasDouble = true
  private activeFlashDuration = 0.16
  private pendingManualTrigger = false

  constructor(id: string, props: LightningProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.lightningColorVec = new THREE.Color(props.lightningColor ?? '#c4b5fd')
    this.flashColorVec = new THREE.Color(props.flashColor ?? '#ffffff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 1.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.3
    const randomness = props.randomness ?? 0.55
    const strikeInterval = props.strikeInterval ?? 3.5
    const forkSpread = props.forkSpread ?? 0.6
    const flashDuration = props.flashDuration ?? 0.16
    const haloSize = props.haloSize ?? 1.0

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uLightningColor: { value: this.lightningColorVec },
        uFlashColor: { value: this.flashColorVec },
        uUseCustomColor: { value: Boolean(props.lightningColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uStrikeInterval: { value: strikeInterval },
        uForkSpread: { value: forkSpread },
        uFlashDuration: { value: flashDuration },
        uHaloSize: { value: haloSize },
        uStrikeSeed: { value: 13.7 },
        uBoltStrength: { value: 0.0 },
        uFlashStrength: { value: 0.0 },
        uStrikeProgress: { value: 1.0 },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.985, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPaletteAccent;
        uniform vec3 uLightningColor;
        uniform vec3 uFlashColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uStrikeInterval;
        uniform float uForkSpread;
        uniform float uFlashDuration;
        uniform float uHaloSize;
        uniform float uStrikeSeed;
        uniform float uBoltStrength;
        uniform float uFlashStrength;
        uniform float uStrikeProgress;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        // Bruit 1D linéaire par morceaux : produit des cassures anguleuses réalistes (zigzags électriques)
        float zig1D(float x, float seed) {
          float i = floor(x);
          float f = fract(x);
          float a = hash12(vec2(i, seed)) * 2.0 - 1.0;
          float b = hash12(vec2(i + 1.0, seed)) * 2.0 - 1.0;
          return mix(a, b, f);
        }

        // Position X du canal principal à l'altitude normalisée y (1 = haut, 0 = bas)
        float getTrunkX(float y, float seed, float jaggedness, float slant) {
          float env = smoothstep(1.0, 0.85, y) * 0.85 + 0.15;
          float n =
            zig1D(y * 4.5, seed) * 0.13 +
            zig1D(y * 12.0, seed + 17.3) * 0.055 +
            zig1D(y * 29.0, seed + 41.7) * 0.022;
          if (uQualityLevel >= 1) {
            n += zig1D(y * 68.0, seed + 89.1) * 0.0085;
          }
          return (1.0 - y) * slant + n * jaggedness * env;
        }

        // Distance perpendiculaire approximée (compense la pente horizontale des cassures)
        float getTrunkDist(vec2 coord, float seed, float jaggedness, float slant) {
          float eps = 0.005;
          float x0 = getTrunkX(coord.y, seed, jaggedness, slant);
          float slope = (getTrunkX(coord.y + eps, seed, jaggedness, slant) - getTrunkX(coord.y - eps, seed, jaggedness, slant)) / (2.0 * eps);
          float invScale = inversesqrt(1.0 + slope * slope);
          return abs(coord.x - x0) * invScale;
        }

        // Canal de ramification ancré exactement sur une coordonnée parentX à l'altitude branchY
        float getBranchDist(
          vec2 coord,
          float branchY,
          float originX,
          float spreadDir,
          float spreadStrength,
          float bSeed,
          float jaggedness
        ) {
          float dy = branchY - coord.y;
          float z0 = zig1D(branchY * 8.0, bSeed) * 0.065 + zig1D(branchY * 22.0, bSeed + 7.1) * 0.026;
          float z1 = zig1D(coord.y * 8.0, bSeed) * 0.065 + zig1D(coord.y * 22.0, bSeed + 7.1) * 0.026;
          float z1Up = zig1D((coord.y + 0.005) * 8.0, bSeed) * 0.065 + zig1D((coord.y + 0.005) * 22.0, bSeed + 7.1) * 0.026;

          float curve = spreadDir * dy * spreadStrength * (0.65 + 0.5 * sqrt(max(0.0, dy)));
          float x = originX + curve + (z1 - z0) * jaggedness;
          float xUp = originX + spreadDir * (dy - 0.005) * spreadStrength * (0.65 + 0.5 * sqrt(max(0.0, dy - 0.005))) + (z1Up - z0) * jaggedness;

          float slope = (xUp - x) / 0.005;
          return abs(coord.x - x) * inversesqrt(1.0 + slope * slope);
        }

        float renderBoltLayer(float dist, float thicknessScale, float haloScale) {
          float core = exp(-dist * (240.0 / thicknessScale));
          float innerGlow = exp(-dist * (36.0 / (thicknessScale * haloScale)));
          float outerHalo = exp(-dist * (9.5 / haloScale)) * 0.65;
          return core * 1.9 + innerGlow * 0.95 + outerHalo;
        }

        void main() {
          if (uBoltStrength <= 0.003 && uFlashStrength <= 0.003) {
            discard;
          }

          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe souris
          p.x -= uMouse.x * (uDepth * 0.22);
          p.y -= uMouse.y * (uDepth * 0.08);

          float seed = uStrikeSeed;
          float jaggedness = 0.55 + uRandomness * 1.15;
          float impactX = (hash12(vec2(seed, 4.2)) - 0.5) * aspect * 0.68 + uMouse.x * 0.1;
          float slant = (hash12(vec2(seed, 7.9)) - 0.5) * 0.42;

          // Hauteur de départ dans les nuages et d'impact au sol / horizon
          float topY = 0.90 + hash12(vec2(seed, 11.4)) * 0.10;
          float bottomY = 0.02 + hash12(vec2(seed, 15.8)) * 0.14;
          float boltYMask = smoothstep(topY + 0.03, topY - 0.02, uv.y) * smoothstep(bottomY - 0.02, bottomY + 0.05, uv.y);

          // Progression descendante très rapide du leader sur les toutes premières millisecondes
          float leaderReveal = smoothstep(1.0 - min(1.0, uStrikeProgress * 11.0) - 0.12, 1.0 - min(1.0, uStrikeProgress * 11.0), uv.y);
          boltYMask *= mix(leaderReveal, 1.0, smoothstep(0.05, 0.12, uStrikeProgress));

          vec2 arcCoord = vec2(p.x - impactX, uv.y);
          float haloScale = max(0.35, uHaloSize);

          // 1. Canal principal + halo épais
          float distTrunk = getTrunkDist(arcCoord, seed, jaggedness, slant);
          float coreMask = exp(-distTrunk * 240.0) * boltYMask;
          float boltLight = renderBoltLayer(distTrunk, 1.0, haloScale) * boltYMask;

          // Halo atmosphérique large autour du trait principal
          float wideAtmosphere = exp(-distTrunk * (3.2 / haloScale)) * 0.34 * boltYMask;

          // 2. Ramifications fractales connectées aux nœuds du tronc
          if (uDensity > 0.25) {
            float b1Y = 0.72 + (hash12(vec2(seed, 21.1)) - 0.5) * 0.12;
            if (uv.y < b1Y && uv.y > bottomY + 0.05) {
              float b1OriginX = getTrunkX(b1Y, seed, jaggedness, slant);
              float b1Dir = hash12(vec2(seed, 22.3)) > 0.5 ? 1.0 : -1.0;
              float distB1 = getBranchDist(arcCoord, b1Y, b1OriginX, b1Dir, uForkSpread * 0.75, seed + 5.7, jaggedness * 1.15);
              float b1Fade = smoothstep(0.10, b1Y - 0.02, uv.y) * smoothstep(b1Y, b1Y - 0.015, uv.y * 0.99);
              float b1Light = renderBoltLayer(distB1, 0.72, haloScale * 0.85) * 0.78 * b1Fade;
              boltLight += b1Light;
              coreMask = max(coreMask, exp(-distB1 * 280.0) * 0.8 * b1Fade);

              // Sous-ramification tertiaire (HIGH) issue de la branche 1
              if (uQualityLevel >= 2 && uDensity > 0.9) {
                float subY = b1Y - 0.18;
                if (uv.y < subY && uv.y > 0.12) {
                  float subDy = b1Y - subY;
                  float zSub0 = zig1D(b1Y * 8.0, seed + 5.7) * 0.065 + zig1D(b1Y * 22.0, seed + 12.8) * 0.026;
                  float zSub1 = zig1D(subY * 8.0, seed + 5.7) * 0.065 + zig1D(subY * 22.0, seed + 12.8) * 0.026;
                  float subOriginX = b1OriginX + b1Dir * subDy * uForkSpread * 0.75 * (0.65 + 0.5 * sqrt(subDy)) + (zSub1 - zSub0) * jaggedness * 1.15;
                  float distSub = getBranchDist(arcCoord, subY, subOriginX, -b1Dir, uForkSpread * 0.55, seed + 44.2, jaggedness * 1.3);
                  float subFade = smoothstep(0.14, subY - 0.02, uv.y);
                  boltLight += renderBoltLayer(distSub, 0.52, haloScale * 0.7) * 0.52 * subFade;
                }
              }
            }
          }

          if (uQualityLevel >= 1 && uDensity > 0.55) {
            // Deuxième branche haute du côté opposé
            float b2Y = 0.82 + (hash12(vec2(seed, 31.4)) - 0.5) * 0.08;
            if (uv.y < b2Y && uv.y > 0.25) {
              float b2OriginX = getTrunkX(b2Y, seed, jaggedness, slant);
              float b2Dir = hash12(vec2(seed, 22.3)) > 0.5 ? -1.0 : 1.0;
              float distB2 = getBranchDist(arcCoord, b2Y, b2OriginX, b2Dir, uForkSpread * 0.65, seed + 13.9, jaggedness * 1.2);
              float b2Fade = smoothstep(0.25, b2Y - 0.03, uv.y);
              boltLight += renderBoltLayer(distB2, 0.64, haloScale * 0.8) * 0.68 * b2Fade;
              coreMask = max(coreMask, exp(-distB2 * 290.0) * 0.7 * b2Fade);
            }
          }

          if (uQualityLevel >= 2 && uDensity > 1.15) {
            // Troisième branche basse proche de l'impact
            float b3Y = 0.46 + (hash12(vec2(seed, 51.7)) - 0.5) * 0.1;
            if (uv.y < b3Y && uv.y > bottomY + 0.02) {
              float b3OriginX = getTrunkX(b3Y, seed, jaggedness, slant);
              float b3Dir = hash12(vec2(seed, 53.2)) > 0.5 ? 1.0 : -1.0;
              float distB3 = getBranchDist(arcCoord, b3Y, b3OriginX, b3Dir, uForkSpread * 0.85, seed + 27.4, jaggedness * 1.3);
              float b3Fade = smoothstep(bottomY + 0.02, b3Y - 0.02, uv.y);
              boltLight += renderBoltLayer(distB3, 0.55, haloScale * 0.7) * 0.58 * b3Fade;
            }
          }

          // 3. Point d'émergence lumineux dans les nuages + flash global qui éclaire toute la scène
          float cloudOriginX = getTrunkX(topY, seed, jaggedness, slant) + impactX;
          float cloudDist = length(p - vec2(cloudOriginX, topY - 0.5));
          float cloudScatter = exp(-cloudDist * 2.6) * 0.65 * uFlashStrength;

          // Flash lumineux global couvrant toute la scène (nuages + paysage en contre-jour)
          float verticalFlashGrad = 0.72 + 0.42 * smoothstep(0.15, 0.95, uv.y);
          float sceneFlash = uFlashStrength * verticalFlashGrad * 0.58;

          // Assemblage couleur : cœur blanc incandescent, plasma coloré dans le halo
          vec3 baseColor = uUseCustomColor ? uLightningColor : uPaletteAccent;
          vec3 plasmaColor = mix(baseColor, vec3(0.97, 0.99, 1.0), clamp(coreMask * 1.35 + 0.18, 0.0, 1.0));
          vec3 flashTint = mix(uFlashColor, baseColor, 0.22);

          vec3 boltRgb = plasmaColor * (boltLight + wideAtmosphere) * uBoltStrength;
          vec3 flashRgb = flashTint * (sceneFlash + cloudScatter);

          vec3 finalRgb = boltRgb + flashRgb;
          float alpha = clamp((boltLight * 0.9 + wideAtmosphere * 0.65) * uBoltStrength + sceneFlash + cloudScatter * 0.7, 0.0, 0.96);

          if (alpha <= 0.004) {
            discard;
          }

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
    this.mesh.renderOrder = -10
    this.scene.add(this.mesh)
  }

  public init(): void {}

  private startStrike(now: number, seed?: number): void {
    const speed = Math.max(0.2, this.props.speed ?? 1.2)
    const doubleChance = this.props.doubleStrikeChance ?? 0.75
    const flashDur = Math.max(0.08, Math.min(0.35, this.props.flashDuration ?? 0.16))

    this.isStriking = true
    this.strikeStartTime = now
    this.activeHasDouble = Math.random() < doubleChance
    this.activeFlashDuration = flashDur / Math.sqrt(speed)
    this.activeStrikeDuration = (this.activeHasDouble ? 0.78 : 0.52) / speed

    if (this.material) {
      this.material.uniforms.uStrikeSeed.value = seed ?? Math.random() * 900.0 + 10.0
    }
  }

  public update(_delta: number, time: number): void {
    if (!this.material || !this.mesh) return

    if (this.startTime === null) {
      this.startTime = time
      const interval = Math.max(1.0, this.props.strikeInterval ?? 3.5)
      this.nextStrikeTime = time + Math.min(1.45, interval * 0.42)
    }

    if (this.pendingManualTrigger) {
      this.pendingManualTrigger = false
      this.startStrike(time)
    } else if (!this.isStriking && time >= this.nextStrikeTime) {
      this.startStrike(time)
    }

    let boltStrength = 0.0
    let flashStrength = 0.0
    let progress = 1.0

    if (this.isStriking) {
      const elapsed = time - this.strikeStartTime
      if (elapsed >= this.activeStrikeDuration) {
        this.isStriking = false
        const interval = Math.max(1.0, this.props.strikeInterval ?? 3.5)
        // Intervalle irrégulier entre frappes
        this.nextStrikeTime = time + interval * (0.65 + Math.random() * 0.85)
      } else {
        progress = elapsed / this.activeStrikeDuration
        const intensity = this.props.intensity ?? 1.3
        const flashEnd = this.activeFlashDuration

        // 1. Premier impact + flash global de 100 à 200 ms
        if (elapsed < flashEnd) {
          const fNorm = elapsed / flashEnd
          const rise = Math.min(1.0, elapsed / 0.018)
          const fall = Math.exp(-fNorm * 2.2)
          flashStrength = rise * fall * 1.05
          boltStrength = rise * (1.25 - fNorm * 0.35)
        } else if (this.activeHasDouble) {
          const gapEnd = flashEnd + 0.075
          const secondFlashEnd = gapEnd + flashEnd * 0.85

          if (elapsed < gapEnd) {
            // Micro-extinction entre les deux impacts (canal résiduel faible)
            const gNorm = (elapsed - flashEnd) / 0.075
            boltStrength = 0.22 * (1.0 - gNorm * 0.6)
            flashStrength = 0.12 * (1.0 - gNorm)
          } else if (elapsed < secondFlashEnd) {
            // Second impact (return stroke) très vif avec ré-illumination de la scène
            const sElapsed = elapsed - gapEnd
            const sNorm = sElapsed / (secondFlashEnd - gapEnd)
            const sRise = Math.min(1.0, sElapsed / 0.015)
            boltStrength = sRise * (1.15 - sNorm * 0.28)
            flashStrength = sRise * Math.exp(-sNorm * 2.0) * 0.82
          } else {
            // Extinction avec légère scintillation ionisée
            const tailNorm =
              (elapsed - secondFlashEnd) /
              Math.max(0.05, this.activeStrikeDuration - secondFlashEnd)
            const flicker = 0.88 + 0.12 * Math.sin(elapsed * 95.0)
            boltStrength = 0.72 * Math.exp(-tailNorm * 4.2) * flicker
            flashStrength = 0.22 * Math.exp(-tailNorm * 5.5)
          }
        } else {
          // Impact simple avec extinction progressive
          const tailNorm =
            (elapsed - flashEnd) / Math.max(0.05, this.activeStrikeDuration - flashEnd)
          boltStrength = 0.82 * Math.exp(-tailNorm * 4.0)
          flashStrength = 0.25 * Math.exp(-tailNorm * 5.0)
        }

        boltStrength *= intensity
        flashStrength *= intensity
      }
    }

    this.mesh.visible = boltStrength > 0.003 || flashStrength > 0.003
    this.material.uniforms.uBoltStrength.value = boltStrength
    this.material.uniforms.uFlashStrength.value = flashStrength
    this.material.uniforms.uStrikeProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'lightning') {
      this.pendingManualTrigger = true
    }
  }

  public updateProps(newProps: Partial<LightningProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.lightningColor !== undefined) {
      this.lightningColorVec.set(newProps.lightningColor)
      this.material.uniforms.uLightningColor.value = this.lightningColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.flashColor !== undefined) {
      this.flashColorVec.set(newProps.flashColor)
      this.material.uniforms.uFlashColor.value = this.flashColorVec
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.strikeInterval !== undefined)
      this.material.uniforms.uStrikeInterval.value = newProps.strikeInterval
    if (newProps.forkSpread !== undefined)
      this.material.uniforms.uForkSpread.value = newProps.forkSpread
    if (newProps.flashDuration !== undefined)
      this.material.uniforms.uFlashDuration.value = newProps.flashDuration
    if (newProps.haloSize !== undefined) this.material.uniforms.uHaloSize.value = newProps.haloSize
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

export const LightningDefinition: IBrickDefinition<LightningProps> = {
  type: 'lightning',
  category: 'events',
  create: (id, props, context) => new LightningInstance(id, props, context),
}

BrickRegistry.register(LightningDefinition)
