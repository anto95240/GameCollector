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
  /** Intensité du scintillement du plasma par bruit le long du faisceau (0.0 à 1.5, défaut 0.55). */
  plasmaFlicker?: number
  /** Envergure de la lueur additive et du halo coloré autour du cœur blanc (0.3 à 2.0, défaut 1.0). */
  glowSpread?: number
  /** Amplitude angulaire du balayage des faisceaux (0.0 à 1.0, défaut 0.35). */
  sweepRange?: number
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
    const plasmaFlicker = props.plasmaFlicker ?? 0.55
    const glowSpread = props.glowSpread ?? 1.0
    const sweepRange = props.sweepRange ?? 0.35

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
        uPlasmaFlicker: { value: plasmaFlicker },
        uGlowSpread: { value: glowSpread },
        uSweepRange: { value: sweepRange },
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
        uniform float uPlasmaFlicker;
        uniform float uGlowSpread;
        uniform float uSweepRange;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Balayage non-linéaire avec pauses subtiles de visée
        float tacticalSweep(float t, float seed) {
          float w1 = sin(t * 0.85 + seed * 4.1);
          float w2 = sin(t * 1.38196 + seed * 8.7) * 0.42;
          float w3 = sin(t * 0.5236 - seed * 2.9) * 0.30;
          float n = snoise(vec2(t * 0.28 + seed * 3.7, seed * 1.9)) * (0.45 * uRandomness);
          float raw = (w1 + w2 + w3) * 0.58 + n;
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

          float t = uTime * max(0.02, uSpeed) * (0.45 + uSweepSpeed * 1.65);
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

          float baseWidth = max(0.0022, uBeamWidth * (0.85 + 0.15 * uDensity));
          float spread = max(0.3, uGlowSpread);
          vec3 accumColor = vec3(0.0);

          for (int i = 0; i < 3; i++) {
            if (i >= activeCount) break;
            float fi = float(i);
            float centerIdx = fi - 0.5 * float(activeCount - 1);

            float sweep = tacticalSweep(t, 1.7 + fi * 3.3);
            float curAngle = uAngle + sweep * uSweepRange * (uBeamMode == 1 ? 0.45 : 0.95) + centerIdx * 0.22;
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
              vec2 baseSpan = target - origin;
              float angDelta = uAngle * 0.45;
              float ca = cos(angDelta), sa = sin(angDelta);
              target = origin + vec2(baseSpan.x * ca - baseSpan.y * sa, baseSpan.x * sa + baseSpan.y * ca);
            } else {
              // === TACTICAL : faisceaux fins en balayage traversant ou frappant une cible ===
              vec2 pivot = vec2(-0.06 * aspect + centerIdx * 0.20 * aspect, 0.22 + scrollShift * 0.5) + mouseShift;
              origin = pivot - dir * 1.35;
              float targetSpan = (uImpactSparks > 0.02) ? (0.34 + 0.09 * sin(t * 0.55 + fi * 2.7)) : 1.35;
              target = pivot + dir * targetSpan;
            }

            vec2 segInfo = sdSegmentWithT(p, origin, target);
            float dist = segInfo.x;
            float along = segInfo.y;

            vec2 segVec = normalize(target - origin);
            vec2 perp = vec2(-segVec.y, segVec.x);
            float signedPerp = dot(p - origin, perp);

            // Torsion organique du flux plasma (ancrée proprement aux deux extrémités)
            float wobbleAmt = (uBeamMode == 2) ? max(0.24, uWobble) : uWobble;
            if (wobbleAmt > 0.01) {
              float pinEnv = smoothstep(0.0, 0.14, along) * smoothstep(1.0, (uBeamMode == 2 ? 0.78 : 0.90), along);
              float wave = sin(along * 15.0 - uTime * (5.5 + uSpeed * 7.5) + fi * 2.1) * 0.45
                + sin(along * 27.0 + uTime * 10.7 + fi * 4.4) * 0.28;
              if (uQualityLevel >= 1) {
                wave += snoise(vec2(along * 5.2 - uTime * (2.4 + uSpeed * 2.8), fi * 3.7 + uTime * 0.75)) * 0.95;
              }
              if (uQualityLevel >= 2) {
                wave += snoise(vec2(along * 12.5 + uTime * 4.1, fi * 7.1 - uTime * 1.6)) * 0.42;
              }
              float offset = wave * wobbleAmt * 0.068 * pinEnv;
              dist = abs(signedPerp - offset);
              if (along <= 0.0 || along >= 1.0) {
                dist = max(dist, segInfo.x);
              }
            }

            // Scintillement du plasma par bruit le long du faisceau et dans le temps
            float flickerField = 0.0;
            if (uQualityLevel == 0) {
              flickerField = 0.5 + 0.5 * sin(uTime * 7.3 + along * 8.0 + fi * 2.7) * cos(uTime * 11.1 - along * 5.0);
            } else {
              float nSlow = snoise(vec2(along * 5.8 - uTime * (2.6 + uSpeed * 3.2), uTime * 2.8 + fi * 4.1)) * 0.5 + 0.5;
              flickerField = nSlow;
              if (uQualityLevel >= 2) {
                float nFast = snoise(vec2(along * 18.0 + uTime * 6.5, uTime * 7.8 + fi * 7.3)) * 0.5 + 0.5;
                flickerField = nSlow * 0.62 + nFast * 0.38;
              }
            }

            float pulseAmt = clamp(uPulseIntensity * 0.55 + uPlasmaFlicker * 0.75, 0.0, 1.4);
            float coreFlicker = mix(1.0, 0.58 + 0.62 * flickerField, clamp(pulseAmt, 0.0, 1.0));
            float haloFlicker = mix(1.0, 0.35 + 1.15 * flickerField, clamp(pulseAmt, 0.0, 1.0));

            // En mode orbital, ondes de compression descendantes le long de la colonne
            float orbitalWave = 1.0;
            if (uBeamMode == 1) {
              float shockRing = 0.5 + 0.5 * sin(along * 26.0 - uTime * (4.5 + uSpeed * 6.0));
              orbitalWave = 0.78 + 0.38 * pow(shockRing, 3.0);
            }

            float w = baseWidth * (uBeamMode == 1 ? orbitalWave : 1.0) * (1.0 + uPlasmaFlicker * 0.22 * (flickerField - 0.5));

            // Profil radial : cœur blanc incandescent fin + gaine colorée saturée + lueur additive étendue
            float core = exp(-pow(dist / max(0.0009, w * 0.24), 2.0));
            float sheath = exp(-dist / max(0.0022, w * 0.95));
            float outerHalo = exp(-dist / max(0.009, w * (4.2 + uDensity * 2.2) * spread)) * 0.52;

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

            // Second filament hélicoïdal organique en mode plasma_stream (HIGH)
            float secondaryFilament = 0.0;
            if (uQualityLevel >= 2 && uBeamMode == 2) {
              float helixNoise = snoise(vec2(along * 7.5 - uTime * 4.2, fi * 5.1 + uTime * 1.3));
              float helix = (sin(along * 22.0 - uTime * 12.5 + fi * 3.1) * 0.65 + helixNoise * 0.55)
                * 0.026 * (0.5 + wobbleAmt) * smoothstep(0.0, 0.14, along) * smoothstep(1.0, 0.78, along);
              float hd = abs(signedPerp - helix);
              if (along > 0.01 && along < 0.99) {
                secondaryFilament = exp(-hd / max(0.0020, w * 0.45)) * 0.78;
              }
            }

            // Composition additive : cœur blanc pur + halo coloré lumineux
            vec3 coreWhite = vec3(1.0, 0.99, 0.96) * (core * 1.40 * coreFlicker);
            vec3 coloredHalo = beamCol * ((sheath * 0.90 + outerHalo * airMist) * haloFlicker);
            accumColor += (coreWhite + coloredHalo) * uIntensity;
            accumColor += mix(col2, vec3(1.0, 0.98, 0.95), 0.35) * (secondaryFilament * coreFlicker * uIntensity);

            // Point d'impact incandescent et gerbes d'étincelles balistiques
            if (uImpactSparks > 0.01) {
              float dImp = length(p - target);
              float impCore = exp(-dImp * (uBeamMode == 1 ? 10.0 : 20.0)) * (2.6 + 0.65 * flickerField);
              float impHalo = exp(-dImp * (uBeamMode == 1 ? 3.8 : 7.5) / spread) * 1.35;
              vec3 impCol = vec3(1.0, 0.98, 0.92) * impCore + beamCol * impHalo;
              accumColor += impCol * (uImpactSparks * uIntensity);

              if (uQualityLevel >= 1 && dImp < 0.36) {
                int sparkCount = (uQualityLevel >= 2) ? 8 : 4;
                vec2 splashBase = (uBeamMode == 1) ? vec2(0.0, 1.0) : -segVec;
                float splashBaseAng = atan(splashBase.y, splashBase.x);
                vec3 sparksColor = vec3(0.0);

                for (int k = 0; k < 8; k++) {
                  if (k >= sparkCount) break;
                  float fk = float(k);
                  float seedK = fi * 13.7 + fk * 5.31;
                  float rate = (1.35 + hash12(vec2(seedK, 1.7)) * 1.15) * max(0.35, uSpeed);
                  float phase = uTime * rate + hash12(vec2(seedK, 4.9));
                  float age = fract(phase);
                  float cycle = floor(phase);

                  float rndA = hash12(vec2(seedK, cycle * 3.1 + 9.2)) * 2.0 - 1.0;
                  float rndV = 0.55 + 0.75 * hash12(vec2(seedK + 2.3, cycle * 7.4));
                  float spAng = splashBaseAng + rndA * 1.35;
                  float spSpeed = (0.42 + 0.34 * rndV) * (uBeamMode == 1 ? 1.35 : 1.0);

                  vec2 v0 = vec2(cos(spAng), sin(spAng)) * spSpeed;
                  vec2 grav = vec2(0.0, -0.42);
                  vec2 sPos = target + v0 * age + grav * (age * age);
                  vec2 sVel = v0 + 2.0 * grav * age;
                  vec2 sTail = sPos - sVel * 0.052;

                  vec2 sSeg = sdSegmentWithT(p, sTail, sPos);
                  float sFade = (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.06, age);
                  float sThick = 0.0030 * (1.0 - age * 0.45) * (0.65 + 0.75 * sSeg.y);
                  float sGlow = exp(-sSeg.x / max(0.0012, sThick)) * sFade;
                  vec3 sCol = mix(vec3(1.0, 0.98, 0.90), beamCol, smoothstep(0.18, 0.82, age));
                  sparksColor += sCol * sGlow * 3.2;
                }

                accumColor += sparksColor * (uImpactSparks * uIntensity);
              }
            }
          }

          // Compression douce HDR pour une lueur additive pure et satinée
          accumColor = accumColor / (1.0 + accumColor * 0.18);

          float maxLum = max(accumColor.r, max(accumColor.g, accumColor.b));
          if (maxLum <= 0.002) {
            discard;
          }

          gl_FragColor = vec4(accumColor, 1.0);
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
    if (newProps.plasmaFlicker !== undefined)
      this.material.uniforms.uPlasmaFlicker.value = newProps.plasmaFlicker
    if (newProps.glowSpread !== undefined)
      this.material.uniforms.uGlowSpread.value = newProps.glowSpread
    if (newProps.sweepRange !== undefined)
      this.material.uniforms.uSweepRange.value = newProps.sweepRange
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
