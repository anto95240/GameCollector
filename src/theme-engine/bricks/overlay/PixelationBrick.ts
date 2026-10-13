/**
 * src/theme-engine/bricks/overlay/PixelationBrick.ts
 *
 * Brique de style et d'overlay : Pixellisation Rétro & Mosaïque Numérique (Couche 5 : Overlay).
 * Rendu mosaïque rétro quantifié (pixel art, résolutions 8-bit / 16-bit / Game Boy / arcade),
 * avec quantification spatiale stricte de la grille, matrice de tramage de Bayer 4x4 ordonnée,
 * joints d'ombrage entre blocs de pixels, zone de focus nette interactive réactive à la souris
 * pour préserver la lisibilité de l'interface, et adaptation stricte aux 3 paliers de qualité.
 */

import * as THREE from 'three'

import { GLSL_HASH } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Pixelisation.
 */
export interface PixelationProps {
  /** Teinte de la trame de mosaïque et des joints de pixels (défaut noir '#000000'). */
  tintColor?: string
  /** Échelle et finesse de la grille de blocs (0.3 à 3.0, défaut 1.0). */
  density?: number
  /** Vitesse de pulsation ou balayage temporel rétro (0.0 à 2.0, défaut 0.25). */
  speed?: number
  /** Rayon de la zone nette de focus interactif sous le curseur souris (0.0 à 1.0, défaut 0.4). */
  depth?: number
  /** Intensité et contraste de la mosaïque et du tramage (0.1 à 1.0, défaut 0.65). */
  intensity?: number
  /** Gigue stochastique et instabilité de blocs rétro (0.0 à 1.0, défaut 0.2). */
  randomness?: number
  /** Taille unitaire nominale d'un bloc de pixel en px (2.0 à 32.0, défaut 8.0). */
  pixelSize?: number
  /** Force du tramage ordonné de Bayer rétro (0.0 à 1.0, défaut 0.35). */
  ditherStrength?: number
}

export class PixelationInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'pixelation'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: PixelationProps
  private tintColorVec: THREE.Color

  constructor(id: string, props: PixelationProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.tintColorVec = new THREE.Color(props.tintColor ?? '#000000')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 0.65
    const randomness = props.randomness ?? 0.2
    const pixelSize = props.pixelSize ?? 8.0
    const ditherStrength = props.ditherStrength ?? 0.35

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uScroll: context.sharedUniforms.uScroll,
        uTintColor: { value: this.tintColorVec },
        uUseCustomColor: { value: Boolean(props.tintColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uPixelSize: { value: pixelSize },
        uDitherStrength: { value: ditherStrength },
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
        uniform vec3 uTintColor;
        uniform bool uUseCustomColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uPixelSize;
        uniform float uDitherStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        // Matrice de Bayer 4x4 ordonnée pour dithering 16-bit
        float getBayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int index = x + y * 4;

          if (index == 0) return 0.0 / 16.0;
          if (index == 1) return 8.0 / 16.0;
          if (index == 2) return 2.0 / 16.0;
          if (index == 3) return 10.0 / 16.0;
          if (index == 4) return 12.0 / 16.0;
          if (index == 5) return 4.0 / 16.0;
          if (index == 6) return 14.0 / 16.0;
          if (index == 7) return 6.0 / 16.0;
          if (index == 8) return 3.0 / 16.0;
          if (index == 9) return 11.0 / 16.0;
          if (index == 10) return 1.0 / 16.0;
          if (index == 11) return 9.0 / 16.0;
          if (index == 12) return 15.0 / 16.0;
          if (index == 13) return 7.0 / 16.0;
          if (index == 14) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main() {
          vec2 coord = gl_FragCoord.xy;

          // Zone de focus interactive sous le curseur souris (loupe de netteté)
          vec2 mouseScreenPos = (uMouse * 0.5 + 0.5) * uResolution;
          float distToMouse = length(coord - mouseScreenPos);
          float focusRadius = 180.0 * max(0.1, uDepth);
          float focusFactor = smoothstep(focusRadius * 0.3, focusRadius, distToMouse);

          // Calibre dynamique du bloc pixel
          float effectivePixelSize = max(2.0, uPixelSize / max(0.2, uDensity));

          // Coordonnées internes du bloc
          vec2 inBlock = fract(coord / effectivePixelSize);

          float mosaicAlpha = 0.0;
          vec3 blockColor = uTintColor;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : Bayer 4x4 + Joints de pixels biseautés + Loupe de focus + Jitter ===
            float bayer = getBayer4x4(floor(coord / effectivePixelSize));

            // Micro-gigue de pulsation temporelle
            float pulse = sin(uTime * uSpeed * 2.0) * 0.05 * (uSpeed > 0.0 ? 1.0 : 0.0);
            float ditherMask = (bayer - 0.5) * (uDitherStrength + pulse);

            // Biseautage des arêtes du pixel pour sensation de grille physique LCD / GameBoy
            float borderDistX = min(inBlock.x, 1.0 - inBlock.x);
            float borderDistY = min(inBlock.y, 1.0 - inBlock.y);
            float joint = smoothstep(0.0, 0.08, min(borderDistX, borderDistY));
            float jointShadow = (1.0 - joint) * 0.5;

            // Micro-séparation de sous-pixel LCD
            float subPx = inBlock.x * 3.0;
            vec3 lcdPhosphor = subPx < 1.0 ? vec3(1.06, 0.96, 0.96) :
                              (subPx < 2.0 ? vec3(0.96, 1.06, 0.96) : vec3(0.96, 0.96, 1.06));
            blockColor = blockColor * lcdPhosphor;

            // Combinaison de la mosaïque
            mosaicAlpha = clamp(abs(ditherMask) * 1.5 + jointShadow, 0.0, 0.95);
            mosaicAlpha *= focusFactor; // Annulé au cœur du curseur pour préserver la lisibilité

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : Bayer 2x2 + Joints sans gigue ===
            vec2 b2 = mod(floor(coord / effectivePixelSize), 2.0);
            float bayer2 = (b2.x + b2.y * 2.0) / 4.0;
            float ditherMask = (bayer2 - 0.5) * uDitherStrength;

            float borderDist = min(min(inBlock.x, 1.0 - inBlock.x), min(inBlock.y, 1.0 - inBlock.y));
            float jointShadow = (1.0 - step(0.06, borderDist)) * 0.35;

            mosaicAlpha = clamp(abs(ditherMask) + jointShadow, 0.0, 0.85) * focusFactor;

          } else {
            // === PALIER LOW : Grille de blocs géométrique directe ===
            float borderDist = min(min(inBlock.x, 1.0 - inBlock.x), min(inBlock.y, 1.0 - inBlock.y));
            float joint = 1.0 - step(0.08, borderDist);
            mosaicAlpha = joint * 0.45 * focusFactor;
          }

          float finalAlpha = clamp(mosaicAlpha * uIntensity, 0.0, 0.95);
          if (finalAlpha <= 0.005) discard;

          gl_FragColor = vec4(blockColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 96 // Couche 5 (Overlay)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<PixelationProps>): void {
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
    if (newProps.pixelSize !== undefined)
      this.material.uniforms.uPixelSize.value = newProps.pixelSize
    if (newProps.ditherStrength !== undefined)
      this.material.uniforms.uDitherStrength.value = newProps.ditherStrength
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

export const PixelationDefinition: IBrickDefinition<PixelationProps> = {
  type: 'pixelation',
  category: 'overlay',
  create: (id, props, context) => new PixelationInstance(id, props, context),
}

export const PixelationAliasDefinition: IBrickDefinition<PixelationProps> = {
  type: 'pixelisation',
  category: 'overlay',
  create: (id, props, context) => new PixelationInstance(id, props, context),
}

// Enregistrement dans le registre central
BrickRegistry.register(PixelationDefinition)
BrickRegistry.register(PixelationAliasDefinition)
