/**
 * src/theme-engine/bricks/parallax/ParallaxCastleBrick.ts
 *
 * Brique de silhouettes de Château & Forteresse en Ruines en Parallaxe (Couche 2 : Intermediate).
 * Forteresse médiévale imposante juchée sur un promontoire rocheux escarpé :
 * - Éperon rocheux et falaises sculptées par bruit géologique
 * - Donjon central, tourelles crénelées, mâchicoulis et courtines étagées
 * - Meurtrières illuminées par des torches vacillantes à pulsation organique
 * - Bannières ondulant au vent et silhouettes d'oiseaux lointains en vol orbital
 * - Paramètre de délabrement (ruinDecay) modulant l'état d'intégrité ou d'effondrement en ruines
 *
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Château / Ruines.
 */
export interface ParallaxCastleProps {
  /** Teinte de la maçonnerie médiévale et des murailles (défaut #080d1a ou uPaletteSecondary * 0.35). */
  castleColor?: string
  /** Teinte des torches chaleureuses vacillant dans les meurtrières (défaut #f97316 ou uPaletteAccent). */
  torchColor?: string
  /** Teinte du promontoire rocheux et des falaises (défaut #0f172a ou uPaletteSecondary * 0.4). */
  rockColor?: string
  /** Densité et nombre de tours, contreforts et pans de courtines (défaut 1.0). */
  density?: number
  /** Vitesse de vacillement des torches, ondulation des oriflammes et vol des oiseaux (défaut 0.3). */
  speed?: number
  /** Étalement en profondeur et sensibilité à la parallaxe souris/scroll (défaut 0.3). */
  depth?: number
  /** Contraste d'ombre et éclat des torches (défaut 1.0). */
  intensity?: number
  /** Asymétrie architecturale et dispersion des créneaux (défaut 0.4). */
  randomness?: number
  /** Degré de délabrement en ruines (0.0 = forteresse intacte, 1.0 = ruines antiques effondrées, défaut 0.25). */
  ruinDecay?: number
  /** Éclat et rayon de diffusion des torches vacillantes (défaut 1.0). */
  torchGlow?: number
}

export class ParallaxCastleInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_castle'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxCastleProps
  private castleColorVec: THREE.Color
  private torchColorVec: THREE.Color
  private rockColorVec: THREE.Color

  constructor(id: string, props: ParallaxCastleProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.castleColorVec = new THREE.Color(props.castleColor ?? '#080d1a')
    this.torchColorVec = new THREE.Color(props.torchColor ?? '#f97316')
    this.rockColorVec = new THREE.Color(props.rockColor ?? '#0f172a')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.3
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const ruinDecay = props.ruinDecay ?? 0.25
    const torchGlow = props.torchGlow ?? 1.0

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
        uCastleColor: { value: this.castleColorVec },
        uTorchColor: { value: this.torchColorVec },
        uRockColor: { value: this.rockColorVec },
        uUseCustomColors: {
          value: Boolean(props.castleColor || props.torchColor || props.rockColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uRuinDecay: { value: ruinDecay },
        uTorchGlow: { value: torchGlow },
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
        uniform vec3 uCastleColor;
        uniform vec3 uTorchColor;
        uniform vec3 uRockColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uRuinDecay;
        uniform float uTorchGlow;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule la silhouette d'une tour médiévale avec créneaux et toit conique optionnel
        float evaluateTower(vec2 p, float centerX, float baseAltitude, float towerH, float towerW, float coneRoof, float decay) {
          float dx = abs(p.x - centerX);
          if (dx > towerW * 0.5 || p.y < baseAltitude) return 0.0;

          float wallTop = baseAltitude + towerH;

          // Si on est dans le fût de la tour
          if (p.y <= wallTop) {
            // Effet d'effondrement partiel si ruines
            float crumble = snoise(vec2(p.x * 30.0, p.y * 30.0)) * decay * 0.04;
            if (p.y > (wallTop - crumble)) return 0.0;

            // Créneaux au sommet du mur
            if (p.y > (wallTop - 0.025)) {
              float crenelStep = mod(dx * 40.0, 1.0);
              if (crenelStep > 0.5 && decay > 0.1) return 0.0; // interstice de créneau
            }
            return 1.0;
          }

          // Toit conique en flèche (si non ruiné)
          if (coneRoof > 0.5 && decay < 0.6) {
            float roofH = towerW * 1.4;
            float roofRelY = (p.y - wallTop) / roofH;
            if (roofRelY >= 0.0 && roofRelY <= 1.0) {
              float roofMaxDx = (1.0 - roofRelY) * (towerW * 0.6);
              if (dx <= roofMaxDx) return 1.0;
            }
          }

          return 0.0;
        }

        // Silhouette des oiseaux / corbeaux orbitant au-dessus des ruines
        float birdSilhouette(vec2 p, vec2 birdPos, float birdScale) {
          vec2 b = (p - birdPos) / birdScale;
          if (length(b) > 1.2) return 0.0;
          // Forme d'ailes en M déployées
          float wing = abs(b.x) - pow(max(0.0, b.y + 0.3), 0.6);
          return smoothstep(0.12, 0.0, abs(wing) + abs(b.y) * 0.5);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          // Parallaxe amortie
          float shiftX = uMouse.x * uDepth * 1.5;
          float shiftY = uMouse.y * uDepth * 0.35 + uScroll * 0.18;
          vec2 p = vec2(uv.x + shiftX, uv.y + shiftY);

          vec3 baseCastle = uUseCustomColors ? uCastleColor : (uPaletteSecondary * 0.28);
          vec3 baseRock = uUseCustomColors ? uRockColor : (uPaletteSecondary * 0.38);
          vec3 baseTorch = uUseCustomColors ? uTorchColor : uPaletteAccent;

          // 1. Promontoire rocheux / falaise escarpée
          float rockBaseY = 0.18;
          float cliffNoise = snoise(vec2(p.x * 2.8 * uDensity, 3.4)) * 0.09;
          cliffNoise += snoise(vec2(p.x * 7.5, 8.2)) * 0.035;
          float rockY = rockBaseY + cliffNoise;

          // Décrochage central pour asseoir la forteresse
          float plateau = smoothstep(0.7, 0.3, abs(p.x - 0.5));
          rockY += plateau * 0.08;

          float inRock = step(p.y, rockY);
          float inCastle = 0.0;

          // 2. Assemblage architectural de la forteresse
          // Donjon central imposant
          inCastle = max(inCastle, evaluateTower(p, 0.50, rockY - 0.02, 0.32, 0.14, 1.0, uRuinDecay));

          // Grande Tour d'angle gauche
          inCastle = max(inCastle, evaluateTower(p, 0.38, rockY - 0.01, 0.26, 0.09, 1.0, uRuinDecay * 1.2));

          // Tour d'angle droite
          inCastle = max(inCastle, evaluateTower(p, 0.62, rockY - 0.01, 0.24, 0.085, 0.0, uRuinDecay * 0.8));

          // Tourelle suspendue en échauguette
          inCastle = max(inCastle, evaluateTower(p, 0.29, rockY + 0.02, 0.18, 0.065, 1.0, uRuinDecay * 1.5));

          // Courtine reliant les tours
          if (p.x >= 0.32 && p.x <= 0.68 && p.y <= (rockY + 0.15)) {
            float wallCrumble = snoise(vec2(p.x * 20.0, 1.5)) * uRuinDecay * 0.06;
            if (p.y <= (rockY + 0.15 - wallCrumble)) {
              inCastle = 1.0;
            }
          }

          // Muraille bastion droite
          if (p.x >= 0.64 && p.x <= 0.78 && p.y <= (rockY + 0.10)) {
            inCastle = 1.0;
          }

          float totalStructure = max(inRock, inCastle);

          if (totalStructure <= 0.01) {
            // Pas de pierre ici : vérifier s'il y a des oiseaux en vol au-dessus (High quality)
            if (uQualityLevel >= 2) {
              float birds = 0.0;
              for (int b = 0; b < 3; b++) {
                float bOffset = float(b) * 2.1;
                float bTime = t * uSpeed * 0.8 + bOffset;
                vec2 bPos = vec2(
                  0.5 + cos(bTime * 0.6 + float(b)) * 0.22,
                  0.55 + sin(bTime * 0.4) * 0.08 + float(b) * 0.04
                );
                birds += birdSilhouette(p, bPos, 0.014);
              }
              if (birds > 0.1) {
                gl_FragColor = vec4(baseCastle * 0.8, birds * uIntensity);
                return;
              }
            }
            discard;
          }

          // Dégradé de roche vs pierre de château
          vec3 pixelColor = (inCastle > inRock) ? baseCastle : baseRock;

          // Texturation subtile de maçonnerie par bruit
          float stoneTexture = snoise(vec2(p.x * 25.0, p.y * 35.0)) * 0.12;
          pixelColor = mix(pixelColor * 0.9, pixelColor * 1.15, stoneTexture + 0.5);

          // 3. Meurtrières éclairées par des torches vacillantes
          if (uQualityLevel >= 1 && inCastle > 0.5) {
            // Fentes de meurtrières verticales sur le donjon et les tours
            bool isMeurtriere = false;
            vec2 slitCoord = vec2(0.0);

            // Donjon meurtrières
            if (abs(p.x - 0.50) < 0.04 && p.y > (rockY + 0.08) && p.y < (rockY + 0.26)) {
              float my = mod((p.y - rockY) * 25.0, 1.0);
              float mx = abs(p.x - 0.50) / 0.04;
              if (my > 0.3 && my < 0.7 && mx < 0.25) isMeurtriere = true;
            }

            // Tour gauche meurtrière
            if (abs(p.x - 0.38) < 0.025 && p.y > (rockY + 0.07) && p.y < (rockY + 0.18)) {
              float my = mod((p.y - rockY) * 22.0, 1.0);
              if (my > 0.3 && my < 0.7) isMeurtriere = true;
            }

            if (isMeurtriere) {
              // Vacillement de flamme non-linéaire Simplex
              float flameFlicker = snoise(vec2(t * uSpeed * 4.5, p.x * 10.0)) * 0.35 + 0.65;
              vec3 torchGlowCol = mix(baseTorch, vec3(1.0, 0.9, 0.4), flameFlicker * 0.5);
              pixelColor = mix(pixelColor, torchGlowCol * 1.6, flameFlicker * uTorchGlow * uIntensity);
            }
          }

          // Bannières flottant au vent au sommet du donjon (High quality)
          if (uQualityLevel >= 2 && p.x > 0.50 && p.x < 0.55 && p.y > (rockY + 0.32) && p.y < (rockY + 0.35)) {
            float bannerWave = sin(t * uSpeed * 5.0 + (p.x - 0.5) * 40.0) * 0.008;
            if (abs(p.y - (rockY + 0.335) - bannerWave) < 0.007) {
              pixelColor = mix(pixelColor, uPaletteAccent, 0.9 * uIntensity);
            }
          }

          gl_FragColor = vec4(pixelColor, clamp(uIntensity, 0.0, 1.0));
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

  public updateProps(newProps: Partial<ParallaxCastleProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.castleColor !== undefined) {
      this.castleColorVec.set(newProps.castleColor)
      this.material.uniforms.uCastleColor.value = this.castleColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.torchColor !== undefined) {
      this.torchColorVec.set(newProps.torchColor)
      this.material.uniforms.uTorchColor.value = this.torchColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.rockColor !== undefined) {
      this.rockColorVec.set(newProps.rockColor)
      this.material.uniforms.uRockColor.value = this.rockColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.ruinDecay !== undefined) this.material.uniforms.uRuinDecay.value = newProps.ruinDecay
    if (newProps.torchGlow !== undefined) this.material.uniforms.uTorchGlow.value = newProps.torchGlow
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

export const ParallaxCastleDefinition: IBrickDefinition<ParallaxCastleProps> = {
  type: 'parallax_castle',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxCastleInstance(id, props, context),
}

BrickRegistry.register(ParallaxCastleDefinition)
