/**
 * src/theme-engine/bricks/parallax/ParallaxPixelTilesBrick.ts
 *
 * Brique de silhouettes de Tuiles Pixel en Parallaxe (Couche 2 : Intermediate).
 * Scène de jeu de plateforme rétro 16-bit (style SNES / Mega Drive) avec quantification stricte sur grille de pixels :
 * - Plan lointain : collines étagées pixelisées et nuages rétro avec trame de Bayer ordonnée (dithering 16-bit)
 * - Plan médian : reliefs en escalier géométrique avec contours foncés 1-pixel
 * - Premier plan : plateformes flottantes, dalles de pierre/briques, frange d'herbe crénelée et colonnes
 *
 * Défilement discret cadencé au pas de pixel (pixel-perfect stepping), 3 vitesses de parallaxe différentielle,
 * et sensibilité à la souris et au défilement.
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Tuiles Pixel.
 */
export interface ParallaxPixelTilesProps {
  /** Teinte dominante des briques / dalles de sol (défaut #1e293b ou uPaletteSecondary * 0.4). */
  tileColor?: string
  /** Teinte de la frange supérieure (ex: herbe, mousse ou surfaçage) (défaut #10b981 ou uPalettePrimary). */
  topFringeColor?: string
  /** Teinte des trames d'ombrage rétro (défaut #0f172a ou uPaletteSecondary * 0.3). */
  ditherColor?: string
  /** Densité et nombre de plateformes suspendues (défaut 1.0). */
  density?: number
  /** Vitesse de défilement horizontal rétro (défaut 0.25). */
  speed?: number
  /** Échelonnement en profondeur et sensibilité à la parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Contraste rétro et netteté des arêtes (défaut 1.0). */
  intensity?: number
  /** Variabilité des hauteurs de plateformes et espacements (défaut 0.45). */
  randomness?: number
  /** Taille des pixels rétro à l'écran en pixels physiques (défaut 4.0, de 2.0 à 10.0). */
  pixelSize?: number
}

export class ParallaxPixelTilesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_pixel_tiles'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxPixelTilesProps
  private tileColorVec: THREE.Color
  private topFringeColorVec: THREE.Color
  private ditherColorVec: THREE.Color

  constructor(id: string, props: ParallaxPixelTilesProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.tileColorVec = new THREE.Color(props.tileColor ?? '#1e293b')
    this.topFringeColorVec = new THREE.Color(props.topFringeColor ?? '#10b981')
    this.ditherColorVec = new THREE.Color(props.ditherColor ?? '#0f172a')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.45
    const pixelSize = props.pixelSize ?? 4.0

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
        uTileColor: { value: this.tileColorVec },
        uTopFringeColor: { value: this.topFringeColorVec },
        uDitherColor: { value: this.ditherColorVec },
        uUseCustomColors: {
          value: Boolean(props.tileColor || props.topFringeColor || props.ditherColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uPixelSize: { value: pixelSize },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.993, 1.0);
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
        uniform vec3 uTileColor;
        uniform vec3 uTopFringeColor;
        uniform vec3 uDitherColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uPixelSize;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        // Matrice de trame ordonnée Bayer 2x2 rétro (16-bit dithering)
        float bayer2x2(vec2 p) {
          vec2 coord = floor(mod(p, 2.0));
          if (coord.y == 0.0) {
            return coord.x == 0.0 ? 0.0 : 0.5;
          }
          return coord.x == 0.0 ? 0.75 : 0.25;
        }

        void main() {
          vec2 screenPos = gl_FragCoord.xy;
          // Quantification stricte sur la grille de pixels (Pixel-perfect)
          vec2 pixelPos = floor(screenPos / uPixelSize) * uPixelSize;
          vec2 uv = pixelPos / uResolution;

          float t = uTime;

          vec3 baseTile = uUseCustomColors ? uTileColor : (uPaletteSecondary * 0.35);
          vec3 baseFringe = uUseCustomColors ? uTopFringeColor : uPalettePrimary;
          vec3 baseDither = uUseCustomColors ? uDitherColor : (uPaletteSecondary * 0.2);

          vec4 result = vec4(0.0);

          // Pas temporel quantifié pour simuler le scrolling rétro 60Hz
          float discreteTime = floor(t * 60.0) / 60.0;

          // -------------------------------------------------------------
          // Strate 3 : Collines pixelisées lointaines avec tramage Bayer
          // -------------------------------------------------------------
          if (uQualityLevel >= 1) {
            float shiftX = floor((discreteTime * uSpeed * 0.06 + uMouse.x * uDepth * 0.12) * 200.0) / 200.0;
            float shiftY = floor((uMouse.y * uDepth * 0.06 + uScroll * 0.05) * 150.0) / 150.0;
            vec2 p3 = uv + vec2(shiftX, shiftY);

            // Hauteur en marches d'escalier rétro
            float stepCol = floor(p3.x * 24.0 * uDensity);
            float h3 = 0.35 + sin(stepCol * 0.6) * 0.08 + cos(stepCol * 1.3) * 0.04 * uRandomness;

            if (p3.y <= h3) {
              vec3 col3 = mix(baseDither, baseTile * 0.8, 0.4);
              // Tramage de Bayer pour le dégradé vertical
              if (uQualityLevel >= 2) {
                float ditherGrad = (h3 - p3.y) / 0.25;
                float dThreshold = bayer2x2(pixelPos / uPixelSize);
                if (ditherGrad < dThreshold) {
                  col3 = mix(col3, baseDither * 0.7, 0.6);
                }
              }
              result = vec4(col3, 1.0);
            }
          }

          // -------------------------------------------------------------
          // Strate 2 : Relief intermédiaire en blocs & pyramides
          // -------------------------------------------------------------
          {
            float shiftX = floor((discreteTime * uSpeed * 0.14 + uMouse.x * uDepth * 0.28) * 250.0) / 250.0;
            float shiftY = floor((uMouse.y * uDepth * 0.14 + uScroll * 0.10) * 180.0) / 180.0;
            vec2 p2 = uv + vec2(shiftX, shiftY);

            float stepCol2 = floor(p2.x * 32.0 * uDensity);
            float h2 = 0.22 + sin(stepCol2 * 0.9 + 1.2) * 0.09 + sin(stepCol2 * 2.1) * 0.03 * uRandomness;

            if (p2.y <= h2) {
              vec3 col2 = baseTile;
              // Contour 1-pixel supérieur
              float topPixelDist = h2 - p2.y;
              if (topPixelDist < (uPixelSize * 2.0 / uResolution.y)) {
                col2 = mix(col2, baseFringe * 0.8, 0.75);
              }
              result = vec4(col2, 1.0);
            }
          }

          // -------------------------------------------------------------
          // Strate 1 : Plateformes suspendues & sol d'avant-plan (Briques)
          // -------------------------------------------------------------
          {
            float shiftX = floor((discreteTime * uSpeed * 0.30 + uMouse.x * uDepth * 0.55) * 300.0) / 300.0;
            float shiftY = floor((uMouse.y * uDepth * 0.25 + uScroll * 0.20) * 200.0) / 200.0;
            vec2 p1 = uv + vec2(shiftX, shiftY);

            // 1. Sol d'avant-plan avec découpe crénelée
            float groundBase = 0.08;
            bool inForeground = (p1.y <= groundBase);

            // 2. Plateformes flottantes suspendues (pavés 16-bit)
            float platGridX = floor(p1.x * 12.0 * uDensity);
            float platLocalX = fract(p1.x * 12.0 * uDensity);
            float pSeed = hash12(vec2(platGridX, 42.0));

            // Si plateforme présente dans cette cellule
            if (pSeed > 0.45) {
              float platY = 0.18 + pSeed * 0.16 * uRandomness;
              float platH = 0.045;
              // Largeur de plateforme : 3 tuiles
              if (platLocalX > 0.15 && platLocalX < 0.85) {
                if (p1.y >= platY && p1.y <= (platY + platH)) {
                  inForeground = true;
                }
              }
            }

            if (inForeground) {
              vec3 col1 = baseTile * 1.15;

              // Frange d'herbe / bordure rétro lumineuse au sommet
              // Frange crénelée 16-bit
              float fringeCheck = fract(p1.y * 50.0);
              if (fringeCheck > 0.7) {
                col1 = baseFringe;
              }

              // Lignes de joints de briques horizontales et verticales
              float brickLineY = fract(p1.y * 30.0);
              float brickLineX = fract(p1.x * 20.0 + floor(p1.y * 30.0) * 0.5);
              if (brickLineY < 0.08 || (brickLineX < 0.08 && brickLineY > 0.08)) {
                col1 = baseDither; // joint d'ombre rétro
              }

              result = vec4(col1, 1.0);
            }
          }

          if (result.a <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(result.rgb, clamp(result.a * uIntensity, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -40
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxPixelTilesProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.tileColor !== undefined) {
      this.tileColorVec.set(newProps.tileColor)
      this.material.uniforms.uTileColor.value = this.tileColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.topFringeColor !== undefined) {
      this.topFringeColorVec.set(newProps.topFringeColor)
      this.material.uniforms.uTopFringeColor.value = this.topFringeColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.ditherColor !== undefined) {
      this.ditherColorVec.set(newProps.ditherColor)
      this.material.uniforms.uDitherColor.value = this.ditherColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.pixelSize !== undefined) this.material.uniforms.uPixelSize.value = newProps.pixelSize
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

export const ParallaxPixelTilesDefinition: IBrickDefinition<ParallaxPixelTilesProps> = {
  type: 'parallax_pixel_tiles',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxPixelTilesInstance(id, props, context),
}

BrickRegistry.register(ParallaxPixelTilesDefinition)
