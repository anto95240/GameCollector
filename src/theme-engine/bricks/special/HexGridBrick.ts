/**
 * src/theme-engine/bricks/special/HexGridBrick.ts
 *
 * Brique Spéciale : Grille Hexagonale Nanotech & Bouclier d'Énergie (Couche : Spéciaux).
 * Raccordement géométrique alvéolaire en coordonnées axiales avec légère projection perspective 3D
 * et profondeur étagée, ondes d'énergie autonomes traversant la structure, allumage décalé
 * (capacitif) des cellules, bordures émissives multi-niveaux avec bloom et onde réactive souris.
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
  /** Inclinaison perspective 3D de la grille (0.0 à 0.7, défaut 0.28). */
  perspectiveTilt?: number
  /** Intensité des ondes d'énergie autonomes traversant la grille (0.0 à 2.0, défaut 0.85). */
  energyWaveIntensity?: number
  /** Ampleur du bloom émissif autour des arêtes (0.0 à 2.0, défaut 1.0). */
  bloomStrength?: number
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
    const perspectiveTilt = props.perspectiveTilt ?? 0.28
    const energyWaveIntensity = props.energyWaveIntensity ?? 0.85
    const bloomStrength = props.bloomStrength ?? 1.0

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
        uPerspectiveTilt: { value: perspectiveTilt },
        uEnergyWaveIntensity: { value: energyWaveIntensity },
        uBloomStrength: { value: bloomStrength },
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
        uniform float uScroll;
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
        uniform float uPerspectiveTilt;
        uniform float uEnergyWaveIntensity;
        uniform float uBloomStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}
        ${GLSL_NOISE_2D}

        vec4 hexGridCoords(vec2 p) {
          const vec2 r = vec2(1.0, 1.7320508075688772);
          vec2 h = r * 0.5;
          vec2 a = mod(p, r) - h;
          vec2 b = mod(p - h, r) - h;
          vec2 gv = dot(a, a) < dot(b, b) ? a : b;
          vec2 id = p - gv;
          return vec4(gv, id);
        }

        float hexDistToEdge(vec2 p) {
          p = abs(p);
          float d = dot(p, normalize(vec2(1.0, 1.7320508075688772)));
          d = max(d, p.x);
          return 0.5 - d;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 centerUv = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

          // Légère perspective 3D avec parallaxe souris et scroll
          float tilt = clamp(uPerspectiveTilt * (0.35 + 0.65 * uDepth), 0.0, 0.65);
          float zPersp = max(0.45, 1.0 + (centerUv.y + uMouse.y * 0.14 * uDepth) * tilt * 1.15);
          float depthFade = clamp(1.18 - zPersp * 0.28, 0.38, 1.15);

          vec2 p = (centerUv / zPersp + uMouse * (uDepth * 0.26 / zPersp) + vec2(0.0, uScroll * 0.0004 * uDepth)) * (7.0 * uDensity);

          vec4 hex = hexGridCoords(p);
          vec2 localP = hex.xy;
          vec2 cellId = hex.zw;
          float distToEdge = hexDistToEdge(localP);

          float cellSeed = hash12(cellId + 31.415);
          float cellSeed2 = hash12(cellId + 87.654);

          float t = uTime * max(0.05, uSpeed) * 2.0;

          // 1. Onde d'énergie autonome traversant la grille + allumage décalé des cellules
          vec2 waveDir = normalize(vec2(0.82, 0.57));
          float waveCoord = dot(cellId, waveDir) * 0.36;
          float waveWarp = (uQualityLevel >= 1)
            ? snoise(cellId * 0.09 + vec2(t * 0.04, -t * 0.03)) * 1.35
            : sin(cellId.y * 0.25) * 0.5;

          float waveCycle = mod(t * 0.95 * max(0.3, uWaveSpread * 0.8) - waveCoord - waveWarp, 13.0);
          float borderWave = exp(-pow((waveCycle - 0.45) * 1.75, 2.0)) * uEnergyWaveIntensity;

          // Allumage capacitif décalé par cellule après passage de l'onde
          float cellDelay = 0.14 + cellSeed * (0.55 + 0.65 * uRandomness) + cellSeed2 * 0.28;
          float localWaveT = waveCycle - cellDelay;
          float staggeredWave = (localWaveT > 0.0)
            ? smoothstep(0.0, 0.22, localWaveT) * exp(-max(0.0, localWaveT - 0.18) * 1.15)
            : 0.0;
          staggeredWave *= uEnergyWaveIntensity;

          // Seconde onde radiale/croisée rare en HIGH
          float secondaryWave = 0.0;
          if (uQualityLevel >= 2) {
            float wave2Cycle = mod(t * 0.58 + length(cellId) * 0.26 + 6.1, 18.0);
            float localT2 = wave2Cycle - cellSeed * 0.85;
            borderWave += exp(-pow((wave2Cycle - 0.5) * 1.9, 2.0)) * 0.75 * uEnergyWaveIntensity;
            if (localT2 > 0.0) {
              secondaryWave = smoothstep(0.0, 0.2, localT2) * exp(-max(0.0, localT2 - 0.15) * 1.3) * 0.85 * uEnergyWaveIntensity;
            }
          }

          // Pulsation organique ambiante par grappes
          float cellPulse = 0.0;
          if (uQualityLevel >= 1) {
            if (uQualityLevel >= 2) {
              float cluster = snoise(cellId * 0.15 + vec2(t * 0.24, t * 0.16));
              cellPulse = smoothstep(0.12, 0.72, cluster * (0.75 + 0.45 * uRandomness)) * 0.55;
              cellPulse += pow(max(0.0, sin(t * 1.15 + cellSeed * 6.2831)), 12.0) * 0.35 * uRandomness;
            } else {
              cellPulse = pow(max(0.0, sin(t * 0.9 + cellSeed * 6.2831)), 8.0) * 0.55;
            }
          } else {
            cellPulse = (sin(t * 0.5 + cellSeed * 3.14159) * 0.25 + 0.25);
          }

          float totalCellEnergy = clamp(cellPulse + staggeredWave + secondaryWave, 0.0, 1.5);

          // 2. Interaction souris : onde de choc + proximité
          vec2 mouseCenter = vec2(uMouse.x * aspect * 0.5, uMouse.y * 0.5);
          float mouseZ = max(0.45, 1.0 + (mouseCenter.y + uMouse.y * 0.14 * uDepth) * tilt * 1.15);
          vec2 mouseWorld = (mouseCenter / mouseZ + uMouse * (uDepth * 0.26 / mouseZ)) * (7.0 * uDensity);
          float mouseDist = length(cellId - mouseWorld);
          float mouseRipple = 0.0;
          if (mouseDist < 4.5 * uWaveSpread) {
            float waveT = t * 1.7;
            float wavePhase = mouseDist * 1.8 - waveT;
            mouseRipple = max(0.0, sin(wavePhase)) * exp(-mouseDist * 0.45);
          }
          float mouseProximity = smoothstep(2.4, 0.0, mouseDist);

          // 3. Bordures émissives anti-aliasées (fwidth) avec bloom multi-niveaux
          float lineThick = uBorderWidth * 0.5;
          float ad = abs(distToEdge);
          float fw = max(0.002, fwidth(distToEdge));
          float edgeCore = 1.0 - smoothstep(lineThick * 0.55, lineThick * 0.55 + fw, ad);

          float bloomAmt = max(0.0, uBloomStrength);
          float innerBloom = exp(-ad * (16.0 / max(0.35, bloomAmt))) * 0.75 * bloomAmt;
          float outerBloom = (uQualityLevel >= 1)
            ? exp(-ad * (5.0 / max(0.35, bloomAmt))) * 0.34 * bloomAmt
            : 0.0;

          float doubleEdge = 0.0;
          if (uQualityLevel >= 2) {
            float innerOffset = abs(distToEdge - lineThick * 2.1);
            doubleEdge = exp(-innerOffset * 32.0) * 0.45;
          }

          float borderEnergyBoost = 1.0 + borderWave * 0.95 + mouseProximity * 0.9 + mouseRipple * 0.7;
          float totalBorder = (max(edgeCore, innerBloom) + outerBloom + doubleEdge) * borderEnergyBoost;

          // 4. Relief biseauté directionnel & cœur nanotech (HIGH & MEDIUM)
          float localDistFromCenter = length(localP);
          float bevelShade = 1.0;
          if (uQualityLevel >= 1) {
            vec2 lightDir = normalize(vec2(-0.6, 0.8));
            float dirDot = dot(normalize(localP + 1e-4), lightDir);
            bevelShade = 1.0 + dirDot * smoothstep(0.15, 0.48, localDistFromCenter) * 0.25;
          }

          float coreDot = 0.0;
          if (uQualityLevel >= 2) {
            coreDot = smoothstep(0.11, 0.0, localDistFromCenter) * (0.25 + 0.75 * clamp(totalCellEnergy, 0.0, 1.0));
            float ring = exp(-abs(localDistFromCenter - 0.28) * 38.0) * 0.42 * (clamp(totalCellEnergy, 0.0, 1.0) + mouseProximity);
            coreDot += ring;
          }

          // Strate fantôme profonde en arrière-plan (HIGH uniquement) pour la profondeur
          float ghostBorder = 0.0;
          if (uQualityLevel >= 2) {
            vec2 deepP = p * 0.52 + uMouse * (uDepth * 0.14) + vec2(1.7, -0.9);
            vec4 deepHex = hexGridCoords(deepP);
            float deepEdge = abs(hexDistToEdge(deepHex.xy));
            ghostBorder = exp(-deepEdge * 22.0) * 0.20 * depthFade;
          }

          float fillGlow = smoothstep(0.5, 0.0, localDistFromCenter) * uInnerGlow * bevelShade;
          fillGlow *= (0.18 + 0.78 * totalCellEnergy + 0.75 * mouseProximity + mouseRipple * 0.55);

          // Palette
          vec3 borderCol = uUseCustomColors ? uBorderColor : uPaletteAccent;
          vec3 fillCol = uUseCustomColors ? uFillColor : uPaletteSecondary;
          vec3 pulseCol = uUseCustomColors ? uPulseColor : uPalettePrimary;

          vec3 hotCoreCol = mix(borderCol, vec3(1.0), 0.52);
          vec3 finalColor = borderCol * ((innerBloom + outerBloom + doubleEdge) * borderEnergyBoost * uIntensity);
          finalColor += hotCoreCol * (edgeCore * (0.85 + borderWave * 0.8 + mouseProximity * 0.6) * uIntensity);
          finalColor += borderCol * (ghostBorder * uIntensity);
          finalColor += fillCol * fillGlow;
          finalColor += pulseCol * ((totalCellEnergy * 0.72 + borderWave * 0.65 + mouseProximity * 1.05 + mouseRipple * 0.85) * (totalBorder * 0.48 + fillGlow * 0.55));
          finalColor += mix(pulseCol, vec3(1.0), 0.35) * (coreDot * uIntensity * 1.35);

          finalColor *= depthFade;

          // Vignetage doux aux abords de l'écran pour préserver la lisibilité
          float vignette = 1.0 - smoothstep(0.42, 0.96, length(uv - 0.5));
          finalColor *= vignette;

          float alpha = clamp((totalBorder * 0.78 + fillGlow * 0.58 + coreDot * 0.75 + ghostBorder * 0.5) * depthFade * vignette, 0.0, 1.0);

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
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.borderWidth !== undefined)
      this.material.uniforms.uBorderWidth.value = newProps.borderWidth
    if (newProps.innerGlow !== undefined)
      this.material.uniforms.uInnerGlow.value = newProps.innerGlow
    if (newProps.waveSpread !== undefined)
      this.material.uniforms.uWaveSpread.value = newProps.waveSpread
    if (newProps.perspectiveTilt !== undefined)
      this.material.uniforms.uPerspectiveTilt.value = newProps.perspectiveTilt
    if (newProps.energyWaveIntensity !== undefined)
      this.material.uniforms.uEnergyWaveIntensity.value = newProps.energyWaveIntensity
    if (newProps.bloomStrength !== undefined)
      this.material.uniforms.uBloomStrength.value = newProps.bloomStrength
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
