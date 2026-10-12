/**
 * src/theme-engine/bricks/background/AuroraBrick.ts
 *
 * Brique de fond Aurore Boréale / Polaire (Couche 1 : Background).
 * Draperies de plasma ondulantes avec rayons verticaux ionisés,
 * transitions spectrales émeraude/cyan/magenta et ondulations organiques non-linéaires.
 * Adaptation aux paliers HIGH (3 rideaux superposés + rayons fins), MEDIUM (2 rideaux) et LOW (1 rideau).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour l'Aurore Boréale.
 */
export interface AuroraProps {
  /** Couleur au sommet des rideaux d'aurore (défaut #a855f7 ou uPaletteAccent). */
  topColor?: string
  /** Couleur à la base ionisée des rideaux (défaut #10b981 ou uPalettePrimary). */
  bottomColor?: string
  /** Densité et nombre de draperies célestes (0.2 à 1.5, défaut 0.65). */
  density?: number
  /** Vitesse de propagation des ondes plasmatiques (défaut 0.22). */
  speed?: number
  /** Altitude et décalage parallaxe avec la souris (défaut 0.25). */
  depth?: number
  /** Émission lumineuse et radiance globale (défaut 1.2). */
  intensity?: number
  /** Irrégularité et turbulence du vent solaire (défaut 0.45). */
  randomness?: number
  /** Fréquence spatiale des plis de rideau (défaut 2.5). */
  waveFrequency?: number
}

export class AuroraInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'aurora'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: AuroraProps
  private topColorVec: THREE.Color
  private bottomColorVec: THREE.Color

  constructor(id: string, props: AuroraProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.topColorVec = new THREE.Color(props.topColor ?? '#a855f7')
    this.bottomColorVec = new THREE.Color(props.bottomColor ?? '#10b981')

    const speed = props.speed ?? 0.22
    const density = props.density ?? 0.65
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.45
    const waveFrequency = props.waveFrequency ?? 2.5

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uTopColor: { value: this.topColorVec },
        uBottomColor: { value: this.bottomColorVec },
        uUseCustomColors: {
          value: Boolean(props.topColor || props.bottomColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uWaveFreq: { value: waveFrequency },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9996, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uWaveFreq;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        float curtainLayer(vec2 p, float time, float yBase, float layerIdx, int quality) {
          // Ondulation transversale non linéaire
          float noiseShift = snoise(vec2(p.x * 1.5 + time * 0.15, layerIdx * 4.0)) * uRandomness;
          float wave = sin(p.x * uWaveFreq + time * 0.8 + layerIdx * 1.7) * 0.12
                     + sin(p.x * (uWaveFreq * 1.8) - time * 0.5) * 0.06
                     + noiseShift * 0.15;

          float distToCurtain = p.y - (yBase + wave);

          // Les rideaux s'élèvent vers le haut et s'estompent
          if (distToCurtain < 0.0) return 0.0;

          // Profil vertical d'atténuation
          float verticalProfile = exp(-distToCurtain * (4.5 / uDensity));

          // Rayons verticaux ionisés
          float rays = 1.0;
          if (quality >= 1) {
            float rayNoise = snoise(vec2(p.x * 25.0 + time * 0.05, p.y * 2.0));
            rays = 0.65 + 0.35 * (rayNoise * 0.5 + 0.5);

            if (quality >= 2) {
              float rayFine = snoise(vec2(p.x * 60.0 - time * 0.1, p.y * 4.0));
              rays += 0.25 * (rayFine * 0.5 + 0.5);
            }
          }

          return verticalProfile * rays;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y);

          // Parallaxe souris
          p += uMouse * (uDepth * 0.2);

          float t = uTime * uSpeed;

          // Ciel de nuit d'arrière-plan
          vec3 bgSky = uPaletteSecondary * 0.5;

          vec3 auroraCol = vec3(0.0);
          float totalAlpha = 0.0;

          vec3 baseGreen = uUseCustomColors ? uBottomColor : uPalettePrimary;
          vec3 basePurple = uUseCustomColors ? uTopColor : uPaletteAccent;

          // Rideau 1 (principal)
          float c1 = curtainLayer(p, t, 0.42, 0.0, uQualityLevel);
          vec3 col1 = mix(baseGreen, basePurple, smoothstep(0.0, 0.4, uv.y - 0.4));
          auroraCol += col1 * c1;
          totalAlpha += c1;

          // Rideau 2 (MEDIUM et HIGH)
          if (uQualityLevel >= 1) {
            float c2 = curtainLayer(p, t * 1.15, 0.52, 1.0, uQualityLevel);
            vec3 col2 = mix(baseGreen * 0.8 + basePurple * 0.2, basePurple, smoothstep(0.0, 0.35, uv.y - 0.5));
            auroraCol += col2 * (c2 * 0.75);
            totalAlpha += c2 * 0.75;
          }

          // Rideau 3 (HIGH)
          if (uQualityLevel >= 2) {
            float c3 = curtainLayer(p, t * 0.85, 0.60, 2.0, uQualityLevel);
            vec3 col3 = mix(basePurple, vec3(0.9, 0.2, 0.7), smoothstep(0.0, 0.3, uv.y - 0.6));
            auroraCol += col3 * (c3 * 0.55);
            totalAlpha += c3 * 0.55;
          }

          auroraCol *= uIntensity;

          // Composition sur fond sombre
          vec3 finalColor = bgSky + auroraCol;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -95
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<AuroraProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.topColor !== undefined) {
      this.topColorVec.set(newProps.topColor)
      this.material.uniforms.uTopColor.value = this.topColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.bottomColor !== undefined) {
      this.bottomColorVec.set(newProps.bottomColor)
      this.material.uniforms.uBottomColor.value = this.bottomColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.waveFrequency !== undefined) this.material.uniforms.uWaveFreq.value = newProps.waveFrequency
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

export const AuroraDefinition: IBrickDefinition<AuroraProps> = {
  type: 'aurora',
  category: 'background',
  create: (id, props, context) => new AuroraInstance(id, props, context),
}

BrickRegistry.register(AuroraDefinition)
