/**
 * src/theme-engine/bricks/parallax/ParallaxPlaneBrick.ts
 *
 * Brique de plans de parallaxe (Couche 2 : Intermediate).
 * Silhouette procédurale organique générée par fragment shader (crêtes/montagnes/brume),
 * décalée en profondeur (Z) avec translation dynamique liée à la souris et au scroll.
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, InteractionState, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export interface ParallaxPlaneProps {
  depthZ?: number          // Position sur l'axe Z (ex: -5 à -20)
  parallaxFactor?: number  // Intensité du déplacement relatif (ex: 0.2 à 0.8)
  ridgeFrequency?: number  // Fréquence des ondulations procédurales
  ridgeHeight?: number     // Hauteur relative de la crête
  opacity?: number         // Opacité de la couche
  colorTint?: string       // Teinte spécifique ou utilise palette
}

class ParallaxPlaneInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_plane'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private depthZ: number
  private parallaxFactor: number
  private basePosX = 0
  private basePosY = 0

  constructor(id: string, props: ParallaxPlaneProps, context: BrickContext) {
    this.id = id
    this.scene = context.scene
    this.depthZ = props.depthZ ?? -10
    this.parallaxFactor = props.parallaxFactor ?? 0.35

    const ridgeFreq = props.ridgeFrequency ?? 1.8
    const ridgeH = props.ridgeHeight ?? 0.4
    const opacity = props.opacity ?? 0.75

    // Taille large pour couvrir les bords lors des mouvements de caméra
    const geometry = new THREE.PlaneGeometry(30, 18)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uRidgeFreq: { value: ridgeFreq },
        uRidgeHeight: { value: ridgeH },
        uOpacity: { value: opacity },
        uDepthRatio: { value: Math.abs(this.depthZ) / 20 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform float uRidgeFreq;
        uniform float uRidgeHeight;
        uniform float uOpacity;
        uniform float uDepthRatio;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          // Génération d'une crête organique procédurale
          float x = uv.x * uRidgeFreq + 1.5;
          float ridge = snoise(vec2(x, 0.5)) * 0.5 + 0.5;
          ridge += snoise(vec2(x * 2.5, 1.2)) * 0.25;
          ridge *= uRidgeHeight;

          // Seuil d'affichage de la silhouette (partie inférieure)
          float edge = smoothstep(ridge - 0.02, ridge + 0.02, uv.y);
          if (edge > 0.99) {
            discard; // Rendre transparent le ciel au-dessus de la crête
          }

          // Dégradé atmosphérique de profondeur
          float fog = smoothstep(0.0, ridge, uv.y);
          vec3 col = mix(uPaletteSecondary * 0.4, uPalettePrimary * 0.25, uDepthRatio);
          col += uPalettePrimary * 0.15 * (1.0 - fog);

          float alpha = (1.0 - edge) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.position.set(0, -2, this.depthZ)
    this.basePosX = 0
    this.basePosY = -2
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(_delta: number, _time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    // Déplacement de parallaxe basé sur la souris amortie et le scroll
    const offsetX = interaction.mouseX * this.parallaxFactor * 2.5
    const offsetY = interaction.mouseY * this.parallaxFactor * 1.5 + interaction.scrollY * 1.2

    this.mesh.position.x = this.basePosX + offsetX
    this.mesh.position.y = this.basePosY + offsetY
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    if (quality === 'LOW') {
      this.material.uniforms.uOpacity.value *= 0.8
    }
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

export const ParallaxPlaneDefinition: IBrickDefinition<ParallaxPlaneProps> = {
  type: 'parallax_plane',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxPlaneInstance(id, props, context),
}

// Enregistrement automatique
BrickRegistry.register(ParallaxPlaneDefinition)
