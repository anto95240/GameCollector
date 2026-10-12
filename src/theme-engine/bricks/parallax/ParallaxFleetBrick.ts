/**
 * src/theme-engine/bricks/parallax/ParallaxFleetBrick.ts
 *
 * Brique de silhouettes de Vaisseaux Lointains en Parallaxe (Couche 2 : Intermediate).
 * Flotte spatiale interstellaire naviguant majestueusement en formation :
 * - Vaisseau amiral colossal lointain à dérive imperceptible et échelle monumentale
 * - Croiseurs d'escorte et frégates intermédiaires en formation tactique
 * - Chasseurs et éclaireurs d'avant-plan à vitesse et parallaxe prononcées
 *
 * Réacteurs ioniques à plasma étincelant avec traînées de propulsion (engine plumes),
 * feux de position pulsants et étagement de vitesse en perspective profonde.
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Vaisseaux Lointains.
 */
export interface ParallaxFleetProps {
  /** Teinte de la coque des vaisseaux (défaut #0a1120 ou uPaletteSecondary * 0.35). */
  hullColor?: string
  /** Teinte de la flamme de propulsion plasmique / ionique (défaut #38bdf8 ou uPaletteAccent). */
  engineColor?: string
  /** Densité et nombre de vaisseaux dans la flottille (défaut 1.0). */
  density?: number
  /** Vitesse de croisière sub-luminique différentielle (défaut 0.2). */
  speed?: number
  /** Échelonnement en profondeur et sensibilité à la parallaxe spatiale (défaut 0.4). */
  depth?: number
  /** Radiance des tuyères de réacteurs et lumières de bord (défaut 1.2). */
  intensity?: number
  /** Dispersion des trajectoires, étalement et espacement de formation (défaut 0.4). */
  randomness?: number
  /** Longueur relative des traînées de propulsion plasmique (défaut 0.8). */
  trailLength?: number
}

export class ParallaxFleetInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_fleet'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxFleetProps
  private hullColorVec: THREE.Color
  private engineColorVec: THREE.Color

  constructor(id: string, props: ParallaxFleetProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.hullColorVec = new THREE.Color(props.hullColor ?? '#0a1120')
    this.engineColorVec = new THREE.Color(props.engineColor ?? '#38bdf8')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.2
    const randomness = props.randomness ?? 0.4
    const trailLength = props.trailLength ?? 0.8

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
        uHullColor: { value: this.hullColorVec },
        uEngineColor: { value: this.engineColorVec },
        uUseCustomColors: {
          value: Boolean(props.hullColor || props.engineColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uTrailLength: { value: trailLength },
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
        uniform vec3 uHullColor;
        uniform vec3 uEngineColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uTrailLength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule la silhouette et le réacteur d'un croiseur stellaire individuel
        // shipHeading: direction (1.0 = gauche vers droite, -1.0 = droite vers gauche)
        vec4 evaluateStarship(
          vec2 p,
          vec2 centerPos,
          float shipLength,
          float shipHeight,
          float shipHeading,
          vec3 hullCol,
          vec3 engCol,
          float time,
          float seed
        ) {
          vec2 local = (p - centerPos);
          local.x *= shipHeading; // Oriente la proue vers l'avant

          // Est-on dans la boîte englobante ?
          if (local.x < -shipLength * (0.5 + uTrailLength * 1.5) || local.x > shipLength * 0.5) return vec4(0.0);
          if (abs(local.y) > shipHeight * 1.5) return vec4(0.0);

          // 1. Coque du croiseur (profil cunéiforme / dague triangulaire effilée)
          float normX = (local.x + shipLength * 0.5) / shipLength; // 0 (poupe) à 1 (proue)
          float maxHalfHeight = shipHeight * (1.0 - normX * 0.7); // s'affine vers la pointe avant

          bool inHull = (local.x >= -shipLength * 0.5) && (local.x <= shipLength * 0.5) && (abs(local.y) <= maxHalfHeight);

          // Ailettes d'empennage ou passerelle supérieure à l'arrière
          if (!inHull && (local.x >= -shipLength * 0.5) && (local.x <= -shipLength * 0.2)) {
            if (abs(local.y) <= maxHalfHeight * 1.4) inHull = true;
          }

          if (inHull) {
            vec3 shipSurface = hullCol;
            // Reflet métallique subtil sur la crête dorsale
            if (abs(local.y) < shipHeight * 0.15) {
              shipSurface = mix(shipSurface, vec3(0.85, 0.9, 1.0), 0.25);
            }
            // Feu de signalisation à la proue (clignotement asynchrone)
            if (local.x > shipLength * 0.42 && abs(local.y) < shipHeight * 0.2) {
              float beaconPulse = sin(time * 3.0 + seed * 12.0);
              if (beaconPulse > 0.6) {
                shipSurface = mix(shipSurface, engCol * 1.8, 0.9);
              }
            }
            return vec4(shipSurface, 1.0);
          }

          // 2. Tuyère et traînée de propulsion ionique (à l'arrière : local.x < -shipLength * 0.5)
          if (local.x < -shipLength * 0.5) {
            float trailDist = abs(local.x + shipLength * 0.5);
            float maxTrailLen = shipLength * uTrailLength * 1.4;

            if (trailDist < maxTrailLen) {
              float trailDecay = 1.0 - (trailDist / maxTrailLen);
              float trailWidth = shipHeight * 0.4 * (1.0 + trailDist * 1.2);

              if (abs(local.y) < trailWidth) {
                float centerGlow = 1.0 - abs(local.y) / trailWidth;
                // Pulsation du jet de plasma
                float plumeNoise = snoise(vec2(trailDist * 40.0 - time * 15.0, seed * 5.0)) * 0.25 + 0.75;
                float alpha = pow(trailDecay, 1.8) * pow(centerGlow, 1.4) * plumeNoise;
                vec3 plumeCol = mix(engCol, vec3(1.0, 1.0, 1.0), pow(centerGlow, 3.0) * trailDecay);
                return vec4(plumeCol * 1.5, alpha * 0.9);
              }
            }
          }

          return vec4(0.0);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseHull = uUseCustomColors ? uHullColor : (uPaletteSecondary * 0.35);
          vec3 baseEngine = uUseCustomColors ? uEngineColor : uPaletteAccent;

          vec4 result = vec4(0.0);

          // Strate 3 : Vaisseau Amiral Titanesque (Lointain, déplacement très lent, brume spatiale)
          {
            float shiftX = uMouse.x * uDepth * 0.12 * 1.5;
            float shiftY = uMouse.y * uDepth * 0.08 * 0.5 + uScroll * 0.06;
            vec2 p = uv + vec2(shiftX, shiftY);

            // Position orbitale en translation très lente
            float dreadnoughtSpeed = uSpeed * 0.035;
            float xPos = fract(t * dreadnoughtSpeed + 0.15) * 1.6 - 0.3;
            vec2 dreadPos = vec2(xPos, 0.72);

            vec3 dreadHull = mix(baseHull, uPalettePrimary * 0.25, 0.4);
            vec4 dread = evaluateStarship(p, dreadPos, 0.28, 0.038, 1.0, dreadHull, baseEngine * 0.7, t, 1.0);
            if (dread.a > 0.0) {
              result = dread;
            }
          }

          // Strate 2 : Croiseurs d'Escorte en Formation (Moyenne distance)
          if (uQualityLevel >= 1) {
            float shiftX = uMouse.x * uDepth * 0.28 * 1.5;
            float shiftY = uMouse.y * uDepth * 0.16 * 0.5 + uScroll * 0.12;
            vec2 p = uv + vec2(shiftX, shiftY);

            float cruiserSpeed = uSpeed * 0.08;
            for (int i = 0; i < 3; i++) {
              float offset = float(i) * 0.35;
              float xPos = fract(t * cruiserSpeed + offset) * 1.8 - 0.4;
              float yPos = 0.48 + sin(float(i) * 2.1) * 0.12;
              vec2 cPos = vec2(xPos, yPos);

              vec4 cruiser = evaluateStarship(p, cPos, 0.12, 0.018, 1.0, baseHull, baseEngine, t, float(i) + 10.0);
              if (cruiser.a > 0.0) {
                result = mix(result, cruiser, cruiser.a);
              }
            }
          }

          // Strate 1 : Frégates & Chasseurs d'Avant-Plan (Plus proches, rapides, parallaxe vive)
          if (uQualityLevel >= 2) {
            float shiftX = uMouse.x * uDepth * 0.55 * 1.5;
            float shiftY = uMouse.y * uDepth * 0.30 * 0.5 + uScroll * 0.22;
            vec2 p = uv + vec2(shiftX, shiftY);

            float frigateSpeed = uSpeed * 0.15;
            for (int j = 0; j < 2; j++) {
              float offset = float(j) * 0.55 + 0.2;
              // Naviguent en sens opposé pour dynamiser la scène spatiale
              float xPos = 1.3 - fract(t * frigateSpeed + offset) * 1.8;
              float yPos = 0.25 + float(j) * 0.15;
              vec2 fPos = vec2(xPos, yPos);

              vec4 frigate = evaluateStarship(p, fPos, 0.075, 0.012, -1.0, baseHull * 1.2, baseEngine * 1.2, t, float(j) + 30.0);
              if (frigate.a > 0.0) {
                result = mix(result, frigate, frigate.a);
              }
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

  public updateProps(newProps: Partial<ParallaxFleetProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.hullColor !== undefined) {
      this.hullColorVec.set(newProps.hullColor)
      this.material.uniforms.uHullColor.value = this.hullColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.engineColor !== undefined) {
      this.engineColorVec.set(newProps.engineColor)
      this.material.uniforms.uEngineColor.value = this.engineColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.trailLength !== undefined) this.material.uniforms.uTrailLength.value = newProps.trailLength
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

export const ParallaxFleetDefinition: IBrickDefinition<ParallaxFleetProps> = {
  type: 'parallax_fleet',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxFleetInstance(id, props, context),
}

BrickRegistry.register(ParallaxFleetDefinition)
