/**
 * src/theme-engine/bricks/special/RadarSweepBrick.ts
 *
 * Brique Spéciale : Balayage Radar, Sonar & Grille Orbitale (Couche : Spéciaux).
 * Shader polaire anti-aliasé (`fwidth`) à décroissance exponentielle de rémanence
 * sans couture angulaire, cercles gradués et échos/blips stochastiques synchronisés :
 * - 'sonar' : écran sonar 360° circulaire à balayage phosphorescent (Splinter)
 * - 'motion_tracker' : détecteur de mouvement conique à ondes radiales montantes (Xenomorph)
 * - 'orbital_grid' : réticule holographique sphérique avec méridiens rotatifs et cibles verrouillées (Echelon)
 *
 * Décentrement parallaxe souris/scroll, blips dérivant par Simplex, et paliers HIGH / MEDIUM / LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type RadarSweepStyle = 'sonar' | 'motion_tracker' | 'orbital_grid'

export interface RadarSweepProps {
  /** Couleur du faisceau de balayage et de la rémanence (défaut #22c55e ou uPaletteAccent). */
  sweepColor?: string
  /** Couleur des cercles concentriques et de la grille polaire (défaut #15803d ou uPalettePrimary). */
  gridColor?: string
  /** Couleur des échos / blips détectés (défaut #86efac). */
  blipColor?: string
  /** Architecture du radar (défaut 'sonar'). */
  radarStyle?: RadarSweepStyle
  /** Cadence angulaire ou radiale du balayage (0.05 à 1.5, défaut 0.45). */
  sweepSpeed?: number
  /** Persistance lumineuse de la traîne après passage du faisceau (0.2 à 0.95, défaut 0.72). */
  persistence?: number
  /** Nombre d'anneaux concentriques gradués (3 à 6, défaut 4). */
  ringCount?: number
  /** Nombre maximal d'échos stochastiques actifs (0 à 12, défaut 6). */
  blipCount?: number
  /** Ouverture angulaire du cône en mode motion_tracker (0.6 à 3.14 rad, défaut 1.8). */
  arcSector?: number
  /** Échelle spatiale globale du radar (0.5 à 2.0, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.05 à 2.0, défaut 0.5). */
  speed?: number
  /** Profondeur et décentrement parallaxe à la souris (0.0 à 1.0, défaut 0.30). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Dérive et instabilité stochastique des blips (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

const RADAR_STYLE_MAP: Record<RadarSweepStyle, number> = {
  sonar: 0,
  motion_tracker: 1,
  orbital_grid: 2,
}

export class RadarSweepInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'radar_sweep'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: RadarSweepProps
  private sweepColorVec: THREE.Color
  private gridColorVec: THREE.Color
  private blipColorVec: THREE.Color

  constructor(id: string, props: RadarSweepProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.sweepColorVec = new THREE.Color(props.sweepColor ?? '#22c55e')
    this.gridColorVec = new THREE.Color(props.gridColor ?? '#15803d')
    this.blipColorVec = new THREE.Color(props.blipColor ?? props.sweepColor ?? '#86efac')

    const styleIdx = RADAR_STYLE_MAP[props.radarStyle ?? 'sonar'] ?? 0
    const sweepSpeed = props.sweepSpeed ?? 0.45
    const persistence = props.persistence ?? 0.72
    const ringCount = Math.min(6, Math.max(3, Math.round(props.ringCount ?? 4)))
    const blipCount = Math.min(12, Math.max(0, Math.round(props.blipCount ?? 6)))
    const arcSector = props.arcSector ?? 1.8
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.5
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.45

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uSweepColor: { value: this.sweepColorVec },
        uGridColor: { value: this.gridColorVec },
        uBlipColor: { value: this.blipColorVec },
        uUseCustomColors: {
          value: Boolean(props.sweepColor || props.gridColor || props.blipColor),
        },
        uRadarStyle: { value: styleIdx },
        uSweepSpeed: { value: sweepSpeed },
        uPersistence: { value: persistence },
        uRingCount: { value: ringCount },
        uBlipCount: { value: blipCount },
        uArcSector: { value: arcSector },
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
          gl_Position = vec4(position.xy, 0.994, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uSweepColor;
        uniform vec3 uGridColor;
        uniform vec3 uBlipColor;
        uniform bool uUseCustomColors;
        uniform int uRadarStyle;
        uniform float uSweepSpeed;
        uniform float uPersistence;
        uniform int uRingCount;
        uniform int uBlipCount;
        uniform float uArcSector;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        const float PI = 3.14159265;
        const float TAU = 6.28318530;

        float glowStroke(float d, float width, float glowStrength) {
          float ad = abs(d);
          float fw = max(0.0011, fwidth(d));
          float core = 1.0 - smoothstep(width, width + fw * 1.6 + 0.0015, ad);
          float halo = exp(-ad * (48.0 / max(0.2, glowStrength))) * 0.42;
          return max(core, halo);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Parallaxe souris et scroll
          p -= uMouse * (uDepth * 0.14);
          p.y += uScroll * (uDepth * 0.06);
          p /= max(0.4, uDensity);

          float t = uTime * max(0.02, uSpeed) * (0.45 + uSweepSpeed * 1.8);

          vec3 colSweep = uUseCustomColors ? uSweepColor : uPaletteAccent;
          vec3 colGrid = uUseCustomColors ? uGridColor : uPalettePrimary;
          vec3 colBlip = uUseCustomColors ? uBlipColor : mix(colSweep, vec3(1.0), 0.35);

          float gridAccum = 0.0;
          float sweepAccum = 0.0;
          float blipAccum = 0.0;

          if (uRadarStyle == 1) {
            // === MOTION_TRACKER : cône détecteur de mouvement (Xenomorph) ===
            vec2 mp = p - vec2(0.0, -0.26);
            float mr = length(mp);
            float maxR = 0.70;
            float angUp = atan(mp.x, mp.y); // 0 = haut, continu autour de l'axe vertical
            float halfArc = clamp(uArcSector * 0.5, 0.30, 1.55);

            float inSector = 1.0 - smoothstep(halfArc - 0.01, halfArc + 0.01, abs(angUp));
            float inRadius = 1.0 - smoothstep(maxR - 0.005, maxR + 0.005, mr);
            float sectorMask = inSector * inRadius;

            // Arcs concentriques dans le cône
            for (int i = 0; i < 6; i++) {
              if (i >= uRingCount) break;
              float ringR = maxR * (float(i + 1) / float(uRingCount));
              gridAccum += glowStroke(mr - ringR, 0.0020, 0.78) * inSector * 0.92;
            }

            // Bords latéraux du cône + axe central
            float sideBound = abs(angUp) - halfArc;
            gridAccum += glowStroke(sideBound * mr, 0.0024, 0.80) * inRadius * 0.98;
            gridAccum += glowStroke(mp.x, 0.0014, 0.52) * sectorMask * 0.58;
            if (uQualityLevel >= 1) {
              float subRay = abs(abs(angUp) - halfArc * 0.5) * mr;
              gridAccum += glowStroke(subRay, 0.0012, 0.42) * inRadius * 0.48;
            }

            // Onde sonar radiale ascendante à cadence non-linéaire
            float pulsePhase = fract(t * 0.52);
            float pulseR = pulsePhase * maxR;
            float rLag = pulseR - mr;
            if (rLag >= -0.012 && mr < maxR) {
              float lead = exp(-abs(rLag) * 58.0) * 1.15;
              float trail = (rLag > 0.0) ? exp(-rLag * (13.0 - uPersistence * 9.0)) * 0.62 : 0.0;
              sweepAccum += (lead + trail) * inSector * (1.0 - pulsePhase * 0.2);
            }

            // Blips synchronisés au passage de l'onde radiale
            int activeBlips = (uQualityLevel == 0) ? 0 : ((uQualityLevel == 1) ? min(uBlipCount, 4) : uBlipCount);
            for (int b = 0; b < 12; b++) {
              if (b >= activeBlips) break;
              float fb = float(b);
              float h1 = hash12(vec2(fb, 9.3));
              float h2 = hash12(vec2(fb + 5.1, 3.7));
              float driftA = snoise(vec2(uTime * 0.14 + fb * 2.1, fb)) * 0.12 * uRandomness;
              float driftR = snoise(vec2(fb * 3.7, uTime * 0.11)) * 0.05 * uRandomness;

              float bAng = (h1 - 0.5) * (halfArc * 1.65) + driftA;
              float bRad = (0.16 + h2 * 0.72) * maxR + driftR;
              vec2 bPos = vec2(sin(bAng), cos(bAng)) * bRad;

              float lagR = fract((pulseR - bRad) / maxR);
              float echo = exp(-lagR * (4.5 - uPersistence * 2.8)) * smoothstep(0.0, 0.03, lagR + 0.015);
              float dB = length(mp - bPos);
              float dotCore = exp(-dB * 85.0) * 1.35 + exp(-dB * 28.0) * 0.45;
              float pingRing = (uQualityLevel >= 2) ? glowStroke(dB - lagR * 0.07, 0.0012, 0.5) * exp(-lagR * 6.0) * 0.55 : 0.0;
              blipAccum += (dotCore + pingRing) * echo;
            }
          } else {
            // === SONAR (0) & ORBITAL_GRID (2) : cadran circulaire 360° ===
            float r = length(p);
            float a = atan(p.y, p.x);
            float maxR = 0.41;

            // Anneaux concentriques
            for (int i = 0; i < 6; i++) {
              if (i >= uRingCount) break;
              float ringR = maxR * (float(i + 1) / float(uRingCount));
              float w = (i == uRingCount - 1) ? 0.0022 : 0.0014;
              gridAccum += glowStroke(r - ringR, w, 0.65) * (i == uRingCount - 1 ? 0.92 : 0.58);
            }

            // Réticule croisé
            float inDisc = 1.0 - smoothstep(maxR - 0.004, maxR + 0.004, r);
            gridAccum += glowStroke(p.x, 0.0011, 0.4) * inDisc * 0.42;
            gridAccum += glowStroke(p.y, 0.0011, 0.4) * inDisc * 0.42;

            // Graduations de degrés sur le limbe extérieur (HIGH)
            if (uQualityLevel >= 2) {
              float ticks = smoothstep(0.84, 0.98, cos(a * 36.0)) * smoothstep(0.016, 0.0, abs(r - maxR * 0.96));
              gridAccum += ticks * 0.48;
            }

            // Grille sphérique orbitale rotative (mode 2 : Echelon)
            if (uRadarStyle == 2 && r < maxR) {
              // Parallèles latitudinaux
              for (int lat = -2; lat <= 2; lat++) {
                if (lat == 0) continue;
                float latY = float(lat) * 0.135;
                gridAccum += glowStroke(p.y - latY, 0.001, 0.38) * inDisc * 0.35;
              }
              // Méridiens elliptiques en rotation lente
              for (int m = 0; m < 3; m++) {
                float lonAng = t * 0.28 + float(m) * (PI / 3.0);
                float xScale = max(0.06, abs(cos(lonAng)));
                vec2 mp = vec2(p.x / xScale, p.y);
                gridAccum += glowStroke(length(mp) - maxR, 0.0012, 0.4) * inDisc * 0.42;
              }
            }

            // Balayage angulaire rotatif sans couture à -PI / +PI
            float sweepAng = mod(-t * (1.25 + uSweepSpeed * 2.2), TAU);
            float lag = mod(a - sweepAng + TAU * 4.0, TAU);
            float decayArc = mix(0.45, 2.8, uPersistence);
            float beamWake = exp(-lag / max(0.15, decayArc)) * 0.62;

            // Ligne nette du bras de balayage
            float armDist = sin(a - sweepAng) * r;
            float armFront = step(0.0, cos(a - sweepAng));
            float armGlow = glowStroke(armDist, 0.0016, 0.8) * armFront * inDisc;

            sweepAccum += (beamWake * inDisc * 0.72 + armGlow * 0.95);

            // Second faisceau opposé discret en mode orbital_grid
            if (uRadarStyle == 2 && uQualityLevel >= 1) {
              float lag2 = mod(a - (sweepAng + PI) + TAU * 4.0, TAU);
              sweepAccum += exp(-lag2 / max(0.15, decayArc * 0.6)) * inDisc * 0.25;
            }

            // Blips synchronisés au passage du faisceau
            int activeBlips = (uQualityLevel == 0) ? 0 : ((uQualityLevel == 1) ? min(uBlipCount, 4) : uBlipCount);
            for (int b = 0; b < 12; b++) {
              if (b >= activeBlips) break;
              float fb = float(b);
              float h1 = hash12(vec2(fb, 14.7));
              float h2 = hash12(vec2(fb * 2.3, 6.1));

              float bAng = h1 * TAU - PI + snoise(vec2(uTime * 0.1 + fb * 2.0, fb)) * 0.25 * uRandomness;
              float bRad = (0.14 + h2 * 0.76) * maxR + snoise(vec2(fb * 4.1, uTime * 0.08)) * 0.03 * uRandomness;
              vec2 bPos = vec2(cos(bAng), sin(bAng)) * bRad;

              float blipLag = mod(bAng - sweepAng + TAU * 4.0, TAU);
              float echo = exp(-blipLag / max(0.25, decayArc * 1.15)) * smoothstep(0.0, 0.06, blipLag + 0.03);
              float dB = length(p - bPos);

              float dotCore = exp(-dB * 105.0) * 1.4 + exp(-dB * 34.0) * 0.45;
              // Losange de verrouillage en mode orbital_grid (HIGH)
              float lockMark = 0.0;
              if (uQualityLevel >= 2 && uRadarStyle == 2) {
                float dDiamond = abs(p.x - bPos.x) + abs(p.y - bPos.y);
                lockMark = glowStroke(dDiamond - 0.022, 0.001, 0.4) * 0.75;
              } else if (uQualityLevel >= 2) {
                lockMark = glowStroke(dB - blipLag * 0.015, 0.001, 0.45) * exp(-blipLag * 2.8) * 0.5;
              }

              blipAccum += (dotCore + lockMark) * echo;
            }
          }

          vec3 finalCol = colGrid * gridAccum + colSweep * sweepAccum + colBlip * blipAccum;
          finalCol *= uIntensity;

          float alpha = clamp((gridAccum * 0.58 + sweepAccum * 0.72 + blipAccum * 0.85) * uIntensity, 0.0, 0.92);
          if (alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -25
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<RadarSweepProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.sweepColor !== undefined) {
      this.sweepColorVec.set(newProps.sweepColor)
      this.material.uniforms.uSweepColor.value = this.sweepColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.gridColor !== undefined) {
      this.gridColorVec.set(newProps.gridColor)
      this.material.uniforms.uGridColor.value = this.gridColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.blipColor !== undefined) {
      this.blipColorVec.set(newProps.blipColor)
      this.material.uniforms.uBlipColor.value = this.blipColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.radarStyle !== undefined) {
      this.material.uniforms.uRadarStyle.value = RADAR_STYLE_MAP[newProps.radarStyle] ?? 0
    }
    if (newProps.sweepSpeed !== undefined)
      this.material.uniforms.uSweepSpeed.value = newProps.sweepSpeed
    if (newProps.persistence !== undefined)
      this.material.uniforms.uPersistence.value = newProps.persistence
    if (newProps.ringCount !== undefined) {
      this.material.uniforms.uRingCount.value = Math.min(
        6,
        Math.max(3, Math.round(newProps.ringCount))
      )
    }
    if (newProps.blipCount !== undefined) {
      this.material.uniforms.uBlipCount.value = Math.min(
        12,
        Math.max(0, Math.round(newProps.blipCount))
      )
    }
    if (newProps.arcSector !== undefined)
      this.material.uniforms.uArcSector.value = newProps.arcSector
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

export const RadarSweepDefinition: IBrickDefinition<RadarSweepProps> = {
  type: 'radar_sweep',
  category: 'special',
  create: (id, props, context) => new RadarSweepInstance(id, props, context),
}

BrickRegistry.register(RadarSweepDefinition)
