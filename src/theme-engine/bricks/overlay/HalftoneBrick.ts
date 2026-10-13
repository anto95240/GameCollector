/**
 * src/theme-engine/bricks/overlay/HalftoneBrick.ts
 *
 * Brique de style et d'overlay : Trame Comics & Demi-teintes Pop Art (Couche 5 : Overlay).
 * Rendu d'imprimerie offset vintage et bande dessinée américaine (Ben-Day dots à la Roy Lichtenstein),
 * avec matrice rotative inclinée à 45°, modulation organique du diamètre des points selon l'éclairage,
 * micro-bavure d'encre papier par Simplex 2D, onde cinétique réactive à la souris,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Trame Comics (Halftone).
 */
export interface HalftoneProps {
  /** Teinte de l'encre d'impression (défaut noir d'imprimerie '#000000'). */
  dotColor?: string
  /** Densité et compacité de la grille de points (0.4 à 3.0, défaut 1.2). */
  density?: number
  /** Vitesse de pulsation et d'ondulation cinétique de la trame (0.0 à 1.5, défaut 0.2). */
  speed?: number
  /** Profondeur et sensibilité de la trame à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Intensité et contraste de l'encrage des points (0.1 à 1.0, défaut 0.5). */
  intensity?: number
  /** Facteur de bavure d'encre et irrégularité organique de papier (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Angle d'inclinaison de la trame en radians (défaut 0.7853 = 45 degrés). */
  patternAngle?: number
  /** Rayon de base des points de trame (0.1 à 0.85, défaut 0.45). */
  dotRadius?: number
}

export class HalftoneInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'halftone'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: HalftoneProps
  private dotColorVec: THREE.Color

  constructor(id: string, props: HalftoneProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.dotColorVec = new THREE.Color(props.dotColor ?? '#000000')

    const density = props.density ?? 1.2
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 0.5
    const randomness = props.randomness ?? 0.3
    const patternAngle = props.patternAngle ?? 0.785398
    const dotRadius = props.dotRadius ?? 0.45

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uDotColor: { value: this.dotColorVec },
        uUseCustomColor: { value: Boolean(props.dotColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uPatternAngle: { value: patternAngle },
        uDotRadius: { value: dotRadius },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uDotColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uPatternAngle;
        uniform float uDotRadius;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          vec2 screenPos = gl_FragCoord.xy;

          // Décalage de parallaxe avec la souris
          vec2 mouseOffset = uMouse * (uDepth * 25.0);
          screenPos += mouseOffset;

          // Matrice de rotation selon l'angle d'imprimerie (typique 45° pour un tramage harmonieux)
          float s = sin(uPatternAngle);
          float c = cos(uPatternAngle);
          mat2 rot = mat2(c, -s, s, c);
          vec2 rotatedPos = rot * screenPos;

          // Taille d'une cellule de trame en pixels écran
          float cellSize = (24.0 / max(0.2, uDensity));
          vec2 cellUv = fract(rotatedPos / cellSize) - vec2(0.5);
          float distToDotCenter = length(cellUv);

          // Modulation radiale et onde cinétique douce
          vec2 centerDist = uv - vec2(0.5);
          float radialDist = length(centerDist);
          float kineticWave = sin(radialDist * 9.0 - uTime * uSpeed * 2.5) * 0.08;

          // Influence du curseur de la souris (dilatation des points au survol)
          vec2 mouseScreenNorm = (uMouse * 0.5 + 0.5);
          float distToMouse = length(uv - mouseScreenNorm);
          float mouseBulge = exp(-distToMouse * 5.0) * (uDepth * 0.15);

          // Rayon effectif du point Ben-Day
          float baseRadius = uDotRadius * 0.5;
          float targetRadius = clamp(baseRadius + kineticWave + mouseBulge, 0.05, 0.48);

          float dotMask = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Anti-aliasing précis + Bavure d'encre papier Simplex ===
            vec2 bleedCoord = rotatedPos * 0.12 + vec2(sin(uTime * uSpeed * 0.4), cos(uTime * uSpeed * 0.3));
            float inkBleed = snoise(bleedCoord) * (uRandomness * 0.06);

            float rFinal = targetRadius + inkBleed;
            float aaWidth = 0.04;
            dotMask = smoothstep(rFinal + aaWidth, rFinal - aaWidth, distToDotCenter);

            // Halo d'absorption d'encre secondaire (encre buvardée sur papier presse)
            float inkHalo = smoothstep(rFinal + aaWidth * 2.5, rFinal, distToDotCenter) * 0.25;
            dotMask = clamp(dotMask + inkHalo, 0.0, 1.0);

            // Atténuation vaporeuse au centre pour préserver le focus UI
            float centerFade = smoothstep(0.12, 0.52, radialDist);
            dotMask *= mix(0.55, 1.0, centerFade);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Points réguliers anti-aliasés direct ===
            float aaWidth = 0.05;
            dotMask = smoothstep(targetRadius + aaWidth, targetRadius - aaWidth, distToDotCenter);

          } else {
            // === PALIER LOW : Seuil géométrique dur sans smoothstep lourd ===
            dotMask = distToDotCenter < targetRadius ? 1.0 : 0.0;
          }

          float alpha = clamp(dotMask * uIntensity, 0.0, 0.95);
          if (alpha <= 0.005) discard;

          gl_FragColor = vec4(uDotColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 95 // Couche 5 (Overlay)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<HalftoneProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.dotColor !== undefined) {
      this.dotColorVec.set(newProps.dotColor)
      this.material.uniforms.uDotColor.value = this.dotColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.patternAngle !== undefined)
      this.material.uniforms.uPatternAngle.value = newProps.patternAngle
    if (newProps.dotRadius !== undefined)
      this.material.uniforms.uDotRadius.value = newProps.dotRadius
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

export const HalftoneDefinition: IBrickDefinition<HalftoneProps> = {
  type: 'halftone',
  category: 'overlay',
  create: (id, props, context) => new HalftoneInstance(id, props, context),
}

export const HalftoneAliasDefinition: IBrickDefinition<HalftoneProps> = {
  type: 'comic_halftone',
  category: 'overlay',
  create: (id, props, context) => new HalftoneInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(HalftoneDefinition)
BrickRegistry.register(HalftoneAliasDefinition)
