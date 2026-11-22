/**
 * src/theme-engine/bricks/special/RunicCircleBrick.ts
 *
 * Brique Spéciale : Anneaux Géométriques & Rosace Lumineuse (Couche : Spéciaux).
 * Shader SDF en coordonnées polaires générant des anneaux concentriques contre-rotatifs,
 * polygones sacrés inscrits, bandes de glyphes géométriques 100 % procéduraux
 * (zéro symbole protégé), astrolabe armillaire ou rose des vents de boussole antique.
 *
 * Inclinaison pseudo-3D sensible à la souris, étincelles tangentielles,
 * et adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type RunicPatternStyle =
  | 'arcane'
  | 'mandala'
  | 'polyhedron'
  | 'astrolabe'
  | 'compass'
  | 'cyber_glyph'

export interface RunicCircleProps {
  /** Couleur dominante des anneaux et tracés lumineux (défaut #fbbf24 ou uPaletteAccent). */
  primaryColor?: string
  /** Couleur secondaire des cœurs, nœuds et impulsions (défaut #f97316 ou uPalettePrimary). */
  secondaryColor?: string
  /** Grammaire géométrique de la rosace (défaut 'arcane'). */
  patternStyle?: RunicPatternStyle
  /** Nombre d'anneaux concentriques contre-rotatifs (2 à 5, défaut 4). */
  ringCount?: number
  /** Ordre de symétrie polygonale / radiale (4 à 16, défaut 8). */
  symmetry?: number
  /** Inclinaison perspective pseudo-3D (0.0 = face, 0.7 = oblique, défaut 0.18). */
  tilt3D?: number
  /** Vitesse de rotation différentielle (0.0 à 1.5, défaut 0.28). */
  rotationSpeed?: number
  /** Fréquence de pulsation lumineuse (0.0 à 2.0, défaut 0.45). */
  pulseSpeed?: number
  /** Amplitude d'oscillation magnétique de l'aiguille en mode compass (0.0 à 1.0, défaut 0.5). */
  needleOscillation?: number
  /** Échelle spatiale globale de la rosace (0.4 à 2.0, défaut 1.0). */
  density?: number
  /** Multiplicateur de vitesse temporelle (0.0 à 2.0, défaut 0.35). */
  speed?: number
  /** Profondeur et réactivité d'inclinaison à la souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance lumineuse globale (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Irrégularité des glyphes procéduraux et déphasages (0.0 à 1.0, défaut 0.4). */
  randomness?: number
}

const PATTERN_STYLE_MAP: Record<RunicPatternStyle, number> = {
  arcane: 0,
  mandala: 1,
  polyhedron: 2,
  astrolabe: 3,
  compass: 4,
  cyber_glyph: 5,
}

export class RunicCircleInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'runic_circle'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: RunicCircleProps
  private primaryColorVec: THREE.Color
  private secondaryColorVec: THREE.Color

  constructor(id: string, props: RunicCircleProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#fbbf24')
    this.secondaryColorVec = new THREE.Color(props.secondaryColor ?? '#f97316')

    const styleIdx = PATTERN_STYLE_MAP[props.patternStyle ?? 'arcane'] ?? 0
    const ringCount = Math.min(5, Math.max(2, Math.round(props.ringCount ?? 4)))
    const symmetry = Math.min(16, Math.max(4, Math.round(props.symmetry ?? 8)))
    const tilt3D = props.tilt3D ?? 0.18
    const rotationSpeed = props.rotationSpeed ?? 0.28
    const pulseSpeed = props.pulseSpeed ?? 0.45
    const needleOscillation = props.needleOscillation ?? 0.5
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
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
        uPrimaryColor: { value: this.primaryColorVec },
        uSecondaryColor: { value: this.secondaryColorVec },
        uUseCustomColors: { value: Boolean(props.primaryColor || props.secondaryColor) },
        uPatternStyle: { value: styleIdx },
        uRingCount: { value: ringCount },
        uSymmetry: { value: symmetry },
        uTilt3D: { value: tilt3D },
        uRotationSpeed: { value: rotationSpeed },
        uPulseSpeed: { value: pulseSpeed },
        uNeedleOscillation: { value: needleOscillation },
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
          gl_Position = vec4(position.xy, 0.996, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform bool uUseCustomColors;
        uniform int uPatternStyle;
        uniform int uRingCount;
        uniform float uSymmetry;
        uniform float uTilt3D;
        uniform float uRotationSpeed;
        uniform float uPulseSpeed;
        uniform float uNeedleOscillation;
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

        mat2 rot2(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        // Tracé lumineux anti-aliasé + halo exponentiel doux
        float glowStroke(float d, float width, float glowStrength) {
          float ad = abs(d);
          float fw = max(0.0012, fwidth(d));
          float core = 1.0 - smoothstep(width, width + fw * 1.8 + 0.002, ad);
          float halo = exp(-ad * (42.0 / max(0.25, glowStrength))) * 0.55;
          return max(core, halo);
        }

        // Distance à un polygone régulier inscrit de rayon R et N côtés
        float sdRegularPolygon(vec2 p, float r, float n) {
          float an = PI / n;
          float a = atan(p.y, p.x);
          float sector = mod(a + an, 2.0 * an) - an;
          float d = length(p) * cos(sector) - r * cos(an);
          return d;
        }

        // Bande procédurale de glyphes géométriques abstraits (aucun symbole protégé)
        float proceduralGlyphBand(float r, float a, float bandR, float bandW, float count, float seed) {
          float radialDist = abs(r - bandR);
          if (radialDist > bandW * 0.65) return 0.0;

          float seg = floor((a + PI) / TAU * count);
          float localA = fract((a + PI) / TAU * count) - 0.5;
          float localR = (r - bandR) / max(0.001, bandW);

          float h1 = hash12(vec2(seg, seed));
          float h2 = hash12(vec2(seg + 17.3, seed * 2.1));

          // Combinaison abstraite de segments radiaux, arcs et losanges géométriques
          float stroke = 0.0;
          if (h1 > 0.22) {
            float barA = 1.0 - smoothstep(0.04, 0.14, abs(localA));
            float barR = 1.0 - smoothstep(0.32, 0.42, abs(localR));
            stroke = max(stroke, barA * barR * 0.85);
          }
          if (h2 > 0.35) {
            float arcR = 1.0 - smoothstep(0.05, 0.16, abs(localR - (h1 - 0.5) * 0.45));
            float arcA = 1.0 - smoothstep(0.28, 0.38, abs(localA));
            stroke = max(stroke, arcR * arcA * 0.78);
          }
          if (h1 + h2 > 1.25) {
            float dotD = length(vec2(localA * 1.4, localR));
            stroke = max(stroke, (1.0 - smoothstep(0.14, 0.24, dotD)) * 0.9);
          }
          return stroke;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Légère parallaxe souris + défilement scroll
          p -= uMouse * (uDepth * 0.12);
          p.y += uScroll * (uDepth * 0.06);

          // Mise à l'échelle par uDensity
          float scale = 1.0 / max(0.35, uDensity);
          p *= scale;

          // Projection pseudo-3D inclinable modulée par la souris
          float tilt = clamp(uTilt3D + uMouse.y * uDepth * 0.22, 0.0, 0.78);
          vec2 tiltedP = p;
          tiltedP.y /= max(0.32, 1.0 - tilt * 0.65);
          tiltedP = rot2(uMouse.x * uDepth * 0.25) * tiltedP;

          float t = uTime * max(0.02, uSpeed) * (0.45 + uRotationSpeed * 1.8);
          // Respiration organique non-linéaire
          float breath = 1.0 + sin(uTime * (0.6 + uPulseSpeed) + snoise(vec2(uTime * 0.2, 1.7)) * 0.6) * 0.025;
          tiltedP *= breath;

          float r = length(tiltedP);
          float a = atan(tiltedP.y, tiltedP.x);

          vec3 colPrimary = uUseCustomColors ? uPrimaryColor : uPaletteAccent;
          vec3 colSecondary = uUseCustomColors ? uSecondaryColor : uPalettePrimary;

          float lineAccum = 0.0;
          float accentAccum = 0.0;

          int maxRings = (uQualityLevel == 0) ? 2 : ((uQualityLevel == 1) ? min(uRingCount, 3) : uRingCount);
          float baseOuter = 0.36;

          if (uPatternStyle == 3) {
            // === ASTROLABE : anneaux armillaires elliptiques sur axes déphasés ===
            for (int i = 0; i < 5; i++) {
              if (i >= maxRings) break;
              float fi = float(i);
              float ringR = baseOuter * (1.0 - fi * 0.14);
              float axisAngle = fi * 0.85 + t * (0.35 + fi * 0.14) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
              vec2 ap = rot2(axisAngle) * p;
              float squash = 0.42 + 0.52 * abs(sin(t * 0.42 + fi * 1.27));
              ap.y /= max(0.28, squash);
              float ar = length(ap);
              float aa = atan(ap.y, ap.x);

              lineAccum += glowStroke(ar - ringR, 0.0022, 0.85) * (0.85 - fi * 0.1);

              // Noeuds orbitaux brillants sur chaque anneau
              float nodeAngle = t * (0.9 + fi * 0.37) + fi * 2.1;
              vec2 nodePos = vec2(cos(nodeAngle), sin(nodeAngle)) * ringR;
              float nodeD = length(ap - nodePos);
              accentAccum += exp(-nodeD * 45.0) * 1.1;

              if (uQualityLevel >= 2 && i < 2) {
                float ticks = smoothstep(0.75, 0.95, cos(aa * 36.0)) * smoothstep(0.015, 0.0, abs(ar - ringR));
                lineAccum += ticks * 0.35;
              }
            }
            // Noyau stellaire central
            accentAccum += exp(-length(p) * 18.0) * 0.85;
          } else if (uPatternStyle == 4) {
            // === COMPASS : rose des vents antique + graduations + aiguille oscillante ===
            float rotBase = t * 0.08;
            vec2 cp = rot2(rotBase) * tiltedP;
            float cr = length(cp);
            float ca = atan(cp.y, cp.x);

            // Cadran extérieur et intérieur
            lineAccum += glowStroke(cr - baseOuter, 0.003, 0.9);
            lineAccum += glowStroke(cr - baseOuter * 0.86, 0.0018, 0.65) * 0.75;
            lineAccum += glowStroke(cr - baseOuter * 0.22, 0.002, 0.75) * 0.7;

            // Graduations de degrés autour du limbe
            if (uQualityLevel >= 1) {
              float degTicks = smoothstep(0.82, 0.98, cos(ca * 32.0)) * smoothstep(0.025, 0.0, abs(cr - baseOuter * 0.93));
              lineAccum += degTicks * 0.55;
            }

            // Étoile de la rose des vents à 8 branches (4 majeures + 4 mineures)
            float star4 = abs(cos(ca * 2.0));
            float starShape = pow(star4, 4.0) * (baseOuter * 0.72) + 0.04;
            float star8 = pow(abs(sin(ca * 2.0)), 5.0) * (baseOuter * 0.48) + 0.03;
            lineAccum += glowStroke(cr - starShape, 0.002, 0.85) * 0.9;
            lineAccum += glowStroke(cr - star8, 0.0015, 0.6) * 0.55;

            // Aiguille magnétique oscillant organiquement autour du Nord
            float needleAng = 1.5708 + sin(uTime * 1.35) * 0.14 * uNeedleOscillation
              + snoise(vec2(uTime * 0.55, 3.1)) * 0.22 * uNeedleOscillation
              + uMouse.x * uDepth * 0.5;
            vec2 np = rot2(-needleAng) * tiltedP;
            float needleBody = abs(np.y) - max(0.0, (0.28 - abs(np.x)) * 0.09);
            if (abs(np.x) < 0.28) {
              float nGlow = 1.0 - smoothstep(0.0, 0.006, needleBody);
              accentAccum += nGlow * (np.x > 0.0 ? 1.25 : 0.45);
            }
            accentAccum += exp(-cr * 32.0) * 0.9;
          } else {
            // === ARCANE / MANDALA / POLYHEDRON / CYBER_GLYPH ===
            for (int i = 0; i < 5; i++) {
              if (i >= maxRings) break;
              float fi = float(i);
              float ringR = baseOuter * (1.0 - fi * 0.17);
              float dirSign = (mod(fi, 2.0) < 0.5) ? 1.0 : -1.0;
              float ringRot = t * (0.55 + fi * 0.24) * dirSign;

              vec2 rp = rot2(ringRot) * tiltedP;
              float ra = atan(rp.y, rp.x);

              // Anneau principal (avec coupures cyber si cyber_glyph)
              float ringMask = 1.0;
              if (uPatternStyle == 5) {
                float seg = hash12(vec2(floor((ra + PI) / TAU * uSymmetry * 2.0), fi + 3.0));
                ringMask = step(0.18, seg);
              }
              lineAccum += glowStroke(r - ringR, 0.0022, 0.85) * ringMask * (0.95 - fi * 0.1);

              // Polygones ou étoiles inscrits selon le style
              if (i == 0 || (i == 1 && uPatternStyle != 5)) {
                float polySides = (uPatternStyle == 2) ? 6.0 : max(3.0, floor(uSymmetry * 0.5));
                float dPoly1 = sdRegularPolygon(rp, ringR * 0.96, polySides);
                lineAccum += glowStroke(dPoly1, 0.0018, 0.72) * 0.75;

                // Deuxième polygone inversé pour mandala / arcane
                if (uPatternStyle == 0 || uPatternStyle == 1) {
                  vec2 rp2 = rot2(PI / polySides) * rp;
                  float dPoly2 = sdRegularPolygon(rp2, ringR * 0.96, polySides);
                  lineAccum += glowStroke(dPoly2, 0.0016, 0.65) * 0.65;
                }
              }

              // Bande de glyphes procéduraux abstraits (HIGH)
              if (uQualityLevel >= 2 && i < 2) {
                float glyphCount = (uPatternStyle == 1) ? uSymmetry * 3.0 : uSymmetry * 2.0;
                float gBand = proceduralGlyphBand(r, ra, ringR - 0.032, 0.042, glyphCount, fi * 11.7 + float(uPatternStyle) * 5.0);
                accentAccum += gBand * 0.7;
              }
            }

            // Rayons radiaux et noeuds d'énergie
            if (uQualityLevel >= 1) {
              vec2 sp = rot2(-t * 0.4) * tiltedP;
              float sa = atan(sp.y, sp.x);
              float sector = mod(sa + PI / uSymmetry, TAU / uSymmetry) - PI / uSymmetry;
              float radialRay = abs(sector) * r;
              float rayMask = smoothstep(0.08, 0.12, r) * smoothstep(baseOuter, baseOuter - 0.04, r);
              if (uPatternStyle == 1 || uPatternStyle == 2) {
                lineAccum += glowStroke(radialRay, 0.0012, 0.45) * rayMask * 0.45;
              }

              // Impulsions tangentielles / noeuds sur l'anneau extérieur (HIGH, sans couture à -PI/+PI)
              if (uQualityLevel >= 2) {
                float sparkPhase = fract((a + PI - t * 1.4) / (TAU * 0.25));
                float sparkEnvelope = smoothstep(0.0, 0.08, sparkPhase) * exp(-sparkPhase * 4.8);
                float sparkGlow = exp(-abs(r - baseOuter) * 55.0) * sparkEnvelope;
                accentAccum += sparkGlow * 1.05;
              }
            }

            // Cœur pulsant interne
            float corePulse = 0.65 + 0.35 * sin(uTime * (1.2 + uPulseSpeed * 2.5));
            accentAccum += exp(-r * 16.0) * 0.55 * corePulse;
          }

          vec3 finalCol = colPrimary * lineAccum + mix(colSecondary, vec3(1.0, 0.98, 0.9), 0.35) * accentAccum;
          finalCol *= uIntensity;

          float alpha = clamp((lineAccum * 0.72 + accentAccum * 0.8) * uIntensity, 0.0, 0.92);
          // Préservation de la lisibilité au-delà de la rosace
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
    this.mesh.renderOrder = -30
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<RunicCircleProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.secondaryColor !== undefined) {
      this.secondaryColorVec.set(newProps.secondaryColor)
      this.material.uniforms.uSecondaryColor.value = this.secondaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.patternStyle !== undefined) {
      this.material.uniforms.uPatternStyle.value = PATTERN_STYLE_MAP[newProps.patternStyle] ?? 0
    }
    if (newProps.ringCount !== undefined) {
      this.material.uniforms.uRingCount.value = Math.min(
        5,
        Math.max(2, Math.round(newProps.ringCount))
      )
    }
    if (newProps.symmetry !== undefined) {
      this.material.uniforms.uSymmetry.value = Math.min(
        16,
        Math.max(4, Math.round(newProps.symmetry))
      )
    }
    if (newProps.tilt3D !== undefined) this.material.uniforms.uTilt3D.value = newProps.tilt3D
    if (newProps.rotationSpeed !== undefined)
      this.material.uniforms.uRotationSpeed.value = newProps.rotationSpeed
    if (newProps.pulseSpeed !== undefined)
      this.material.uniforms.uPulseSpeed.value = newProps.pulseSpeed
    if (newProps.needleOscillation !== undefined)
      this.material.uniforms.uNeedleOscillation.value = newProps.needleOscillation
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

export const RunicCircleDefinition: IBrickDefinition<RunicCircleProps> = {
  type: 'runic_circle',
  category: 'special',
  create: (id, props, context) => new RunicCircleInstance(id, props, context),
}

BrickRegistry.register(RunicCircleDefinition)
