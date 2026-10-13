/**
 * src/theme-engine/bricks/special/HexGridBrick.ts
 *
 * Brique Spéciale : Grille Hexagonale Nanotech & Bouclier d'Énergie (Couche : Spéciaux).
 * Raccordement géométrique alvéolaire en coordonnées axiales, avec arêtes néon biseautées,
 * pulsation biologique stochastique par cellule, ondes d'énergie concentriques traversant
 * la structure, cœurs nanotechnologiques réactifs et onde de choc interactive sous la souris.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Grille Hexagonale.
 */
export interface HexGridProps {
  /** Couleur principale des arêtes de la grille (défaut #00f0ff ou uPaletteAccent). */
  borderColor?: string
  /** Couleur de fond interne des cellules alvéolaires (défaut #001224 ou uPaletteSecondary). */
  fillColor?: string
  /** Couleur des ondes et cœurs d'énergie (défaut #ff007f ou uPalettePrimary). */
  pulseColor?: string
  /** Échelle et finesse des hexagones (0.4 à 3.0, défaut 1.0). */
  density?: number
  /** Vitesse de pulsation et de propagation des ondes (0.1 à 2.0, défaut 0.3). */
  speed?: number
  /** Sensibilité à la parallaxe souris et profondeur perspective (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance et contraste général des contours (0.2 à 2.5, défaut 1.0). */
  intensity?: number
  /** Variabilité et asynchronisme de pulsation des cellules (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Épaisseur relative des arêtes néon (0.02 à 0.15, défaut 0.06). */
  borderWidth?: number
  /** Intensité du halo interne au centre des cellules (0.0 à 1.0, défaut 0.45). */
  innerGlow?: number
  /** Vitesse et rayon d'étalement des ondes réactives (0.4 à 2.5, défaut 1.2). */
  waveSpread?: number
}

export class HexGridInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'hex_grid'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: HexGridProps
  private borderColorVec: THREE.Color
  private fillColorVec: THREE.Color
  private pulseColorVec: THREE.Color

  constructor(id: string, props: HexGridProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.borderColorVec = new THREE.Color(props.borderColor ?? '#00f0ff')
    this.fillColorVec = new THREE.Color(props.fillColor ?? '#001224')
    this.pulseColorVec = new THREE.Color(props.pulseColor ?? '#ff007f')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.35
    const borderWidth = props.borderWidth ?? 0.06
    const innerGlow = props.innerGlow ?? 0.45
    const waveSpread = props.waveSpread ?? 1.2

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uBorderColor: { value: this.borderColorVec },
        uFillColor: { value: this.fillColorVec },
        uPulseColor: { value: this.pulseColorVec },
        uUseCustomColors: {
          value: Boolean(props.borderColor || props.fillColor || props.pulseColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uBorderWidth: { value: borderWidth },
        uInnerGlow: { value: innerGlow },
        uWaveSpread: { value: waveSpread },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
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
        uniform vec3 uBorderColor;
        uniform vec3 uFillColor;
        uniform vec3 uPulseColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uBorderWidth;
        uniform float uInnerGlow;
        uniform float uWaveSpread;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}
        ${GLSL_NOISE_2D}

        // Calcule les coordonnées d'alvéoles hexagonales 2D exactes
        // Retourne vec4(localUv.xy, cellId.xy)
        vec4 hexGridCoords(vec2 p) {
          const vec2 r = vec2(1.0, 1.7320508075688772); // 1.0, sqrt(3)
          vec2 h = r * 0.5;
          vec2 a = mod(p, r) - h;
          vec2 b = mod(p - h, r) - h;
          vec2 gv = dot(a, a) < dot(b, b) ? a : b;
          vec2 id = p - gv;
          return vec4(gv, id);
        }

        // Distance d'un point à la bordure hexagonale (rayon normalisé = 0.5)
        float hexDistToEdge(vec2 p) {
          p = abs(p);
          float d = dot(p, normalize(vec2(1.0, 1.7320508075688772)));
          d = max(d, p.x);
          return 0.5 - d;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          // Espace centré avec parallaxe souris douce
          vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * (7.0 * uDensity);
          p += uMouse * (uDepth * 0.4);

          // Coordonnées de l'alvéole hexagonale
          vec4 hex = hexGridCoords(p);
          vec2 localP = hex.xy;
          vec2 cellId = hex.zw;

          // Distance à la frontière de l'hexagone
          float distToEdge = hexDistToEdge(localP);

          // Hachage unique par cellule
          float cellSeed = hash12(cellId + 31.415);
          float cellSeed2 = hash12(cellId + 87.654);

          // Pulsation organique par cellule (HIGH & MEDIUM : bruit Simplex ou déphasage)
          float cellPulse = 0.0;
          if (uQualityLevel >= 1) {
            float t = uTime * uSpeed * 2.0;
            if (uQualityLevel >= 2) {
              // Bruit Simplex pour allumer des cellules en grappes organiques
              float cluster = snoise(cellId * 0.15 + vec2(t * 0.3, t * 0.2));
              cellPulse = smoothstep(0.1, 0.7, cluster * (0.8 + 0.4 * uRandomness));
              // Clignotement individuel rapide intermittent
              cellPulse += pow(sin(t * 1.5 + cellSeed * 6.28), 12.0) * 0.4 * uRandomness;
            } else {
              cellPulse = pow(sin(t + cellSeed * 6.28), 8.0);
            }
          } else {
            // LOW : pulsation douce globale
            cellPulse = sin(uTime * uSpeed + cellSeed * 3.14) * 0.3 + 0.3;
          }
          cellPulse = clamp(cellPulse, 0.0, 1.0);

          // Interaction souris : onde de choc et mise en valeur sous le curseur
          vec2 mouseWorld = vec2(uMouse.x * aspect * 0.5, uMouse.y * 0.5) * (7.0 * uDensity);
          float mouseDist = length(cellId - mouseWorld);
          float mouseRipple = 0.0;
          if (mouseDist < 4.5 * uWaveSpread) {
            float waveT = uTime * uSpeed * 3.5;
            float wavePhase = mouseDist * 1.8 - waveT;
            mouseRipple = sin(wavePhase) * exp(-mouseDist * 0.45);
            mouseRipple = max(0.0, mouseRipple);
          }
          float mouseProximity = smoothstep(2.5, 0.0, mouseDist);

          // Tracé de la bordure néon avec antialiasing analytique
          float lineThick = uBorderWidth * 0.5;
          float edgeCore = 1.0 - smoothstep(0.0, lineThick, abs(distToEdge));
          float edgeGlow = exp(-abs(distToEdge) * (18.0 / max(0.2, uIntensity)));

          // Bordure double arête (HIGH)
          float doubleEdge = 0.0;
          if (uQualityLevel >= 2) {
            float innerOffset = abs(distToEdge - lineThick * 2.2);
            doubleEdge = exp(-innerOffset * 30.0) * 0.5;
          }

          float totalBorder = max(edgeCore, edgeGlow * 0.75) + doubleEdge;

          // Cœur interne de l'alvéole (nano-noyau au centre de l'hexagone)
          float localDistFromCenter = length(localP);
          float coreDot = 0.0;
          if (uQualityLevel >= 2) {
            coreDot = smoothstep(0.12, 0.0, localDistFromCenter) * (0.5 + 0.5 * cellPulse);
            // Anneau concentrique intérieur
            float ring = exp(-abs(localDistFromCenter - 0.28) * 35.0) * 0.4 * (cellPulse + mouseProximity);
            coreDot += ring;
          }

          // Remplissage intérieur de la cellule
          float fillGlow = smoothstep(0.5, 0.0, localDistFromCenter) * uInnerGlow;
          fillGlow *= (0.2 + 0.8 * cellPulse + 0.8 * mouseProximity + mouseRipple * 0.6);

          // Palette
          vec3 borderCol = uUseCustomColors ? uBorderColor : uPaletteAccent;
          vec3 fillCol = uUseCustomColors ? uFillColor : uPaletteSecondary;
          vec3 pulseCol = uUseCustomColors ? uPulseColor : uPalettePrimary;

          // Composition colorimétrique
          vec3 finalColor = borderCol * (totalBorder * uIntensity);
          finalColor += fillCol * fillGlow;
          finalColor += pulseCol * ((cellPulse * 0.8 + mouseProximity * 1.2 + mouseRipple * 0.9) * (totalBorder * 0.8 + fillGlow * 0.5));
          finalColor += pulseCol * (coreDot * uIntensity * 1.5);

          // Vignetage doux aux abords de l'écran pour intégration subtile
          float vignette = 1.0 - smoothstep(0.4, 0.95, length(uv - 0.5));
          finalColor *= vignette;

          float alpha = clamp((totalBorder * 0.9 + fillGlow * 0.6 + coreDot * 0.8) * vignette, 0.0, 1.0);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -58
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<HexGridProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.borderColor !== undefined) {
      this.borderColorVec.set(newProps.borderColor)
      this.material.uniforms.uBorderColor.value = this.borderColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.fillColor !== undefined) {
      this.fillColorVec.set(newProps.fillColor)
      this.material.uniforms.uFillColor.value = this.fillColorVec
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
    if (newProps.borderWidth !== undefined) this.material.uniforms.uBorderWidth.value = newProps.borderWidth
    if (newProps.innerGlow !== undefined) this.material.uniforms.uInnerGlow.value = newProps.innerGlow
    if (newProps.waveSpread !== undefined) this.material.uniforms.uWaveSpread.value = newProps.waveSpread
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

export const HexGridDefinition: IBrickDefinition<HexGridProps> = {
  type: 'hex_grid',
  category: 'special',
  create: (id, props, context) => new HexGridInstance(id, props, context),
}

BrickRegistry.register(HexGridDefinition)
