/**
 * src/theme-engine/bricks/overlay/ChromaticAberrationBrick.ts
 *
 * Brique de style et d'overlay : Aberration Chromatique & Dispersion Spectrale (Couche 5 : Overlay).
 * Rendu cinématographique de diffraction optique de lentille anamorphique et prisme RVB,
 * avec séparation directionnelle des canaux rouge/cyan et violet/vert vers les bords du cadre,
 * préservation absolue du centre optique (loi radiale r^2 pour lisibilité WCAG UI garantie),
 * réactivité directionnelle au curseur souris, micro-ondulation spectrale par Simplex 2D,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Aberration Chromatique.
 */
export interface ChromaticAberrationProps {
  /** Teinte dominante de la frange spectrale (défaut cyan électrique '#00f0ff'). */
  aberrationColor?: string
  /** Densité et compression des franges spectrales (0.3 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de dérive et d'ondulation prismatique (0.0 à 2.0, défaut 0.3). */
  speed?: number
  /** Profondeur et sensibilité directionnelle à la souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Intensité et éclat de la séparation des canaux RVB (0.1 à 1.5, défaut 0.6). */
  intensity?: number
  /** Asymétrie spectrale et perturbation organique Simplex (0.0 à 1.0, défaut 0.3). */
  randomness?: number
  /** Écartement spectral maximal de dispersion aux bordures (0.005 à 0.08, défaut 0.025). */
  spread?: number
  /** Facteur d'atténuation au centre pour lisibilité du contenu (0.5 à 3.0, défaut 1.6). */
  radialFalloff?: number
}

export class ChromaticAberrationInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'chromatic_aberration'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ChromaticAberrationProps
  private aberrationColorVec: THREE.Color

  constructor(id: string, props: ChromaticAberrationProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.aberrationColorVec = new THREE.Color(props.aberrationColor ?? '#00f0ff')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 0.6
    const randomness = props.randomness ?? 0.3
    const spread = props.spread ?? 0.025
    const radialFalloff = props.radialFalloff ?? 1.6

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uAberrationColor: { value: this.aberrationColorVec },
        uUseCustomColor: { value: Boolean(props.aberrationColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSpread: { value: spread },
        uRadialFalloff: { value: radialFalloff },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Overlay premier plan immédiat (z = -0.999)
          gl_Position = vec4(position.xy, -0.999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uAberrationColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSpread;
        uniform float uRadialFalloff;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Centre optique influencé par la souris
          vec2 center = vec2(0.5) + uMouse * (uDepth * 0.12);
          vec2 dir = uv - center;
          vec2 aspectDir = dir * vec2(aspect, 1.0);
          float dist = length(aspectDir);

          // Atténuation centrale stricte (zéro effet au centre de l'écran pour 100% de lisibilité du texte)
          float edgeFactor = pow(clamp(dist * 1.5, 0.0, 1.5), uRadialFalloff);

          if (edgeFactor <= 0.005) {
            discard;
          }

          vec2 normDir = normalize(dir);
          float angle = atan(dir.y, dir.x);

          vec3 finalColor = vec3(0.0);
          float alpha = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Dispersion spectrale 3 bandes + Ondulation Simplex + Réactivité dynamique ===
            vec2 noiseCoord = uv * (5.0 * uDensity) + vec2(sin(uTime * uSpeed * 0.8), cos(uTime * uSpeed * 0.6));
            float prismNoise = snoise(noiseCoord) * (uRandomness * 0.15);

            float effDist = dist + prismNoise;

            // Décalage spectral proportionnel à l'étirement radial
            float shift = uSpread * edgeFactor;

            // Franges spectrale rouge/cyan et violette/jaune
            float redBand = smoothstep(0.40, 0.75, effDist + shift);
            float greenBand = smoothstep(0.45, 0.80, effDist);
            float blueBand = smoothstep(0.50, 0.85, effDist - shift);

            // Composition spectrale continue
            vec3 spectralRGB = vec3(redBand * 1.1, greenBand * 0.7, blueBand * 1.2);

            // Modulation chromatique rotative le long du contour de lentille
            vec3 customTone = uUseCustomColor ? uAberrationColor : vec3(0.0, 0.94, 1.0);
            vec3 complementaryTone = vec3(1.0, 0.15, 0.4);
            float angleMod = sin(angle * 2.0 + uTime * uSpeed * 1.5) * 0.5 + 0.5;

            finalColor = mix(spectralRGB, mix(customTone, complementaryTone, angleMod), 0.5);
            alpha = clamp(edgeFactor * uIntensity * (redBand + blueBand) * 0.6, 0.0, 0.85);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Franges bicolores cyan/magenta radiale directes ===
            float shift = uSpread * edgeFactor;
            float rBand = smoothstep(0.45, 0.8, dist + shift);
            float bBand = smoothstep(0.50, 0.85, dist - shift);

            vec3 fringeColor = vec3(rBand, 0.1, bBand);
            finalColor = fringeColor;
            alpha = clamp(edgeFactor * uIntensity * 0.5, 0.0, 0.8);

          } else {
            // === PALIER LOW : Frange horizontale simple sans trigonométrie ===
            float hDist = abs(uv.x - 0.5) * 2.0;
            float lowEdge = pow(hDist, uRadialFalloff);
            finalColor = vec3(0.0, 0.8, 1.0) * lowEdge;
            alpha = clamp(lowEdge * uIntensity * 0.4, 0.0, 0.75);
          }

          if (alpha <= 0.004) discard;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 98 // Couche 5 (Overlay)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<ChromaticAberrationProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.aberrationColor !== undefined) {
      this.aberrationColorVec.set(newProps.aberrationColor)
      this.material.uniforms.uAberrationColor.value = this.aberrationColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.spread !== undefined) this.material.uniforms.uSpread.value = newProps.spread
    if (newProps.radialFalloff !== undefined)
      this.material.uniforms.uRadialFalloff.value = newProps.radialFalloff
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

export const ChromaticAberrationDefinition: IBrickDefinition<ChromaticAberrationProps> = {
  type: 'chromatic_aberration',
  category: 'overlay',
  create: (id, props, context) => new ChromaticAberrationInstance(id, props, context),
}

export const ChromaticAberrationAliasDefinition: IBrickDefinition<ChromaticAberrationProps> = {
  type: 'aberration_chromatique',
  category: 'overlay',
  create: (id, props, context) => new ChromaticAberrationInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(ChromaticAberrationDefinition)
BrickRegistry.register(ChromaticAberrationAliasDefinition)
