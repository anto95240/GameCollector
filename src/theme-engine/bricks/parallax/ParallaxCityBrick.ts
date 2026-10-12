/**
 * src/theme-engine/bricks/parallax/ParallaxCityBrick.ts
 *
 * Brique de silhouettes de Skyline de Ville en Parallaxe (Couche 2 : Intermediate).
 * Mégalopole moderne ou métropole cyberpunk étagée sur 3 plans de profondeur :
 * - Arrière-plan lointain : silhouettes de mégastructures et dômes dans la brume urbaine
 * - Plan intermédiaire : quartier d'affaires avec tours aux hauteurs variées et façades illuminées
 * - Premier plan : gratte-ciels monumentaux avec antennes, baies vitrées et balises de signalisation
 *
 * Balises aéronautiques clignotantes pulsantes, fenêtres au scintillement asynchrone,
 * faisceaux de projecteurs balayant le ciel, et halo de smog nocturne.
 * Adaptation aux paliers HIGH, MEDIUM et LOW.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Skyline de Ville.
 */
export interface ParallaxCityProps {
  /** Teinte sombre de la silhouette des bâtiments (défaut #070d19 ou uPaletteSecondary * 0.3). */
  buildingColor?: string
  /** Teinte des fenêtres et baies vitrées illuminées (défaut #fef08a ou uPalettePrimary). */
  windowColor?: string
  /** Teinte des balises d'antennes et néons (défaut #ef4444 ou uPaletteAccent). */
  beaconColor?: string
  /** Densité et nombre de gratte-ciels par unité (défaut 1.0). */
  density?: number
  /** Vitesse de balayage des projecteurs et clignotement des balises (défaut 0.3). */
  speed?: number
  /** Échelonnement en profondeur et parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Radiance des fenêtres et éclat des lumières (défaut 1.0). */
  intensity?: number
  /** Variabilité des hauteurs d'immeubles, styles de toits et antennes (défaut 0.5). */
  randomness?: number
  /** Intensité du halo de smog lumineux à la base de la cité (défaut 0.6). */
  smogIntensity?: number
}

export class ParallaxCityInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_city'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxCityProps
  private buildingColorVec: THREE.Color
  private windowColorVec: THREE.Color
  private beaconColorVec: THREE.Color

  constructor(id: string, props: ParallaxCityProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.buildingColorVec = new THREE.Color(props.buildingColor ?? '#070d19')
    this.windowColorVec = new THREE.Color(props.windowColor ?? '#fef08a')
    this.beaconColorVec = new THREE.Color(props.beaconColor ?? '#ef4444')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5
    const smogIntensity = props.smogIntensity ?? 0.6

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
        uBuildingColor: { value: this.buildingColorVec },
        uWindowColor: { value: this.windowColorVec },
        uBeaconColor: { value: this.beaconColorVec },
        uUseCustomColors: {
          value: Boolean(props.buildingColor || props.windowColor || props.beaconColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uSmogIntensity: { value: smogIntensity },
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
        uniform vec3 uBuildingColor;
        uniform vec3 uWindowColor;
        uniform vec3 uBeaconColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uSmogIntensity;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule le profil d'une rangée urbaine avec découpage en gratte-ciels
        vec4 evaluateCityLayer(
          vec2 uv,
          float baseAltitude,
          float maxAltitude,
          float bWidth,
          float layerIndex,
          float parallaxRatio,
          vec3 bCol,
          vec3 winCol,
          vec3 beaconCol,
          float time,
          vec2 mouse
        ) {
          // Décalage de parallaxe
          float shiftX = mouse.x * uDepth * parallaxRatio * 1.5;
          float shiftY = mouse.y * uDepth * parallaxRatio * 0.35 + uScroll * parallaxRatio * 0.18;
          vec2 p = vec2(uv.x + shiftX, uv.y + shiftY);

          float colW = bWidth / uDensity;
          float colIdx = floor(p.x / colW);
          float colX = (p.x - colIdx * colW) / colW; // 0 à 1 dans l'immeuble

          // Caractéristiques du gratte-ciel via hash
          float hSeed = hash12(vec2(colIdx, layerIndex * 31.7));
          float exists = step(0.1, hSeed); // 90% présence
          float bHeight = baseAltitude + (0.12 + hSeed * maxAltitude * uRandomness);

          // Type de sommet : toit plat (0), toit biseauté (1), antenne (2)
          float roofStyle = floor(hash12(vec2(colIdx * 1.7, layerIndex)) * 3.0);
          float roofMod = 0.0;
          if (roofStyle == 1.0) {
            roofMod = (1.0 - colX) * 0.03; // biseau
          }

          float finalHeight = bHeight - roofMod;

          // Détection d'antenne fine centrale
          float antenna = 0.0;
          float antennaH = bHeight + 0.08 * hSeed;
          if (abs(colX - 0.5) < 0.03 && p.y > finalHeight && p.y < antennaH) {
            antenna = 1.0;
          }

          // Est-on dans la silhouette du bâtiment ?
          bool inBuilding = (p.y <= finalHeight) && (exists > 0.5);

          if (!inBuilding && antenna < 0.5) {
            return vec4(0.0);
          }

          vec3 pixelColor = bCol;

          // Si antenne : couleur sombre + balise rouge clignotante au sommet
          if (antenna > 0.5) {
            float distTop = abs(p.y - antennaH);
            if (distTop < 0.015) {
              // Balise clignotante asynchrone
              float flash = sin(time * uSpeed * 4.0 + colIdx * 2.5);
              float beaconGlow = smoothstep(0.0, 0.015, distTop) * step(0.2, flash);
              pixelColor = mix(bCol, beaconCol * 1.5, beaconGlow);
            }
            return vec4(pixelColor, 1.0);
          }

          // Rendu des fenêtres (Medium & High)
          if (uQualityLevel >= 1 && inBuilding) {
            float winGridX = fract(colX * 8.0);
            float winGridY = fract((p.y - baseAltitude) * 45.0);

            // Espacement des fenêtres (cadres sombres entre fenêtres)
            bool isWindowPixel = (winGridX > 0.25 && winGridX < 0.75) && (winGridY > 0.3 && winGridY < 0.85);

            if (isWindowPixel && p.y < (finalHeight - 0.015)) {
              // État d'allumage par fenêtre
              vec2 winCell = floor(vec2(p.x * 8.0 / colW, (p.y - baseAltitude) * 45.0));
              float winRand = hash12(winCell + layerIndex * 13.0);

              // 65% des fenêtres allumées, micro-extinctions rares basées sur le temps
              float flicker = sin(time * 0.5 + winRand * 100.0);
              if (winRand > 0.35 && flicker > -0.85) {
                // Nuance de teinte de fenêtre (chaud / froid)
                vec3 wColor = mix(winCol, vec3(1.0, 0.95, 0.8), winRand * 0.4);
                pixelColor = mix(pixelColor, wColor, 0.85 * uIntensity);
              }
            }
          }

          // Dégradé d'ambiance verticale
          float gradY = clamp((p.y - baseAltitude) / maxAltitude, 0.0, 1.0);
          pixelColor = mix(pixelColor * 0.9, pixelColor * 1.1, gradY);

          return vec4(pixelColor, 1.0);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseBuilding = uUseCustomColors ? uBuildingColor : (uPaletteSecondary * 0.25);
          vec3 baseWindow = uUseCustomColors ? uWindowColor : uPalettePrimary;
          vec3 baseBeacon = uUseCustomColors ? uBeaconColor : uPaletteAccent;
          vec3 smogColor = uPalettePrimary * 0.35;

          vec4 result = vec4(0.0);

          // Projecteurs célestes balayant le ciel nocturne (High Quality)
          if (uQualityLevel >= 2) {
            for (int i = 0; i < 2; i++) {
              float beamX = 0.25 + float(i) * 0.5;
              float beamAngle = sin(t * uSpeed * 0.8 + float(i) * 3.14) * 0.35;
              vec2 beamOrigin = vec2(beamX, 0.15);
              vec2 dir = uv - beamOrigin;
              float rotX = dir.x * cos(beamAngle) - dir.y * sin(beamAngle);
              float beamWidth = 0.03 + dir.y * 0.08;
              float beamCone = smoothstep(beamWidth, 0.0, abs(rotX)) * smoothstep(0.0, 0.2, dir.y);
              beamCone *= smoothstep(0.9, 0.2, uv.y); // s'estompe en haut
              result.rgb += uPalettePrimary * beamCone * 0.25 * uIntensity;
            }
          }

          // Rangée 3 : Mégalopole Lointaine (Très brumeuse, tours gigantesques)
          if (uQualityLevel >= 1) {
            vec3 farBuilding = mix(baseBuilding, smogColor, 0.55);
            vec4 c3 = evaluateCityLayer(uv, 0.28, 0.28, 0.065, 3.0, 0.12, farBuilding, baseWindow * 0.6, baseBeacon * 0.5, t, uMouse);
            if (c3.a > 0.0) {
              result = c3;
            }
          }

          // Rangée 2 : Quartier d'Affaires Médian (Grille dense de tours moyennes)
          vec3 midBuilding = mix(baseBuilding, smogColor, 0.25);
          vec4 c2 = evaluateCityLayer(uv, 0.14, 0.35, 0.052, 2.0, 0.28, midBuilding, baseWindow * 0.85, baseBeacon * 0.8, t, uMouse);
          if (c2.a > 0.0) {
            result = mix(result, c2, c2.a);
          }

          // Rangée 1 : Gratte-ciels d'Avant-Plan (Sombre, imposants, baies vitrées nettes)
          vec4 c1 = evaluateCityLayer(uv, -0.05, 0.45, 0.042, 1.0, 0.52, baseBuilding, baseWindow, baseBeacon, t, uMouse);
          if (c1.a > 0.0) {
            result = mix(result, c1, c1.a);
          }

          // Halo de smog lumineux urbain à la base (Smog atmosphérique nocturne)
          float smogBase = smoothstep(0.35, 0.0, uv.y) * uSmogIntensity * 0.45;
          result.rgb += smogColor * smogBase * uIntensity;
          result.a = max(result.a, smogBase * 0.8);

          if (result.a <= 0.005) {
            discard;
          }

          gl_FragColor = vec4(result.rgb, clamp(result.a, 0.0, 1.0));
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

  public updateProps(newProps: Partial<ParallaxCityProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.buildingColor !== undefined) {
      this.buildingColorVec.set(newProps.buildingColor)
      this.material.uniforms.uBuildingColor.value = this.buildingColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.windowColor !== undefined) {
      this.windowColorVec.set(newProps.windowColor)
      this.material.uniforms.uWindowColor.value = this.windowColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.beaconColor !== undefined) {
      this.beaconColorVec.set(newProps.beaconColor)
      this.material.uniforms.uBeaconColor.value = this.beaconColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.smogIntensity !== undefined) this.material.uniforms.uSmogIntensity.value = newProps.smogIntensity
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

export const ParallaxCityDefinition: IBrickDefinition<ParallaxCityProps> = {
  type: 'parallax_city',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxCityInstance(id, props, context),
}

BrickRegistry.register(ParallaxCityDefinition)
