/**
 * src/theme-engine/bricks/atmosphere/LaserBeamBrick.ts
 *
 * Brique d'ambiance Atmosphérique : Faisceaux Laser & Flux Plasma (Couche 4 : Atmosphere).
 * Shader SDF analytique plein écran (1 draw call, sans FBO) générant 1 à 3 rayons
 * collimatés à cœur blanc incandescent et halo exponentiel coloré :
 * - 'tactical' : laser chirurgical net traversant la brume avec point d'impact (Shadow Agent, Red Room, Judgment Day)
 * - 'orbital' : rayon destructeur massif avec ondes pulsantes et halo au sol (The Invasion)
 * - 'plasma_stream' : flux ionisé sinueux à double hélice instable (Proton Pack)
 *
 * Mouvement non-linéaire (harmoniques irrationnelles + Simplex), diffusion dans la brume,
 * déviation douce à la souris et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type LaserBeamMode = 'tactical' | 'orbital' | 'plasma_stream'

export interface LaserBeamProps {
  /** Teinte principale du faisceau et de son halo (défaut #ef4444 ou uPaletteAccent). */
  coreColor?: string
  /** Teinte secondaire pour frange ionisée / double flux plasma (défaut #38bdf8). */
  secondaryColor?: string
  /** Comportement géométrique du rayon (défaut 'tactical'). */
  beamMode?: LaserBeamMode
  /** Nombre de faisceaux simultanés (1 à 3, défaut 1). */
  beamCount?: number
  /** Épaisseur relative du cœur du faisceau (0.004 à 0.08, défaut 0.012). */
  beamWidth?: number
  /** Inclinaison de base en radians (défaut -0.45). */
  angle?: number
  /** Instabilité sinueuse / électrique du faisceau (0.0 à 1.0, défaut 0.0). */
  wobble?: number
  /** Cadence de balayage cible non-linéaire (0.0 à 1.5, défaut 0.25). */
  sweepSpeed?: number
  /** Intensité de pulsation et scintillement énergétique (0.0 à 1.0, défaut 0.35). */
  pulseIntensity?: number
  /** Intensité du foyer lumineux et des étincelles au point d'impact (0.0 à 1.0, défaut 0.5). */
  impactSparks?: number
  /** Densité et portée du halo atmosphérique (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Profondeur et sensibilité à la souris/scroll (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.15). */
  intensity?: number
  /** Irrégularité organique des trajectoires et turbulence (0.0 à 1.0, défaut 0.4). */
  randomness?: number
}

const BEAM_MODE_MAP: Record<LaserBeamMode, number> = {
  tactical: 0,
  orbital: 1,
  plasma_stream: 2,
}

export class LaserBeamInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'laser_beam'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: LaserBeamProps
  private coreColorVec: THREE.Color
  private secondaryColorVec: THREE.Color

  constructor(id: string, props: LaserBeamProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.coreColorVec = new THREE.Color(props.coreColor ?? '#ef4444')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#38bdf8')

    const beamModeIdx = BEAM_MODE_MAP[props.beamMode ?? 'tactical'] ?? 0
    const beamCount = Math.min(3, Math.max(1, Math.round(props.beamCount ?? 1)))
    const beamWidth = props.beamWidth ?? 0.012
    const angle = props.angle ?? -0.45
    const wobble = props.wobble ?? 0.0
    const sweepSpeed = props.sweepSpeed ?? 0.25
    const pulseIntensity = props.pulseIntensity ?? 0.35
    const impactSparks = props.impactSparks ?? 0.5
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.15
    const randomness = props.randomness ?? 0.4

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uCoreColor: { value: this.coreColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColor: { value: Boolean(props.coreColor) },
        uUseSecondaryColor: { value: Boolean(props.secondaryColor) },
        uBeamMode: { value: beamModeIdx },
        uBeamCount: { value: beamCount },
        uBeamWidth: { value: beamWidth },
        uAngle: { value: angle },
        uWobble: { value: wobble },
        uSweepSpeed: { value: sweepSpeed },
        uPulseIntensity: { value: pulseIntensity },
        uImpactSparks: { value: impactSparks },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.980, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCoreColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColor;
        uniform bool uUseSecondaryColor;
        uniform int uBeamMode;
        uniform int uBeamCount;
        uniform float uBeamWidth;
        uniform float uAngle;
        uniform float uWobble;
        uniform float uSweepSpeed;
        uniform float uPulseIntensity;
        uniform float uImpactSparks;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Balayage non-linéaire avec pauses subtiles de visée tactique
        float tacticalSweep(float t, float seed) {
          float w1 = sin(t * 0.85 + seed * 4.1);
          float w2 = sin(t * 1.38196 + seed * 8.7) * 0.42;
          float w3 = sin(t * 0.5236 - seed * 2.9) * 0.30;
          float n = snoise(vec2(t * 0.28 + seed * 3.7, seed * 1.9)) * (0.45 * uRandomness);
          float raw = (w1 + w2 + w3) * 0.58 + n;
          // Légère compression aux extrêmes pour simuler le verrouillage d'une cible
          return raw - 0.16 * sin(raw * 2.4);
        }

        // Distance d'un point p à un segment [a, b] et coordonnée paramétrique tSeg in [0, 1]
        vec2 sdSegmentWithT(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a;
          vec2 ba = b - a;
          float h = clamp(dot(pa, ba) / max(0.0001, dot(ba, ba)), 0.0, 1.0);
          return vec2(length(pa - ba * h), h);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * max(0.02, uSpeed) * (0.45 + uSweepSpeed * 1.8);
          vec2 mouseShift = uMouse * (uDepth * 0.22);
          float scrollShift = uScroll * (uDepth * 0.08);

          vec3 col1 = uUseCustomColor ? uCoreColor : uPaletteAccent;
          vec3 col2 = uUseSecondaryColor
            ? uSecondaryColor
            : (uBeamMode == 2 ? uSecondaryColor : (uUseCustomColor ? col1 : uPalettePrimary));

          int activeCount = uBeamCount;
          if (uQualityLevel == 0 && activeCount > 1) {
            activeCount = (uBeamMode == 2) ? 2 : 1;
          }

          float baseWidth = max(0.0025, uBeamWidth * (0.85 + 0.15 * uDensity));
          vec3 accumColor = vec3(0.0);
          float accumAlpha = 0.0;

          for (int i = 0; i < 3; i++) {
            if (i >= activeCount) break;
            float fi = float(i);
            float centerIdx = fi - 0.5 * float(activeCount - 1);

            float sweep = tacticalSweep(t, 1.7 + fi * 3.3);
            float curAngle = uAngle + sweep * (uBeamMode == 1 ? 0.14 : 0.26) + centerIdx * 0.18;
            vec2 dir = vec2(cos(curAngle), sin(curAngle));

            vec2 origin;
            vec2 target;

            if (uBeamMode == 1) {
              // === ORBITAL : rayon destructeur descendant du zénith vers le sol ===
              if (dir.y > 0.0) dir = -dir;
              float xPos = centerIdx * 0.24 * aspect + sweep * 0.16 * aspect + mouseShift.x * 0.85;
              target = vec2(xPos, -0.34 + scrollShift * 0.5 + mouseShift.y * 0.25);
              origin = target - dir * 1.25;
            } else if (uBeamMode == 2) {
              // === PLASMA_STREAM : flux ionisés sinueux convergeant vers une cible interactive ===
              float side = (mod(fi, 2.0) < 0.5) ? -1.0 : 1.0;
              origin = vec2(-0.56 * aspect, side * 0.22 + centerIdx * 0.12) + mouseShift * 0.25;
              target = vec2(0.32 * aspect, -0.05 + scrollShift * 0.4) + mouseShift * 1.25;
              // Inclinaison globale modulable par uAngle
              vec2 baseSpan = target - origin;
              float angDelta = uAngle * 0.45;
              float ca = cos(angDelta), sa = sin(angDelta);
              target = origin + vec2(baseSpan.x * ca - baseSpan.y * sa, baseSpan.x * sa + baseSpan.y * ca);
            } else {
              // === TACTICAL : rayon laser net traversant l'écran ===
              vec2 pivot = vec2(centerIdx * 0.22 * aspect, -0.06 + scrollShift * 0.5) + mouseShift;
              origin = pivot - dir * 1.35;
              // Si impactSparks est actif, le rayon termine dans la scène sur une cible
              float targetSpan = (uImpactSparks > 0.02) ? (0.48 + 0.14 * sin(t * 0.55 + fi * 2.7)) : 1.35;
              target = pivot + dir * targetSpan;
            }

            vec2 segInfo = sdSegmentWithT(p, origin, target);
            float dist = segInfo.x;
            float along = segInfo.y;

            // Torsion sinueuse / électrique pour plasma_stream ou wobble > 0
            float wobbleAmt = (uBeamMode == 2) ? max(0.24, uWobble) : uWobble;
            if (wobbleAmt > 0.01) {
              vec2 segVec = normalize(target - origin);
              vec2 perp = vec2(-segVec.y, segVec.x);
              float signedPerp = dot(p - origin, perp);
              float pinEnv = smoothstep(0.0, 0.15, along) * (uBeamMode == 2 ? smoothstep(1.0, 0.72, along) : 1.0);
              float wave = sin(along * 16.0 - uTime * (6.0 + uSpeed * 8.0) + fi * 2.1) * 0.55
                + sin(along * 29.0 + uTime * 11.3 + fi * 4.4) * 0.35;
              if (uQualityLevel >= 1) {
                wave += snoise(vec2(along * 5.5 - uTime * (2.2 + uSpeed * 2.5), fi * 3.7 + uTime * 0.6)) * 0.85;
              }
              float offset = wave * wobbleAmt * 0.075 * pinEnv;
              dist = abs(signedPerp - offset);
              // Contrainte longitudinale au segment
              if (along <= 0.0 || along >= 1.0) {
                dist = max(dist, segInfo.x);
              }
            }

            // Pulsation organique irrégulière du faisceau
            float pulseNoise = 0.5 + 0.5 * sin(uTime * (5.2 + fi * 1.9) + snoise(vec2(uTime * 2.4, fi * 4.1)) * 2.5);
            float pulseMod = 1.0 - uPulseIntensity * 0.42 * (1.0 - pulseNoise);

            // En mode orbital, ondes de compression descendantes le long de la colonne
            float orbitalWave = 1.0;
            if (uBeamMode == 1) {
              float shockRing = 0.5 + 0.5 * sin(along * 26.0 - uTime * (4.5 + uSpeed * 6.0));
              orbitalWave = 0.78 + 0.38 * pow(shockRing, 3.0);
            }

            float w = baseWidth * (uBeamMode == 1 ? orbitalWave : 1.0);

            // Profil radial : cœur blanc incandescent + frange moyenne + large halo atmosphérique
            float core = exp(-pow(dist / max(0.0014, w * 0.38), 2.0));
            float midGlow = exp(-dist / max(0.0035, w * 1.45));
            float outerHalo = exp(-dist / max(0.012, w * (4.2 + uDensity * 1.8))) * 0.44;

            // Diffusion dans la brume traversée (MEDIUM / HIGH)
            float airMist = 1.0;
            if (uQualityLevel >= 1) {
              float n1 = snoise(p * 3.8 + vec2(-uTime * 0.18 + fi * 2.0, uTime * 0.12)) * 0.5 + 0.5;
              float mist = n1;
              if (uQualityLevel >= 2) {
                float n2 = snoise(p * 8.5 + vec2(uTime * 0.25, -uTime * 0.20 + fi)) * 0.5 + 0.5;
                mist = n1 * 0.65 + n2 * 0.35;
              }
              airMist = mix(0.68, 1.32, mist);
            }

            vec3 beamCol = (i == 0 || !uUseSecondaryColor) ? col1 : col2;
            if (uBeamMode == 2 && i == 1) {
              beamCol = col2;
            }

            // Second filament hélicoïdal enroulé (HIGH + plasma_stream ou beamMode == 2)
            float secondaryFilament = 0.0;
            if (uQualityLevel >= 2 && uBeamMode == 2) {
              vec2 segVec = normalize(target - origin);
              vec2 perp = vec2(-segVec.y, segVec.x);
              float signedPerp = dot(p - origin, perp);
              float helix = sin(along * 24.0 - uTime * 13.5 + fi * 3.1) * 0.028 * (0.5 + wobbleAmt);
              float hd = abs(signedPerp - helix);
              if (along > 0.02 && along < 0.98) {
                secondaryFilament = exp(-hd / max(0.0025, w * 0.55)) * 0.85;
              }
            }

            float beamStrength = (core * 1.25 + midGlow * 0.75 + outerHalo * airMist) * pulseMod * uIntensity;
            vec3 hotCore = mix(beamCol, vec3(1.0, 0.99, 0.96), clamp(core * 0.92, 0.0, 0.95));

            accumColor += hotCore * beamStrength + col2 * secondaryFilament * uIntensity;
            accumAlpha += (core * 0.85 + midGlow * 0.55 + outerHalo * 0.35 + secondaryFilament * 0.45) * pulseMod * uIntensity;

            // Point d'impact incandescent et micro-étincelles radiales
            if (uImpactSparks > 0.01 && uQualityLevel >= 1) {
              float dImp = length(p - target);
              float impCore = exp(-dImp * (uBeamMode == 1 ? 10.0 : 24.0)) * (0.9 + 0.35 * pulseNoise);
              float impHalo = exp(-dImp * (uBeamMode == 1 ? 4.2 : 9.0)) * 0.55;
              float sparks = 0.0;
              if (uQualityLevel >= 2 && dImp < 0.22) {
                float impA = atan(p.y - target.y, p.x - target.x);
                float raySp = pow(max(0.0, sin(impA * 14.0 + uTime * 18.0 + fi * 3.0)), 6.0);
                float grainSp = step(0.68, hash12(floor(p * 95.0) + floor(uTime * 16.0)));
                sparks = (raySp * 0.55 + grainSp * 0.65) * exp(-dImp * 18.0);
              }
              float impVal = (impCore + impHalo + sparks) * uImpactSparks * uIntensity;
              accumColor += mix(beamCol, vec3(1.0, 0.96, 0.88), 0.55) * impVal;
              accumAlpha += impVal * 0.72;
            }
          }

          accumAlpha = clamp(accumAlpha, 0.0, 0.94);
          if (accumAlpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(accumColor, accumAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<LaserBeamProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.coreColor !== undefined) {
      this.coreColorVec.set(newProps.coreColor)
      this.material.uniforms.uCoreColor.value = this.coreColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseSecondaryColor.value = true
    }
    if (newProps.beamMode !== undefined) {
      this.material.uniforms.uBeamMode.value = BEAM_MODE_MAP[newProps.beamMode] ?? 0
    }
    if (newProps.beamCount !== undefined) {
      this.material.uniforms.uBeamCount.value = Math.min(
        3,
        Math.max(1, Math.round(newProps.beamCount))
      )
    }
    if (newProps.beamWidth !== undefined)
      this.material.uniforms.uBeamWidth.value = newProps.beamWidth
    if (newProps.angle !== undefined) this.material.uniforms.uAngle.value = newProps.angle
    if (newProps.wobble !== undefined) this.material.uniforms.uWobble.value = newProps.wobble
    if (newProps.sweepSpeed !== undefined)
      this.material.uniforms.uSweepSpeed.value = newProps.sweepSpeed
    if (newProps.pulseIntensity !== undefined)
      this.material.uniforms.uPulseIntensity.value = newProps.pulseIntensity
    if (newProps.impactSparks !== undefined)
      this.material.uniforms.uImpactSparks.value = newProps.impactSparks
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
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

export const LaserBeamDefinition: IBrickDefinition<LaserBeamProps> = {
  type: 'laser_beam',
  category: 'atmosphere',
  create: (id, props, context) => new LaserBeamInstance(id, props, context),
}

BrickRegistry.register(LaserBeamDefinition)
