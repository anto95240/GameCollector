/**
 * src/theme-engine/bricks/overlay/PostProcessingOverlayBrick.ts
 *
 * Brique d'overlay et post-traitement léger (Couche 5 : Overlay).
 * Combine en une seule passe sans FBO lourd :
 * - Vignettage radial cinématographique doux.
 * - Grain argentique animé haute fréquence (film grain).
 * - Lueur diffuse douce (bloom subtil).
 */

import * as THREE from 'three'

import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export interface PostProcessingProps {
  vignetteDarkness?: number // 0.0 à 1.0 (défaut 0.45)
  vignetteOffset?: number   // 0.0 à 2.0 (défaut 1.1)
  grainIntensity?: number   // 0.0 à 0.15 (défaut 0.04)
  bloomSoftness?: number    // 0.0 à 0.3 (défaut 0.08)
}

class PostProcessingOverlayInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'post_processing_overlay'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene

  constructor(id: string, props: PostProcessingProps, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    const vigDarkness = props.vignetteDarkness ?? 0.45
    const vigOffset = props.vignetteOffset ?? 1.1
    const grainInt = props.grainIntensity ?? 0.04
    const bloomSoft = props.bloomSoftness ?? 0.08

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uVignetteDarkness: { value: vigDarkness },
        uVignetteOffset: { value: vigOffset },
        uGrainIntensity: { value: grainInt },
        uBloomSoftness: { value: bloomSoft },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Plan de premier plan immédiat (z = -0.999 en clip space)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uPaletteAccent;
        uniform float uVignetteDarkness;
        uniform float uVignetteOffset;
        uniform float uGrainIntensity;
        uniform float uBloomSoftness;
        varying vec2 vUv;

        // Générateur pseudo-aléatoire rapide
        float pseudoNoise(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          // 1. Calcul du vignettage radial
          vec2 centerDist = uv - vec2(0.5);
          float dist = length(centerDist);
          float vignette = smoothstep(uVignetteOffset, uVignetteOffset * 0.4, dist);
          float vigAlpha = (1.0 - vignette) * uVignetteDarkness;

          // 2. Grain argentique animé
          vec2 grainCoord = gl_FragCoord.xy + fract(uTime * 37.1) * 100.0;
          float grain = (pseudoNoise(grainCoord) - 0.5) * uGrainIntensity;

          // 3. Lueur douce diffuse au centre
          float centerBloom = (1.0 - dist * 1.4) * uBloomSoftness;
          centerBloom = max(0.0, centerBloom);

          // Rendu final combiné
          vec3 vigColor = vec3(0.0, 0.0, 0.0);
          vec3 bloomColor = uPaletteAccent * centerBloom;

          // Couleur d'overlay
          vec3 finalRgb = vigColor + bloomColor + vec3(grain);
          float finalAlpha = clamp(vigAlpha + centerBloom * 0.5 + abs(grain), 0.0, 0.85);

          gl_FragColor = vec4(finalRgb, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 100 // Toujours au premier plan
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    if (quality === 'LOW') {
      this.material.uniforms.uGrainIntensity.value = 0.0
      this.material.uniforms.uBloomSoftness.value = 0.0
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

export const PostProcessingOverlayDefinition: IBrickDefinition<PostProcessingProps> = {
  type: 'post_processing_overlay',
  category: 'overlay',
  create: (id, props, context) => new PostProcessingOverlayInstance(id, props, context),
}

// Enregistrement automatique
BrickRegistry.register(PostProcessingOverlayDefinition)
