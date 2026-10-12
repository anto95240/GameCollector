/**
 * src/theme-engine/bricks/background/MultiLayerStarfieldBrick.ts
 *
 * Brique de fond Champ d'Étoiles Multi-Couches (Couche 1 : Background).
 * Rendu 3D par instanciation de points (1 seul draw call) avec 3 strates de profondeur Z :
 * - Couche lointaine (poussière stellaire dense et lente)
 * - Couche médiane (étoiles scintillantes avec cycles asynchrones)
 * - Couche proche (étoiles majeures à forte parallaxe avec aigrettes de diffraction)
 * Adaptation aux paliers HIGH (1200 étoiles), MEDIUM (600 étoiles) et LOW (250 étoiles).
 */

import * as THREE from 'three'

import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour le Champ d'Étoiles.
 */
export interface MultiLayerStarfieldProps {
  /** Teinte stellaire dominante (défaut #ffffff ou uPaletteAccent). */
  starColor?: string
  /** Multiplicateur de densité d'étoiles (0.2 à 2.0, défaut 1.0). */
  density?: number
  /** Vitesse de dérive et rotation spatiale (défaut 0.1). */
  speed?: number
  /** Profondeur et étagement Z (sensibilité à la parallaxe de la caméra, défaut 1.0). */
  depth?: number
  /** Intensité et éclat de brillance (défaut 1.0). */
  intensity?: number
  /** Aléatoire de taille et dispersion de déphasage (défaut 0.5). */
  randomness?: number
  /** Fréquence du scintillement stellaire (défaut 1.5). */
  twinkleSpeed?: number
}

const MAX_STARS_HIGH = 1200
const MAX_STARS_MED = 600
const MAX_STARS_LOW = 250

export class MultiLayerStarfieldInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'multilayer_starfield'

  private points: THREE.Points | null = null
  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: MultiLayerStarfieldProps
  private starColorVec: THREE.Color

  constructor(id: string, props: MultiLayerStarfieldProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.starColorVec = new THREE.Color(props.starColor ?? '#ffffff')

    const speed = props.speed ?? 0.1
    const depth = props.depth ?? 1.0
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5
    const twinkleSpeed = props.twinkleSpeed ?? 1.5

    // Génération du BufferGeometry pour MAX_STARS_HIGH étoiles
    this.geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(MAX_STARS_HIGH * 3)
    const attributesData = new Float32Array(MAX_STARS_HIGH * 4) // x: layer (0,1,2), y: baseSize, z: phase, w: speedMult

    for (let i = 0; i < MAX_STARS_HIGH; i++) {
      // Répartition entre les 3 couches :
      // Couche 0 (lointaine) : 55% des étoiles
      // Couche 1 (médiane) : 33%
      // Couche 2 (proche) : 12%
      let layer = 0
      const r = Math.random()
      if (r > 0.88) layer = 2
      else if (r > 0.55) layer = 1

      // Coordonnées spatiales selon la couche
      const spreadX = 35 + layer * 15
      const spreadY = 22 + layer * 10
      const x = (Math.random() - 0.5) * spreadX
      const y = (Math.random() - 0.5) * spreadY
      // Z profond : couche 0 (-35 à -25), couche 1 (-25 à -15), couche 2 (-15 à -5)
      const baseZ = -35 + layer * 10
      const z = baseZ + (Math.random() - 0.5) * 6

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Attributs custom
      const baseSize =
        layer === 2
          ? 3.2 + Math.random() * 2.5
          : layer === 1
            ? 1.8 + Math.random() * 1.5
            : 0.8 + Math.random() * 0.8

      attributesData[i * 4] = layer
      attributesData[i * 4 + 1] = baseSize
      attributesData[i * 4 + 2] = Math.random() * Math.PI * 2 // phase
      attributesData[i * 4 + 3] = 0.5 + Math.random() * 1.5 // vitesse relative
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('aStarData', new THREE.BufferAttribute(attributesData, 4))

    const activeCount =
      context.quality === 'HIGH' ? MAX_STARS_HIGH : context.quality === 'MEDIUM' ? MAX_STARS_MED : MAX_STARS_LOW
    this.geometry.setDrawRange(0, Math.floor(activeCount * (props.density ?? 1.0)))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uStarColor: { value: this.starColorVec },
        uUseCustomColor: { value: Boolean(props.starColor) },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uTwinkleSpeed: { value: twinkleSpeed },
        uQualityLevel: { value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aStarData; // x: layer, y: baseSize, z: phase, w: speedMult
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uTwinkleSpeed;
        uniform int uQualityLevel;
        varying float vAlpha;
        varying float vLayer;

        void main() {
          float layer = aStarData.x;
          float baseSize = aStarData.y;
          float phase = aStarData.z;
          float speedMult = aStarData.w;
          vLayer = layer;

          vec3 pos = position;

          // Parallaxe différenciée par strate de profondeur
          float parallaxFactor = (layer + 1.0) * 0.45 * uDepth;
          pos.x += uMouse.x * parallaxFactor;
          pos.y += uMouse.y * parallaxFactor;

          // Dérive lente orbitale
          pos.x += sin(uTime * uSpeed * 0.08 + phase) * (0.3 * (layer + 0.5));
          pos.y += cos(uTime * uSpeed * 0.05 + phase) * (0.2 * (layer + 0.5));

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Taille dynamique avec perspective
          gl_PointSize = baseSize * (150.0 / -mvPosition.z);

          // Scintillement asynchrone non linéaire
          float t = uTime * uTwinkleSpeed * speedMult + phase;
          float twinkle = sin(t) * 0.4 + cos(t * 1.618) * 0.35 + 0.5;
          vAlpha = clamp(twinkle, 0.2, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uPaletteAccent;
        uniform vec3 uStarColor;
        uniform bool uUseCustomColor;
        uniform float uIntensity;
        uniform int uQualityLevel;
        varying float vAlpha;
        varying float vLayer;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);

          if (dist > 0.5) discard;

          // Profil radial doux
          float glow = exp(-dist * 6.5);

          // Aigrettes de diffraction sur les étoiles proches en HIGH
          if (uQualityLevel >= 2 && vLayer >= 1.5) {
            float crossR = max(0.0, 1.0 - abs(coord.x) * 12.0) * max(0.0, 1.0 - abs(coord.y) * 2.5);
            float crossU = max(0.0, 1.0 - abs(coord.y) * 12.0) * max(0.0, 1.0 - abs(coord.x) * 2.5);
            glow += (crossR + crossU) * 0.35;
          }

          vec3 baseColor = uUseCustomColor ? uStarColor : mix(vec3(1.0), uPaletteAccent, 0.35);

          gl_FragColor = vec4(baseColor * (glow * vAlpha * uIntensity), glow * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = -97
    this.scene.add(this.points)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<MultiLayerStarfieldProps>): void {
    if (!this.material || !this.geometry) return
    this.props = { ...this.props, ...newProps }

    if (newProps.starColor !== undefined) {
      this.starColorVec.set(newProps.starColor)
      this.material.uniforms.uStarColor.value = this.starColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.twinkleSpeed !== undefined) this.material.uniforms.uTwinkleSpeed.value = newProps.twinkleSpeed

    if (newProps.density !== undefined) {
      const activeTier = this.material.uniforms.uQualityLevel.value
      const baseMax = activeTier === 2 ? MAX_STARS_HIGH : activeTier === 1 ? MAX_STARS_MED : MAX_STARS_LOW
      const targetCount = Math.floor(Math.min(MAX_STARS_HIGH, baseMax * newProps.density))
      this.geometry.setDrawRange(0, targetCount)
    }
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material || !this.geometry) return
    const tierVal = quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    this.material.uniforms.uQualityLevel.value = tierVal

    const baseMax = tierVal === 2 ? MAX_STARS_HIGH : tierVal === 1 ? MAX_STARS_MED : MAX_STARS_LOW
    const targetCount = Math.floor(Math.min(MAX_STARS_HIGH, baseMax * (this.props.density ?? 1.0)))
    this.geometry.setDrawRange(0, targetCount)
  }

  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points)
      if (this.geometry) this.geometry.dispose()
      if (this.material) this.material.dispose()
      this.points = null
      this.geometry = null
      this.material = null
    }
  }
}

export const MultiLayerStarfieldDefinition: IBrickDefinition<MultiLayerStarfieldProps> = {
  type: 'multilayer_starfield',
  category: 'background',
  create: (id, props, context) => new MultiLayerStarfieldInstance(id, props, context),
}

BrickRegistry.register(MultiLayerStarfieldDefinition)
