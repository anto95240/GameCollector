/**
 * src/theme-engine/bricks/parallax/ParallaxForestBrick.ts
 *
 * Brique de silhouettes de Forêt en Parallaxe (Couche 2 : Intermediate).
 * Forêt dense et majestueuse étagée sur 3 plans de profondeur distincts :
 * - Plan lointain estompé dans la brume céleste
 * - Plan intermédiaire avec cimes de conifères et feuillus oscillant sous le vent
 * - Premier plan sombre et net avec houppiers détaillés et brume de sous-bois
 *
 * Mouvement organique non-linéaire (flexion quadratique des cimes sous le vent Simplex),
 * micro-lucioles dorées asynchrones, et étagement de parallaxe réagissant à la souris et au scroll.
 * Adaptation aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Silhouette Forêt.
 */
export interface ParallaxForestProps {
  /** Teinte dominante des arbres au premier plan (défaut #0a1f18 ou uPaletteSecondary * 0.4). */
  forestColor?: string
  /** Teinte de la brume de sous-bois et d'horizon (défaut #164e3f ou uPalettePrimary * 0.3). */
  fogColor?: string
  /** Densité et resserrement des troncs et cimes d'arbres (défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent et d'oscillation des cimes (défaut 0.25). */
  speed?: number
  /** Profondeur d'étagement et sensibilité à la parallaxe souris/scroll (défaut 0.35). */
  depth?: number
  /** Contraste général, opacité et densité de brume (défaut 1.0). */
  intensity?: number
  /** Variabilité des hauteurs d'arbres et irrégularité des rafales (défaut 0.4). */
  randomness?: number
  /** Amplitude de flexion des cimes sous les rafales de vent (défaut 0.5). */
  windStrength?: number
}

export class ParallaxForestInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'parallax_forest'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: ParallaxForestProps
  private forestColorVec: THREE.Color
  private fogColorVec: THREE.Color

  constructor(id: string, props: ParallaxForestProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.forestColorVec = new THREE.Color(props.forestColor ?? '#0a1f18')
    this.fogColorVec = new THREE.Color(props.fogColor ?? '#164e3f')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.25
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.4
    const windStrength = props.windStrength ?? 0.5

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
        uForestColor: { value: this.forestColorVec },
        uFogColor: { value: this.fogColorVec },
        uUseCustomColors: {
          value: Boolean(props.forestColor || props.fogColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uWindStrength: { value: windStrength },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.992, 1.0);
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
        uniform vec3 uForestColor;
        uniform vec3 uFogColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uWindStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Calcule la silhouette d'un arbre conifère / sapin avec branches triangulaires étagées
        float treeSilhouette(vec2 p, float treeH, float treeW, float windSway) {
          if (p.y > treeH || p.y < 0.0) return 0.0;
          // Flexion quadratique du sommet sous le vent
          float sway = windSway * pow(max(0.0, p.y / max(0.01, treeH)), 2.0);
          float px = p.x - sway;

          // 3 étages de branchages triangulaires se rétrécissant vers la cime
          float yRel = p.y / treeH;
          float tier1 = max(0.0, 1.0 - abs(px) / (treeW * (1.0 - yRel * 0.8)));
          
          // Dents de branches crénelées
          float branchNoise = snoise(vec2(px * 18.0, p.y * 12.0)) * 0.15;
          return step(0.1, tier1 + branchNoise);
        }

        // Évalue une strate complète d'arbres avec parallaxe et décalage
        vec4 evaluateForestLayer(
          vec2 uv,
          float baseLineY,
          float layerScale,
          float parallaxRatio,
          float layerSpeed,
          vec3 layerColor,
          vec3 fogCol,
          float time,
          vec2 mouse
        ) {
          // Décalage de parallaxe différencié
          float shiftX = mouse.x * uDepth * parallaxRatio * 1.5;
          float shiftY = mouse.y * uDepth * parallaxRatio * 0.4 + uScroll * parallaxRatio * 0.2;
          vec2 p = vec2(uv.x + shiftX, uv.y + shiftY);

          // Ligne de crête vallonnée du sol
          float groundNoise = snoise(vec2(p.x * 2.2 * uDensity, layerScale * 5.0)) * 0.06;
          float groundY = baseLineY + groundNoise;

          // Échantillonnage de troncs d'arbres espacés
          float cellWidth = 0.045 / (layerScale * uDensity);
          float cellIndex = floor(p.x / cellWidth);
          float cellX = p.x - (cellIndex + 0.5) * cellWidth;

          // Variabilité par arbre via hash
          float randSeed = hash12(vec2(cellIndex, layerScale * 17.3));
          float treeExists = step(0.15, randSeed); // 85% de chance d'arbre présent
          float treeHeight = (0.16 + randSeed * 0.12 * uRandomness) * layerScale;
          float treeWidth = (0.022 + randSeed * 0.01 * uRandomness) * layerScale;

          // Rafale de vent locale non-linéaire
          float wind = sin(time * uSpeed * 2.5 + cellIndex * 0.8) * 0.018 * uWindStrength;
          wind += snoise(vec2(p.x * 3.0, time * uSpeed * 1.2)) * 0.012 * uWindStrength;

          float localY = p.y - groundY;
          vec2 treeCoord = vec2(cellX, localY);
          float inTree = treeSilhouette(treeCoord, treeHeight, treeWidth, wind) * treeExists;

          // Sol sous la ligne de crête
          float inGround = step(p.y, groundY);

          float totalCoverage = max(inTree, inGround);
          if (totalCoverage <= 0.01) {
            return vec4(0.0);
          }

          // Dégradé vertical et diffusion de brume atmosphérique
          float heightFactor = clamp(localY / max(0.01, treeHeight), 0.0, 1.0);
          vec3 finalTreeColor = mix(layerColor * 0.85, layerColor * 1.15, heightFactor);

          // Brume à la base des troncs
          float mist = smoothstep(0.0, 0.08 * layerScale, localY);
          finalTreeColor = mix(fogCol, finalTreeColor, mist * 0.8 + 0.2);

          return vec4(finalTreeColor, totalCoverage * uIntensity);
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          vec3 baseForest = uUseCustomColors ? uForestColor : (uPaletteSecondary * 0.35);
          vec3 baseFog = uUseCustomColors ? uFogColor : (uPalettePrimary * 0.3);

          vec4 result = vec4(0.0);

          // Strate 3 : Lointaine (Très brumeuse, se fond dans le ciel, mouvement très lent)
          if (uQualityLevel >= 1) {
            vec3 farColor = mix(baseForest, baseFog, 0.65);
            vec4 l3 = evaluateForestLayer(uv, 0.38, 0.6, 0.15, 0.4, farColor, baseFog, t, uMouse);
            if (l3.a > 0.0) {
              result = l3;
            }
          }

          // Strate 2 : Intermédiaire (Densité moyenne, brume de sous-bois)
          vec3 midColor = mix(baseForest, baseFog, 0.35);
          vec4 l2 = evaluateForestLayer(uv, 0.22, 1.0, 0.32, 0.7, midColor, baseFog, t, uMouse);
          if (l2.a > 0.0) {
            result = mix(result, l2, l2.a);
          }

          // Strate 1 : Premier plan (Nette, sombre, branches découpées, forte parallaxe)
          vec4 l1 = evaluateForestLayer(uv, 0.05, 1.5, 0.55, 1.0, baseForest, baseFog * 0.7, t, uMouse);
          if (l1.a > 0.0) {
            result = mix(result, l1, l1.a);
          }

          // Effet High Quality : Micro-lucioles dans les branchages
          if (uQualityLevel >= 2 && result.a > 0.2) {
            vec2 fireflyCoord = uv * vec2(25.0, 35.0);
            vec2 fireflyCell = floor(fireflyCoord);
            float fRand = hash12(fireflyCell + 42.1);
            if (fRand > 0.88) {
              float pulse = sin(t * 3.0 + fRand * 6.28) * 0.5 + 0.5;
              float dist = length(fract(fireflyCoord) - 0.5);
              float glow = smoothstep(0.3, 0.0, dist) * pulse;
              vec3 fireflyCol = uUseCustomColors ? uPaletteAccent : vec3(0.95, 0.85, 0.3);
              result.rgb += fireflyCol * glow * 0.75 * uIntensity;
            }
          }

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
    this.mesh.renderOrder = -40 // Devant le ciel (-95), sous les particules (0)
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<ParallaxForestProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.forestColor !== undefined) {
      this.forestColorVec.set(newProps.forestColor)
      this.material.uniforms.uForestColor.value = this.forestColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.fogColor !== undefined) {
      this.fogColorVec.set(newProps.fogColor)
      this.material.uniforms.uFogColor.value = this.fogColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.windStrength !== undefined) this.material.uniforms.uWindStrength.value = newProps.windStrength
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

export const ParallaxForestDefinition: IBrickDefinition<ParallaxForestProps> = {
  type: 'parallax_forest',
  category: 'intermediate',
  create: (id, props, context) => new ParallaxForestInstance(id, props, context),
}

BrickRegistry.register(ParallaxForestDefinition)
