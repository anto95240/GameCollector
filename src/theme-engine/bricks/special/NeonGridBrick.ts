/**
 * src/theme-engine/bricks/special/NeonGridBrick.ts
 *
 * Brique Spéciale : Grille Néon Rétro-Futuriste & Synthwave (Couche : Spéciaux).
 * Projection perspective 3D d'un maillage infini vers l'horizon, avec lignes de fuite
 * ultra-nettes (anti-aliasing analytique fwidth), halo néon exponentiel, impulsions
 * d'énergie circulant le long des axes, ondulation de terrain dynamique par Simplex noise 2D,
 * lueur d'horizon atmosphérique et déflexion interactive au pointeur de souris.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Grille Néon.
 */
export interface NeonGridProps {
  /** Couleur principale des lignes néon de la grille (défaut #00f0ff ou uPaletteAccent). */
  gridColor?: string
  /** Couleur de la lueur atmosphérique à la ligne d'horizon (défaut #ff007f ou uPalettePrimary). */
  horizonColor?: string
  /** Couleur des paquets d'énergie circulant sur les lignes (défaut #ffffff). */
  pulseColor?: string
  /** Échelle et compacité du maillage (0.4 à 3.0, défaut 1.0). */
  density?: number
  /** Vitesse de défilement vers l'observateur (0.0 à 2.0, défaut 0.3). */
  speed?: number
  /** Sensibilité à la parallaxe souris et profondeur perspective (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Intensité lumineuse et radiance néon (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Relief et turbulence d'ondulation du terrain (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Hauteur relative de l'horizon dans l'écran (0.2 à 0.8, défaut 0.45). */
  horizonHeight?: number
  /** Finesse relative des lignes néon (0.01 à 0.12, défaut 0.04). */
  lineWidth?: number
  /** Amplitude des vagues de terrain (0.0 à 0.8, défaut 0.25). */
  waveHeight?: number
}

export class NeonGridInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'neon_grid'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: NeonGridProps
  private gridColorVec: THREE.Color
  private horizonColorVec: THREE.Color
  private pulseColorVec: THREE.Color

  constructor(id: string, props: NeonGridProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.gridColorVec = new THREE.Color(props.gridColor ?? '#00f0ff')
    this.horizonColorVec = new THREE.Color(props.horizonColor ?? '#ff007f')
    this.pulseColorVec = new THREE.Color(props.pulseColor ?? '#ffffff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.3
    const horizonHeight = props.horizonHeight ?? 0.45
    const lineWidth = props.lineWidth ?? 0.04
    const waveHeight = props.waveHeight ?? 0.25

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uGridColor: { value: this.gridColorVec },
        uHorizonColor: { value: this.horizonColorVec },
        uPulseColor: { value: this.pulseColorVec },
        uUseCustomColors: {
          value: Boolean(props.gridColor || props.horizonColor || props.pulseColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHorizonHeight: { value: horizonHeight },
        uLineWidth: { value: lineWidth },
        uWaveHeight: { value: waveHeight },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Plan de rendu intermédiaire/spécial (juste en avant du fond)
          gl_Position = vec4(position.xy, 0.9992, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uGridColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uPulseColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHorizonHeight;
        uniform float uLineWidth;
        uniform float uWaveHeight;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        // Calcule une ligne antialiasée propre via dérivées analytiques fwidth
        float gridLine(float coord, float lineThickness, float glowFactor) {
          float dist = abs(fract(coord - 0.5) - 0.5);
          float fw = max(0.001, fwidth(coord));
          // Ligne de cœur nette
          float core = 1.0 - smoothstep(0.0, lineThickness * fw * 2.0 + 0.015, dist);
          // Halo néon exponentiel
          float glow = exp(-dist * (24.0 / max(0.1, glowFactor)));
          return max(core, glow * 0.65);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Couleurs de base
          vec3 baseGrid = uUseCustomColors ? uGridColor : uPaletteAccent;
          vec3 baseHorizon = uUseCustomColors ? uHorizonColor : uPalettePrimary;
          vec3 basePulse = uUseCustomColors ? uPulseColor : vec3(1.0);

          // Ligne d'horizon dynamique modulée par la souris
          float horizon = uHorizonHeight + (uMouse.y * uDepth * 0.12);

          // Si on est au-dessus de l'horizon : brume céleste et diffusion atmosphérique
          if (uv.y > horizon) {
            float skyDist = (uv.y - horizon);
            float skyGlow = exp(-skyDist * 14.0) * uIntensity;
            vec3 skyCol = baseHorizon * skyGlow * 0.85;
            gl_FragColor = vec4(skyCol, clamp(skyGlow * 0.9, 0.0, 1.0));
            return;
          }

          // Projection perspective 3D sur le plancher
          float d = max(0.006, horizon - uv.y);
          float z = 1.0 / d; // Profondeur z
          float x = (uv.x - 0.5 + uMouse.x * uDepth * 0.25) * aspect * z;

          // Ondulation de terrain par Simplex Noise (HIGH & MEDIUM)
          float terrainWave = 0.0;
          if (uQualityLevel >= 1) {
            float waveT = uTime * uSpeed * 0.8;
            if (uQualityLevel >= 2) {
              // Double octave pour relief de terrain sinueux
              terrainWave = snoise(vec2(x * 0.08, z * 0.05 - waveT)) * 0.6;
              terrainWave += snoise(vec2(x * 0.18 + 5.2, z * 0.12 - waveT * 1.3)) * 0.4;
            } else {
              terrainWave = sin(x * 0.15 + z * 0.1 - waveT) * 0.5;
            }
            terrainWave *= uWaveHeight * uRandomness;
            // Ré-injecte la distorsion dans la coordonnée z
            z += terrainWave * 2.5;
          }

          // Coordonnées de la grille
          float tScroll = uTime * uSpeed * 3.5;
          vec2 gridCoords = vec2(x, z - tScroll) * (0.28 * uDensity);

          // Lignes longitudinales (X) et transversales (Z)
          float lineThick = uLineWidth * (0.8 + 0.4 * uIntensity);
          float glowIntensity = uIntensity * (0.8 + 0.4 * min(1.0, 1.0 / d));

          float lineX = gridLine(gridCoords.x, lineThick, glowIntensity);
          float lineZ = gridLine(gridCoords.y, lineThick, glowIntensity);
          float gridVal = max(lineX, lineZ);

          // Lignes secondaires de subdivision (HIGH)
          if (uQualityLevel >= 2) {
            vec2 subCoords = gridCoords * 2.0;
            float subX = gridLine(subCoords.x, lineThick * 0.6, glowIntensity * 0.4);
            float subZ = gridLine(subCoords.y, lineThick * 0.6, glowIntensity * 0.4);
            gridVal = max(gridVal, max(subX, subZ) * 0.35);
          }

          // Impulsions d'énergie lumineuses circulant sur les lignes (HIGH & MEDIUM)
          float pulseVal = 0.0;
          if (uQualityLevel >= 1) {
            float pTime = uTime * (uSpeed * 1.8 + 0.5);
            // Paquets d'ondes sur Z
            float pulseZ = sin(gridCoords.y * 1.5 - pTime * 4.0);
            pulseZ = pow(max(0.0, pulseZ), 16.0);
            // Paquets d'ondes sur X
            float pulseX = sin(gridCoords.x * 2.0 + sin(gridCoords.y * 0.5) * 2.0 - pTime * 2.5);
            pulseX = pow(max(0.0, pulseX), 20.0);

            pulseVal = (pulseZ * lineX + pulseX * lineZ) * uIntensity * 1.4;
          }

          // Estompage avec la distance à l'horizon (brouillard atmosphérique doux)
          float depthFade = smoothstep(0.005, 0.08, d);
          float horizonGlow = exp(-d * 22.0) * uIntensity;

          // Dégradé chromatique de perspective (du néon primaire au premier plan vers les reflets d'horizon lointains)
          vec3 activeGridCol = mix(baseGrid, baseHorizon, clamp(exp(-d * 5.0) * 0.4, 0.0, 0.6));
          vec3 finalColor = activeGridCol * (gridVal * uIntensity);
          finalColor += basePulse * pulseVal;
          finalColor += baseHorizon * (horizonGlow * 1.25);

          // Atténuation aux bords d'horizon
          finalColor *= depthFade;

          // Opacité alpha progressive pour fondu élégant
          float alpha = clamp(gridVal * 0.9 + horizonGlow * 0.9 + pulseVal * 0.6, 0.0, 1.0) * depthFade;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -60
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<NeonGridProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.gridColor !== undefined) {
      this.gridColorVec.set(newProps.gridColor)
      this.material.uniforms.uGridColor.value = this.gridColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.horizonColor !== undefined) {
      this.horizonColorVec.set(newProps.horizonColor)
      this.material.uniforms.uHorizonColor.value = this.horizonColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.pulseColor !== undefined) {
      this.pulseColorVec.set(newProps.pulseColor)
      this.material.uniforms.uPulseColor.value = this.pulseColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.horizonHeight !== undefined)
      this.material.uniforms.uHorizonHeight.value = newProps.horizonHeight
    if (newProps.lineWidth !== undefined) this.material.uniforms.uLineWidth.value = newProps.lineWidth
    if (newProps.waveHeight !== undefined) this.material.uniforms.uWaveHeight.value = newProps.waveHeight
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

export const NeonGridDefinition: IBrickDefinition<NeonGridProps> = {
  type: 'neon_grid',
  category: 'special',
  create: (id, props, context) => new NeonGridInstance(id, props, context),
}

BrickRegistry.register(NeonGridDefinition)
