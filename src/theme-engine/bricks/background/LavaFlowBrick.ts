/**
 * src/theme-engine/bricks/background/LavaFlowBrick.ts
 *
 * Brique de fond Coulée de Lave Magmatique (Couche 1 : Background).
 * Simulation de croûte de basalte fracturée en plaques dérivantes,
 * failles magmatiques incandescentes avec gradient thermique 3 points et respiration de chaleur.
 * Adaptation aux paliers HIGH (fissures FBM sinueuses + pulsation thermique), MEDIUM et LOW.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D, GLSL_VORONOI_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour Coulée de Lave.
 */
export interface LavaFlowProps {
  /** Couleur de la croûte de basalte / obsidienne refroidie (défaut #0f1117). */
  crustColor?: string
  /** Couleur du magma en fusion dans les failles (défaut #f97316 ou uPalettePrimary). */
  magmaColor?: string
  /** Couleur du coeur incandescent ultra chaud (défaut #fef08a ou uPaletteAccent). */
  coreColor?: string
  /** Densité des plaques rocheuses et des fissures (défaut 1.0). */
  density?: number
  /** Vitesse d'écoulement visqueux (défaut 0.18). */
  speed?: number
  /** Relief et parallaxe avec la souris (défaut 0.2). */
  depth?: number
  /** Rayonnement thermique et lueur incandescente (défaut 1.25). */
  intensity?: number
  /** Irrégularité et déchirement des plaques (défaut 0.45). */
  randomness?: number
  /** Fréquence de pulsation thermique (défaut 1.2). */
  heatPulseSpeed?: number
}

export class LavaFlowInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'lava_flow'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: LavaFlowProps
  private crustColorVec: THREE.Color
  private magmaColorVec: THREE.Color
  private coreColorVec: THREE.Color

  constructor(id: string, props: LavaFlowProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.crustColorVec = new THREE.Color(props.crustColor ?? '#0f1117')
    this.magmaColorVec = new THREE.Color(props.magmaColor ?? '#ea580c')
    this.coreColorVec = new THREE.Color(props.coreColor ?? '#fef08a')

    const speed = props.speed ?? 0.18
    const density = props.density ?? 1.0
    const depth = props.depth ?? 0.2
    const intensity = props.intensity ?? 1.25
    const randomness = props.randomness ?? 0.45
    const heatPulseSpeed = props.heatPulseSpeed ?? 1.2

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uCrustColor: { value: this.crustColorVec },
        uMagmaColor: { value: this.magmaColorVec },
        uCoreColor: { value: this.coreColorVec },
        uUseCustomColors: {
          value: Boolean(props.crustColor || props.magmaColor || props.coreColor),
        },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHeatPulseSpeed: { value: heatPulseSpeed },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9993, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uCrustColor;
        uniform vec3 uMagmaColor;
        uniform vec3 uCoreColor;
        uniform bool uUseCustomColors;
        uniform float uSpeed;
        uniform float uDensity;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHeatPulseSpeed;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_VORONOI_2D}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = vec2(uv.x * aspect, uv.y) * (2.8 * uDensity);

          // Parallaxe souris
          p += uMouse * (uDepth * 0.2);

          float t = uTime * uSpeed;

          // Écoulement visqueux vers le bas
          p.y -= t * 0.6;

          // Torsion fluide non linéaire de la coulée
          float twist = snoise(p * 0.5 + vec2(0.0, t * 0.15)) * (uRandomness * 0.8);
          p.x += twist;

          // Réseau de cellules Voronoi (plaques de basalte)
          vec2 v = voronoi2D(p, t * 0.1);
          float crackDist = v.y - v.x; // Distance à la frontière de fissure

          // Modulation sinueuse des failles par du bruit
          if (uQualityLevel >= 1) {
            float crackNoise = snoise(p * 3.5 + vec2(t * 0.2, -t * 0.1));
            crackDist += crackNoise * (0.12 * uRandomness);
          }

          // Inversion : plus la frontière est proche, plus le magma est chaud
          float magmaGlow = smoothstep(0.18, 0.01, crackDist);

          // Pulsation thermique asynchrone
          float pulse = 1.0;
          if (uQualityLevel >= 1) {
            float heatWave = sin(uTime * uHeatPulseSpeed + p.x * 2.0 + p.y * 1.5);
            pulse = 0.85 + 0.3 * (heatWave * 0.5 + 0.5);
          }

          // Couleurs
          vec3 crust = uUseCustomColors ? uCrustColor : (uPaletteSecondary * 0.4);
          vec3 magma = uUseCustomColors ? uMagmaColor : uPalettePrimary;
          vec3 core = uUseCustomColors ? uCoreColor : uPaletteAccent;

          // Texture granuleuse de la croûte rocheuse
          float rockGrain = 1.0;
          if (uQualityLevel >= 2) {
            rockGrain = 0.88 + 0.12 * snoise(p * 12.0);
          }
          vec3 rockColor = crust * rockGrain;

          // Dégradé thermique 3 points
          vec3 glowColor = mix(magma, core, smoothstep(0.4, 0.9, magmaGlow));
          vec3 finalColor = mix(rockColor, glowColor, magmaGlow);

          // Lueur d'échauffement sur les bords des plaques
          float edgeHeat = smoothstep(0.35, 0.1, crackDist) * 0.45;
          finalColor += magma * (edgeHeat * pulse);

          // Intensité globale
          finalColor *= uIntensity;

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

  public updateProps(newProps: Partial<LavaFlowProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.crustColor !== undefined) {
      this.crustColorVec.set(newProps.crustColor)
      this.material.uniforms.uCrustColor.value = this.crustColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.magmaColor !== undefined) {
      this.magmaColorVec.set(newProps.magmaColor)
      this.material.uniforms.uMagmaColor.value = this.magmaColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.coreColor !== undefined) {
      this.coreColorVec.set(newProps.coreColor)
      this.material.uniforms.uCoreColor.value = this.coreColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.heatPulseSpeed !== undefined) this.material.uniforms.uHeatPulseSpeed.value = newProps.heatPulseSpeed
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

export const LavaFlowDefinition: IBrickDefinition<LavaFlowProps> = {
  type: 'lava_flow',
  category: 'background',
  create: (id, props, context) => new LavaFlowInstance(id, props, context),
}

BrickRegistry.register(LavaFlowDefinition)
