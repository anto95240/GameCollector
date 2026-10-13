/**
 * src/theme-engine/bricks/special/CodeRainBrick.ts
 *
 * Brique Spéciale : Pluie de Code Numérique (Matrix Rain) (Couche : Spéciaux).
 * Cascade cybernétique de flux de caractères mutants étalés sur 3 couches de profondeur,
 * avec têtes de gouttes fluorescentes ultra-brillantes (accent blanc/cyan), traînées
 * phosphorescentes exponentielles, glyphes procéduraux 5x5 en temps réel et
 * perturbation magnétique au passage de la souris.
 */

import * as THREE from 'three'

import { GLSL_HASH } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Pluie de Code.
 */
export interface CodeRainProps {
  /** Couleur dominante des traînées de caractères (défaut #00ff66 ou uPalettePrimary). */
  primaryColor?: string
  /** Couleur d'incandescence de la tête de goutte (défaut #ffffff ou uPaletteAccent). */
  headColor?: string
  /** Couleur du halo d'ambiance phosphorescent (défaut #003b15 ou uPaletteSecondary). */
  glowColor?: string
  /** Densité et nombre de colonnes de code (0.4 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de défilement des flux (0.1 à 2.0, défaut 0.45). */
  speed?: number
  /** Profondeur d'étagement 3D et parallaxe souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance générale et luminosité des glyphes (0.3 à 2.5, défaut 1.0). */
  intensity?: number
  /** Fréquence de mutation des caractères et variabilité (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Échelle relative de taille des glyphes (0.5 à 2.0, défaut 1.0). */
  charSize?: number
  /** Longueur relative de la traînée phosphorescente (0.2 à 1.2, défaut 0.7). */
  tailLength?: number
  /** Force de perturbation magnétique sous la souris (0.0 à 1.0, défaut 0.5). */
  mouseGlow?: number
}

export class CodeRainInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'code_rain'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: CodeRainProps
  private primaryColorVec: THREE.Color
  private headColorVec: THREE.Color
  private glowColorVec: THREE.Color

  constructor(id: string, props: CodeRainProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#00ff66')
    this.headColorVec = new THREE.Color(props.headColor ?? '#ffffff')
    this.glowColorVec = new THREE.Color(props.glowColor ?? '#003b15')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.45
    const depth = props.depth ?? 0.35
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.35
    const charSize = props.charSize ?? 1.0
    const tailLength = props.tailLength ?? 0.7
    const mouseGlow = props.mouseGlow ?? 0.5

    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uResolution: context.sharedUniforms.uResolution,
        uMouse: context.sharedUniforms.uMouse,
        uPalettePrimary: context.sharedUniforms.uPalettePrimary,
        uPaletteSecondary: context.sharedUniforms.uPaletteSecondary,
        uPaletteAccent: context.sharedUniforms.uPaletteAccent,
        uPrimaryColor: { value: this.primaryColorVec },
        uHeadColor: { value: this.headColorVec },
        uGlowColor: { value: this.glowColorVec },
        uUseCustomColors: {
          value: Boolean(props.primaryColor || props.headColor || props.glowColor),
        },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uCharSize: { value: charSize },
        uTailLength: { value: tailLength },
        uMouseGlow: { value: mouseGlow },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9991, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uPalettePrimary;
        uniform vec3 uPaletteSecondary;
        uniform vec3 uPaletteAccent;
        uniform vec3 uPrimaryColor;
        uniform vec3 uHeadColor;
        uniform vec3 uGlowColor;
        uniform bool uUseCustomColors;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uCharSize;
        uniform float uTailLength;
        uniform float uMouseGlow;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        // Génère un glyphe matriciel procédural 5x5 à partir de coordonnées locales et d'un ID de symbole
        float proceduralChar(vec2 cellUv, float charId, float charSeed) {
          // Grille 5x5 avec marges nettes
          vec2 p = cellUv * vec2(5.0, 7.0);
          vec2 ip = floor(p);
          vec2 fp = fract(p);

          // Marges extérieures
          if (ip.x < 0.0 || ip.x >= 5.0 || ip.y < 0.0 || ip.y >= 7.0) return 0.0;
          if (fp.x < 0.12 || fp.x > 0.88 || fp.y < 0.12 || fp.y > 0.88) return 0.0;

          // Hachage du pixel matriciel combiné avec l'identité du caractère
          float pixelHash = hash12(vec2(ip.x + charId * 17.13, ip.y + charSeed * 29.41));
          // Symétrie partielle pour rappeler des katakanas / runes cyber
          if (ip.x >= 3.0) {
            float symHash = hash12(vec2((4.0 - ip.x) + charId * 17.13, ip.y + charSeed * 29.41));
            if (symHash > 0.5) pixelHash = max(pixelHash, symHash);
          }

          return step(0.42, pixelHash);
        }

        // Calcule le flux d'une couche de code rain
        vec4 renderCodeLayer(vec2 uv, float numCols, float layerSpeed, float layerDepth, float layerAlpha) {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 st = vec2(uv.x * aspect, uv.y);

          // Parallaxe souris sur la couche
          st.x += uMouse.x * uDepth * layerDepth * 0.15;
          st.y += uMouse.y * uDepth * layerDepth * 0.08;

          // Répulsion / déflexion magnétique souris
          vec2 mouseScreen = vec2(uMouse.x * 0.5 + 0.5, uMouse.y * 0.5 + 0.5);
          float mouseDist = length(vec2((uv.x - mouseScreen.x) * aspect, uv.y - mouseScreen.y));
          float mouseDistort = smoothstep(0.28, 0.0, mouseDist) * uMouseGlow * 0.12;
          st.x += (uv.x - mouseScreen.x) * mouseDistort;

          // Découpage en colonnes
          float colW = 1.0 / (numCols * uDensity);
          float colIndex = floor(st.x / colW);
          float colUvX = fract(st.x / colW);

          // Grain aléatoire par colonne
          float colSeed = hash12(vec2(colIndex, 19.37));
          float colSpeedMult = 0.65 + 0.7 * hash12(vec2(colIndex, 51.13));

          // Échelle verticale des caractères (proportions hautes monospace 1.7x)
          float rowH = colW * (1.7 / max(0.2, uCharSize));
          float rowCoord = st.y / rowH;
          float rowIndex = floor(rowCoord);
          float cellUvY = fract(rowCoord);

          // Défilement vertical du flux
          float t = uTime * uSpeed * layerSpeed * colSpeedMult * 4.0;
          float streamPos = (1.0 - uv.y) * (18.0 / max(0.2, uTailLength)) + t + colSeed * 50.0;
          float dropCycle = fract(streamPos * 0.12);

          // La tête de goutte est au point 1.0 du cycle
          float distFromHead = 1.0 - dropCycle;
          // Intensité de la traînée phosphorescente avec chute exponentielle
          float tailIntensity = exp(-distFromHead * (6.0 / max(0.2, uTailLength)));
          // Tête de goutte incandescente avec halo volumétrique
          float isHead = smoothstep(0.05, 0.0, distFromHead);
          float headBloom = exp(-distFromHead * 28.0) * 1.5;

          // Taux de rafraîchissement des caractères (mutation organique)
          float mutateRate = 1.0 + 8.0 * uRandomness;
          float charSeed = floor(uTime * mutateRate + colSeed * 20.0 + rowIndex * 0.35);
          float charId = floor(hash12(vec2(colIndex * 3.7 + rowIndex, charSeed)) * 64.0);

          // Rendu du glyphe matriciel
          vec2 localCellUv = vec2(colUvX, cellUvY);
          float charMask = proceduralChar(localCellUv, charId, charSeed);

          // Halo d'ambiance entourant les caractères
          float glowMask = smoothstep(0.5, 0.0, length(localCellUv - 0.5)) * 0.28;

          // Combinaison
          float totalGlyph = (charMask * 0.85 + glowMask) * tailIntensity;

          // Couleurs
          vec3 primary = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 head = uUseCustomColors ? uHeadColor : uPaletteAccent;
          vec3 glow = uUseCustomColors ? uGlowColor : uPaletteSecondary;

          vec3 color = mix(primary, glow, 0.35) * totalGlyph;
          // Injection de la tête incandescente et de son halo
          color = mix(color, head, clamp((isHead * 1.4 + headBloom * 0.8) * (charMask * 0.8 + 0.5), 0.0, 2.0));

          // Amplification sous le pointeur souris
          if (mouseDist < 0.22) {
            float boost = smoothstep(0.22, 0.0, mouseDist) * uMouseGlow;
            color += head * (boost * charMask * 0.8);
          }

          float alpha = clamp((totalGlyph + isHead) * layerAlpha, 0.0, 1.0);
          return vec4(color, alpha);
        }

        void main() {
          vec2 uv = vUv;
          vec4 col = vec4(0.0);

          // 1. Couche de Fond (Lointaine, dense et douce) - HIGH uniquement
          if (uQualityLevel >= 2) {
            vec4 bgLayer = renderCodeLayer(uv, 55.0, 0.55, 0.15, 0.35);
            col = bgLayer;
          }

          // 2. Couche Médiane (Équilibrée, nette) - HIGH & MEDIUM
          if (uQualityLevel >= 1) {
            vec4 midLayer = renderCodeLayer(uv, 34.0, 1.0, 0.45, 0.75);
            col = vec4(col.rgb * (1.0 - midLayer.a) + midLayer.rgb, max(col.a, midLayer.a));
          }

          // 3. Couche Premier Plan (Rapide, percutante, caractères imposants) - TOUS PALIERS
          vec4 fgLayer = renderCodeLayer(uv, 22.0, 1.35, 0.85, 0.95);
          col = vec4(col.rgb * (1.0 - fgLayer.a) + fgLayer.rgb, max(col.a, fgLayer.a));

          // Application de l'intensité globale
          col.rgb *= uIntensity;

          gl_FragColor = col;
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -55
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<CodeRainProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.headColor !== undefined) {
      this.headColorVec.set(newProps.headColor)
      this.material.uniforms.uHeadColor.value = this.headColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.glowColor !== undefined) {
      this.glowColorVec.set(newProps.glowColor)
      this.material.uniforms.uGlowColor.value = this.glowColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined) this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined) this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.charSize !== undefined) this.material.uniforms.uCharSize.value = newProps.charSize
    if (newProps.tailLength !== undefined) this.material.uniforms.uTailLength.value = newProps.tailLength
    if (newProps.mouseGlow !== undefined) this.material.uniforms.uMouseGlow.value = newProps.mouseGlow
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

export const CodeRainDefinition: IBrickDefinition<CodeRainProps> = {
  type: 'code_rain',
  category: 'special',
  create: (id, props, context) => new CodeRainInstance(id, props, context),
}

BrickRegistry.register(CodeRainDefinition)
