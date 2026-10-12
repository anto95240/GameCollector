/**
 * src/theme-engine/bricks/atmosphere/HeatDistortionBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Distorsion de chaleur et mirage thermique ascensionnel (désert brûlant, réacteurs, magma),
 * avec ondes convectives turbulentes, réfraction optique non-linéaire,
 * aberration chromatique prismatique (dispersion RVB), et atténuation d'altitude.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Distorsion de Chaleur.
 */
export interface HeatDistortionProps {
  /** Teinte du miroitement thermique (défaut #fb923c ou uPaletteAccent). */
  tintColor?: string
  /** Fréquence spatiale et compacité des vagues thermiques (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse d'ascension verticale de la colonne thermique (0.0 à 1.0, défaut 0.3). */
  speed?: number
  /** Profondeur et réactivité à la parallaxe caméra (0.0 à 1.0, défaut 0.25). */
  depth?: number
  /** Amplitude de déformation et réfraction optique (0.1 à 2.5, défaut 1.0). */
  intensity?: number
  /** Turbulence chaotique et instabilité convective (0.0 à 1.0, défaut 0.4). */
  randomness?: number
  /** Hauteur maximale d'impact de la colonne de chaleur (0.2 à 1.0, défaut 0.65). */
  heatHeight?: number
  /** Séparation spectrale chromatique RVB (0.0 à 0.05, défaut 0.015). */
  chromaticAberration?: number
}

export class HeatDistortionInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'heat_distortion'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: HeatDistortionProps
  private tintColorVec: THREE.Color

  constructor(id: string, props: HeatDistortionProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.tintColorVec = new THREE.Color(props.tintColor ?? '#fb923c')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.25
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const heatHeight = props.heatHeight ?? 0.65
    const chromaticAberration = props.chromaticAberration ?? 0.015

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uTintColor: { value: this.tintColorVec },
        uUseCustomColor: { value: Boolean(props.tintColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHeatHeight: { value: heatHeight },
        uChromaticAberration: { value: chromaticAberration },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.978, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uTintColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHeatHeight;
        uniform float uChromaticAberration;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * uSpeed;

          // Parallaxe souris et inertie thermique
          vec2 mouseOffset = uMouse * (uDepth * 0.12);
          p += mouseOffset;

          // Masque vertical : chaleur intense près du sol (y bas) se dissipant à uHeatHeight
          float yGround = 1.0 - uv.y; // 1 au sol (uv.y = 0), 0 en haut (uv.y = 1)
          float heightFactor = smoothstep(0.0, 1.0, clamp((uHeatHeight - uv.y) / max(0.01, uHeatHeight), 0.0, 1.0));
          heightFactor = pow(heightFactor, 1.3);

          if (heightFactor <= 0.005) {
            discard;
          }

          // Déplacement convectif ascendant avec dérive latérale organique
          float lateralDrift = snoise(vec2(t * 0.35, 1.7)) * (uRandomness * 0.4);
          vec2 flowCoord = vec2((p.x + lateralDrift) * 6.0 * uDensity, (p.y - t * 0.8) * 8.0 * uDensity);

          vec2 distortion = vec2(0.0);
          float shimmerVal = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Double nappe Simplex avec domain warping et turbulence ===
            vec2 q = vec2(
              snoise(flowCoord + vec2(t * 0.2, 0.0)),
              snoise(flowCoord + vec2(2.5, t * 0.4))
            );

            float n1 = snoise(flowCoord + q * (uRandomness * 1.5));
            float n2 = snoise(flowCoord * 2.3 - vec2(0.0, t * 1.2));

            distortion.x = (n1 * 0.7 + n2 * 0.3) * (uIntensity * 0.04) * heightFactor;
            distortion.y = (n2 * 0.8 - n1 * 0.2) * (uIntensity * 0.03) * heightFactor;

            // Miroitement thermique haute fréquence
            shimmerVal = abs(n1) * 0.5 + abs(n2) * 0.5;

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Nappe Simplex convective standard ===
            float n = snoise(flowCoord);
            distortion.x = n * (uIntensity * 0.03) * heightFactor;
            distortion.y = snoise(flowCoord + 4.0) * (uIntensity * 0.02) * heightFactor;
            shimmerVal = abs(n);

          } else {
            // === PALIER LOW : Ondulation sinusoïdale verticale (ultra-léger) ===
            float wave = sin(p.y * 18.0 * uDensity - t * 4.0) * cos(p.x * 12.0 * uDensity);
            distortion.x = wave * (uIntensity * 0.02) * heightFactor;
            distortion.y = wave * 0.5 * (uIntensity * 0.01) * heightFactor;
            shimmerVal = abs(wave);
          }

          // Séparation spectrale chromatique (aberration optique RVB)
          float chroma = uChromaticAberration * heightFactor * uIntensity;
          vec2 rUv = p + distortion + vec2(chroma, 0.0);
          vec2 gUv = p + distortion;
          vec2 bUv = p + distortion - vec2(chroma, 0.0);

          float rWave = abs(snoise(rUv * 5.0 - vec2(0.0, t)));
          float gWave = abs(snoise(gUv * 5.0 - vec2(0.0, t)));
          float bWave = abs(snoise(bUv * 5.0 - vec2(0.0, t)));

          vec3 baseTint = uUseCustomColor ? uTintColor : uPaletteAccent;

          // Effet de réfraction lumineuse chatoyante
          vec3 shimmerColor = vec3(
            mix(baseTint.r, 1.0, rWave * 0.4),
            mix(baseTint.g, 1.0, gWave * 0.4),
            mix(baseTint.b, 1.0, bWave * 0.4)
          );

          // Opacité douce pour ne pas saturer l'image, juste la sublimer
          float alpha = clamp(shimmerVal * heightFactor * (uIntensity * 0.35), 0.0, 0.65);

          if (alpha <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(shimmerColor * (1.0 + shimmerVal * 0.5), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -8 // Entre les lumières (-10) et les overlays
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<HeatDistortionProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.tintColor !== undefined) {
      this.tintColorVec.set(newProps.tintColor)
      this.material.uniforms.uTintColor.value = this.tintColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.heatHeight !== undefined)
      this.material.uniforms.uHeatHeight.value = newProps.heatHeight
    if (newProps.chromaticAberration !== undefined)
      this.material.uniforms.uChromaticAberration.value = newProps.chromaticAberration
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

export const HeatDistortionDefinition: IBrickDefinition<HeatDistortionProps> = {
  type: 'heat_distortion',
  category: 'atmosphere',
  create: (id, props, context) => new HeatDistortionInstance(id, props, context),
}

BrickRegistry.register(HeatDistortionDefinition)
