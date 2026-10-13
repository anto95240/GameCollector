/**
 * src/theme-engine/bricks/events/LightningBrick.ts
 *
 * Brique d'Événement Organique : Éclair & Foudre Atmosphérique.
 * Génère des décharges plasma fractales avec ramifications (forked lightning),
 * canal incandescent blanc-bleu saturé, halo volumétrique diffus et flash
 * d'illumination du ciel stochastique à retours multiples (return strokes).
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

  // État temporel d'impact
  private lastStrikeTime = 0
  private manualTriggerTime = 0

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
        uStrikeSeed: { value: 1.0 },
        uStrikeProgress: { value: 0.0 }, // 0.0 (début impact) à 1.0 (éteint)
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Ordre de rendu dans la couche atmosphère / premier plan
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
        uniform float uStrikeSeed;
        uniform float uStrikeProgress;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Trace une trajectoire d'arc électrique avec bruit fractal
        float getArcDistance(vec2 p, float seed, float jaggedness) {
          // p.y va de 1.0 (haut) à 0.0 (bas)
          float y = clamp(p.y, 0.0, 1.0);
          
          // Trajectoire moyenne avec courbure vers la cible
          float trunkOffset = sin(y * 3.1415 + seed) * 0.15;
          
          // Déplacement fractal haute fréquence
          float n1 = snoise(vec2(y * 6.0, seed * 13.7)) * 0.18 * jaggedness;
          float n2 = snoise(vec2(y * 18.0, seed * 29.3)) * 0.06 * jaggedness;
          float n3 = snoise(vec2(y * 42.0, seed * 71.1)) * 0.02 * jaggedness;
          
          float arcX = trunkOffset + n1 + n2 + n3;
          return abs(p.x - arcX);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe souris douce
          p.x -= uMouse.x * (uDepth * 0.2);

          // Phase de frappe et profil de luminosité (multiples décharges / return strokes)
          float progress = uStrikeProgress;
          if (progress >= 1.0 || progress < 0.0) {
            discard;
          }

          // Évolution du flash avec décharge primaire + double sursaut stochastique
          // 0 -> 0.1 : flash fulgurant initial
          // 0.1 -> 0.35 : baisse brève
          // 0.35 -> 0.5 : second return stroke
          // 0.5 -> 1.0 : dissipation exponentielle
          float strikePulse = 0.0;
          if (progress < 0.12) {
            strikePulse = smoothstep(0.0, 0.03, progress) * (1.0 - (progress / 0.12) * 0.3);
          } else if (progress < 0.35) {
            strikePulse = 0.7 * (1.0 - (progress - 0.12) / 0.23);
          } else if (progress < 0.55) {
            // Deuxième décharge
            float p2 = (progress - 0.35) / 0.2;
            strikePulse = mix(0.3, 0.85, sin(p2 * 3.1415));
          } else {
            // Traîneau d'extinction
            float p3 = (progress - 0.55) / 0.45;
            strikePulse = 0.55 * exp(-p3 * 4.5);
          }

          strikePulse = clamp(strikePulse * uIntensity, 0.0, 2.5);
          if (strikePulse <= 0.005) {
            discard;
          }

          // Décalage horizontal du point d'impact selon la graine et attraction souris
          float impactX = (hash12(vec2(uStrikeSeed, 4.2)) - 0.5) * 0.9 + uMouse.x * 0.15;
          vec2 arcCoord = vec2(p.x - impactX, uv.y);

          // 1. Arc principal
          float distTrunk = getArcDistance(arcCoord, uStrikeSeed, uRandomness);
          float trunkCore = exp(-distTrunk * 280.0); // Canal ultra-fin
          float trunkGlow = exp(-distTrunk * 35.0);  // Halo immédiat
          float trunkSheet = exp(-distTrunk * 6.0) * 0.3; // Diffusion proche

          float boltLight = trunkCore * 1.5 + trunkGlow * 0.8 + trunkSheet;

          // 2. Ramifications (forks secondaires) selon le palier qualité
          if (uQualityLevel >= 1 && uDensity > 0.3) {
            // Fork 1 : bifurcation à mi-hauteur
            if (uv.y < 0.75) {
              vec2 fork1Coord = arcCoord;
              fork1Coord.x -= (0.75 - uv.y) * uForkSpread * 0.8;
              float distFork1 = getArcDistance(fork1Coord, uStrikeSeed + 5.7, uRandomness * 1.2);
              float fork1 = exp(-distFork1 * 220.0) * 0.7 + exp(-distFork1 * 30.0) * 0.35;
              boltLight += fork1 * smoothstep(0.75, 0.65, uv.y) * smoothstep(0.1, 0.25, uv.y);
            }

            // Fork 2 : bifurcation haute opposée
            if (uv.y < 0.9 && uv.y > 0.35 && uDensity > 0.8) {
              vec2 fork2Coord = arcCoord;
              fork2Coord.x += (0.9 - uv.y) * uForkSpread * 0.7;
              float distFork2 = getArcDistance(fork2Coord, uStrikeSeed + 11.3, uRandomness * 1.1);
              float fork2 = exp(-distFork2 * 200.0) * 0.6 + exp(-distFork2 * 28.0) * 0.3;
              boltLight += fork2 * smoothstep(0.9, 0.8, uv.y) * smoothstep(0.3, 0.45, uv.y);
            }
          }

          if (uQualityLevel >= 2 && uDensity > 1.2) {
            // Fork 3 fin : micro-ramification d'avant-sol
            if (uv.y < 0.45) {
              vec2 fork3Coord = arcCoord;
              fork3Coord.x -= (0.45 - uv.y) * uForkSpread * 1.1;
              float distFork3 = getArcDistance(fork3Coord, uStrikeSeed + 19.8, uRandomness * 1.4);
              float fork3 = exp(-distFork3 * 260.0) * 0.45;
              boltLight += fork3 * smoothstep(0.45, 0.35, uv.y);
            }
          }

          // 3. Flash atmosphérique global (illumination instantanée du ciel)
          float skyFlash = strikePulse * (0.15 + (1.0 - uv.y) * 0.12);
          skyFlash *= smoothstep(0.0, 0.05, progress) * exp(-progress * 5.0);

          // Assemblage couleur : blanc éclatant au cœur du canal, plasma teinté dans le halo
          vec3 baseColor = uUseCustomColor ? uLightningColor : uPaletteAccent;
          vec3 plasmaColor = mix(baseColor, vec3(1.0), trunkCore * 0.85);
          vec3 flashRgb = uFlashColor * skyFlash;

          vec3 finalRgb = plasmaColor * boltLight * strikePulse + flashRgb;
          float alpha = clamp((boltLight * 0.95 + skyFlash * 0.7) * strikePulse, 0.0, 0.98);

          if (alpha <= 0.005) {
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
    this.mesh.renderOrder = -10 // Atmosphère / ciel supérieur
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, time: number): void {
    if (!this.material) return

    const interval = this.props.strikeInterval ?? 3.5
    const speed = this.props.speed ?? 1.2
    const strikeDuration = 0.55 / Math.max(0.2, speed)

    // Vérifier si un impact manuel ou automatique doit être calculé
    const timeSinceManual = time - this.manualTriggerTime
    let progress = 1.0

    if (this.manualTriggerTime > 0 && timeSinceManual < strikeDuration) {
      progress = timeSinceManual / strikeDuration
    } else {
      // Cycle automatique avec perturbation stochastique
      const cycleTime = time % (interval * 1.35)
      // Fenêtre d'impact
      if (cycleTime < strikeDuration) {
        progress = cycleTime / strikeDuration
        if (Math.abs(time - this.lastStrikeTime) > interval * 0.5) {
          this.lastStrikeTime = time
          // Nouvelle graine fractale aléatoire
          this.material.uniforms.uStrikeSeed.value = Math.sin(time * 31.7) * 4375.8
        }
      }
    }

    this.material.uniforms.uStrikeProgress.value = progress
  }

  public triggerEvent(event: RareEventTrigger): void {
    if (event.type === 'lightning') {
      const now = performance.now() / 1000
      this.manualTriggerTime = now
      if (this.material) {
        this.material.uniforms.uStrikeSeed.value = Math.random() * 999.0
      }
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
