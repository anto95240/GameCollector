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

        // Tree canopy: smooth envelope that broadens at the base and tapers to a point.
        // Uses noise to create irregular leaf edges on the silhouette boundary.
        float treeSilhouette(vec2 p, float treeH, float treeW, float windSway, float randSeed) {
          if (p.y > treeH || p.y < 0.0) return 0.0;

          // Quadratic wind flexion of the crown
          float sway = windSway * pow(max(0.0, p.y / max(0.01, treeH)), 2.0);
          float px = p.x - sway;

          // Relative height within the tree (0 = base, 1 = tip)
          float yRel = p.y / treeH;

          // Base canopy envelope: widest at ~20% height, tapering to a point at top
          float envelopeRadius = treeW * (1.0 - pow(yRel, 1.4)) * smoothstep(0.0, 0.15, yRel);

          // Add trunk below the canopy start
          float trunkRadius = treeW * 0.12;
          float trunkZone = smoothstep(0.18, 0.05, yRel);
          envelopeRadius = max(envelopeRadius, trunkRadius * trunkZone);

          // Distance from center axis
          float dist = abs(px);
          
          // Irregular leaf edges: noise on the boundary to break the smooth outline
          float edgeNoise = snoise(vec2(px * 22.0 + randSeed * 5.0, p.y * 18.0 + randSeed * 3.0)) * 0.25 * treeW;
          edgeNoise += snoise(vec2(px * 45.0 + randSeed * 9.0, p.y * 35.0)) * 0.1 * treeW;

          float boundary = envelopeRadius + edgeNoise;

          // Smooth edge for anti-aliased silhouette
          return smoothstep(boundary, boundary - 0.003, dist);
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

          // Undulating ground line (multi-frequency noise for natural hills)
          float groundNoise = snoise(vec2(p.x * 1.8 * uDensity, layerScale * 5.0)) * 0.08;
          groundNoise += snoise(vec2(p.x * 4.5 * uDensity, layerScale * 12.0)) * 0.03;
          float groundY = baseLineY + groundNoise;

          // Échantillonnage de troncs d'arbres espacés
          float cellWidth = 0.045 / (layerScale * uDensity);
          float cellIndex = floor(p.x / cellWidth);
          float cellCenter = (cellIndex + 0.5) * cellWidth;

          // Slight horizontal jitter per tree so they don't sit on an exact grid
          float jitterX = (hash12(vec2(cellIndex, layerScale * 17.3)) - 0.5) * cellWidth * 0.35;
          float cellX = p.x - cellCenter - jitterX;

          // Per-tree randomisation via hash
          float randSeed = hash12(vec2(cellIndex, layerScale * 17.3));
          float treeExists = step(0.15, randSeed);
          float treeHeight = (0.16 + randSeed * 0.14 * uRandomness) * layerScale;
          float treeWidth = (0.028 + randSeed * 0.015 * uRandomness) * layerScale;

          // Non-linear local wind gust
          float wind = sin(time * uSpeed * 2.5 + cellIndex * 0.8) * 0.018 * uWindStrength;
          wind += snoise(vec2(p.x * 3.0, time * uSpeed * 1.2)) * 0.012 * uWindStrength;

          float localY = p.y - groundY;
          vec2 treeCoord = vec2(cellX, localY);
          float inTree = treeSilhouette(treeCoord, treeHeight, treeWidth, wind, randSeed) * treeExists;

          // Also check the two neighbouring cells to avoid gaps at cell boundaries
          float leftIdx = cellIndex - 1.0;
          float leftCenter = (leftIdx + 0.5) * cellWidth;
          float leftJitter = (hash12(vec2(leftIdx, layerScale * 17.3)) - 0.5) * cellWidth * 0.35;
          float leftRand = hash12(vec2(leftIdx, layerScale * 17.3));
          float leftH = (0.16 + leftRand * 0.14 * uRandomness) * layerScale;
          float leftW = (0.028 + leftRand * 0.015 * uRandomness) * layerScale;
          float leftWind = sin(time * uSpeed * 2.5 + leftIdx * 0.8) * 0.018 * uWindStrength;
          leftWind += snoise(vec2((leftCenter + leftJitter) * 3.0, time * uSpeed * 1.2)) * 0.012 * uWindStrength;
          float leftTree = treeSilhouette(vec2(p.x - leftCenter - leftJitter, localY), leftH, leftW, leftWind, leftRand) * step(0.15, leftRand);

          float rightIdx = cellIndex + 1.0;
          float rightCenter = (rightIdx + 0.5) * cellWidth;
          float rightJitter = (hash12(vec2(rightIdx, layerScale * 17.3)) - 0.5) * cellWidth * 0.35;
          float rightRand = hash12(vec2(rightIdx, layerScale * 17.3));
          float rightH = (0.16 + rightRand * 0.14 * uRandomness) * layerScale;
          float rightW = (0.028 + rightRand * 0.015 * uRandomness) * layerScale;
          float rightWind = sin(time * uSpeed * 2.5 + rightIdx * 0.8) * 0.018 * uWindStrength;
          rightWind += snoise(vec2((rightCenter + rightJitter) * 3.0, time * uSpeed * 1.2)) * 0.012 * uWindStrength;
          float rightTree = treeSilhouette(vec2(p.x - rightCenter - rightJitter, localY), rightH, rightW, rightWind, rightRand) * step(0.15, rightRand);

          inTree = max(inTree, max(leftTree, rightTree));

          // Ground below the hill line
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

          // HIGH quality: micro-fireflies in the canopy — warm golden, irregularly placed
          if (uQualityLevel >= 2 && result.a > 0.2) {
            // Use a coarser grid and jitter each firefly's position via hash
            vec2 ffGrid = uv * vec2(18.0, 24.0);
            vec2 ffCell = floor(ffGrid);
            float fRand = hash12(ffCell + 42.1);
            if (fRand > 0.9) {
              // Jitter within the cell for irregular placement
              vec2 jitter = hash22(ffCell + 77.3) * 0.7 + 0.15;
              float pulse = pow(sin(t * (2.2 + fRand * 2.0) + fRand * 6.28) * 0.5 + 0.5, 2.5);
              float dist = length(fract(ffGrid) - jitter);
              float glow = smoothstep(0.15, 0.0, dist) * pulse;
              // Always warm golden, never use palette accent which may be pink
              vec3 fireflyCol = vec3(0.95, 0.85, 0.3);
              result.rgb += fireflyCol * glow * 0.55 * uIntensity;
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
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.windStrength !== undefined)
      this.material.uniforms.uWindStrength.value = newProps.windStrength
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
