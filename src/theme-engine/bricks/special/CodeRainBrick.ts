/**
 * src/theme-engine/bricks/special/CodeRainBrick.ts
 *
 * Brique Spéciale : Pluie de Code Numérique (Matrix Rain) (Couche : Spéciaux).
 * Cascade cybernétique de flux de caractères mutants étalés sur 3 couches de profondeur,
 * avec vitesses différentielles indépendantes par colonne, chute posée et réaliste,
 * longues traînées phosphorescentes exponentielles, mutation sélective lente des glyphes
 * et perturbation magnétique au passage de la souris.
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
  /** Multiplicateur optionnel sur la vitesse de chute des colonnes (0.2 à 2.0, défaut 1.0). */
  fallSpeed?: number
  /** Multiplicateur optionnel sur la fréquence de mutation des glyphes (0.0 à 2.0, défaut 1.0). */
  mutationSpeed?: number
  /** Profondeur d'étagement 3D et parallaxe souris (0.0 à 1.0, défaut 0.35). */
  depth?: number
  /** Radiance générale et luminosité des glyphes (0.3 à 2.5, défaut 1.0). */
  intensity?: number
  /** Fréquence de mutation des caractères et variabilité (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Échelle relative de taille des glyphes (0.5 à 2.0, défaut 1.0). */
  charSize?: number
  /** Longueur relative de la traînée phosphorescente (0.2 à 1.5, défaut 0.7). */
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
    const fallSpeed = props.fallSpeed ?? 1.0
    const mutationSpeed = props.mutationSpeed ?? 1.0
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
        uFallSpeed: { value: fallSpeed },
        uMutationSpeed: { value: mutationSpeed },
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
        uniform float uFallSpeed;
        uniform float uMutationSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uCharSize;
        uniform float uTailLength;
        uniform float uMouseGlow;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_HASH}

        // Génère un glyphe de style katakana / cyber-rune matriciel 5x7
        float getGlyphPixel(vec2 ip, int gid, float rnd) {
          float x = ip.x;
          float y = ip.y;

          bool topBar = (y == 5.0 && x >= 1.0 && x <= 3.0);
          bool midBar = (y == 3.0 && x >= 1.0 && x <= 3.0);
          bool botBar = (y == 1.0 && x >= 1.0 && x <= 3.0);
          bool centerCol = (x == 2.0 && y >= 1.0 && y <= 5.0);
          bool leftCol = (x == 1.0 && y >= 1.0 && y <= 5.0);
          bool rightCol = (x == 3.0 && y >= 1.0 && y <= 5.0);
          bool leftHalf = (x == 1.0 && y >= 3.0 && y <= 5.0);
          bool rightHalf = (x == 3.0 && y >= 1.0 && y <= 3.0);
          bool diagDown = (x == (5.0 - y) && y >= 1.0 && y <= 5.0);
          bool diagUp = (x == (y - 1.0) && y >= 1.0 && y <= 5.0);

          bool on = false;
          if (gid == 0) on = topBar || centerCol; // T / 丁
          else if (gid == 1) on = topBar || rightCol || botBar; // コ
          else if (gid == 2) on = topBar || rightCol; // フ / 7
          else if (gid == 3) on = topBar || botBar || leftCol || rightCol; // 口 / 0
          else if (gid == 4) on = topBar || midBar || botBar || leftCol; // E
          else if (gid == 5) on = topBar || midBar || botBar || centerCol; // 工 / エ
          else if (gid == 6) on = leftCol || botBar; // L
          else if (gid == 7) on = leftCol || midBar; // ト
          else if (gid == 8) on = centerCol || (y == 3.0 && x != 2.0); // +
          else if (gid == 9) on = leftCol || rightCol || midBar; // H
          else if (gid == 10) on = diagDown || diagUp; // X
          else if (gid == 11) on = topBar || leftCol || (y == 3.0 && x <= 2.0); // F
          else if (gid == 12) on = (x == 1.0 && y >= 2.0) || (x == 3.0 && y <= 4.0); // リ
          else if (gid == 13) on = topBar || botBar || (x == 2.0 && y >= 2.0 && y <= 4.0); // I
          else if (gid == 14) on = topBar || (x == 3.0 && y >= 3.0) || (y == 2.0 && x <= 2.0); // ユ
          else if (gid == 15) on = (y == 4.0 && x >= 1.0 && x <= 3.0) || (y == 2.0 && x >= 1.0 && x <= 3.0); // 二
          else if (gid == 16) on = topBar || leftHalf || midBar || rightHalf || botBar; // S / 5
          else if (gid == 17) on = (x == 2.0) || (y == 5.0 && x == 1.0); // 1
          else if (gid == 18) on = topBar || (y == 3.0 && x >= 2.0) || (x == 2.0 && y <= 3.0); // テ
          else if (gid == 19) on = (x == 1.0 && y >= 1.0 && y <= 4.0) || (y == 4.0 && x >= 2.0); // レ
          else if (gid == 20) on = diagDown || (x == 2.0 && y <= 2.0); // Y / λ
          else if (gid == 21) on = (y == 5.0 && x == 2.0) || (y == 3.0 && (x == 1.0 || x == 3.0)) || (y == 1.0 && x == 2.0); // ◇
          else if (gid == 22) on = topBar || leftCol || (x == 3.0 && y >= 3.0) || midBar; // P
          else if (gid == 23) on = topBar || rightCol || midBar || (x == 1.0 && y == 2.0); // ク / ア
          else if (gid == 24) on = (y == 5.0 && x >= 1.0) || (x == 3.0 && y >= 2.0) || (y == 1.0 && x == 1.0); // ヌ
          else on = centerCol || topBar || botBar;

          if (rnd > 0.90 && (x == 2.0 || y == 3.0)) on = !on;

          return on ? 1.0 : 0.0;
        }

        // Calcule le flux d'une couche de code rain
        vec4 renderCodeLayer(vec2 uv, float baseCols, float layerSpeed, float layerDepth, float layerAlpha, float charScale) {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 st = vec2(uv.x * aspect, uv.y);

          // Parallaxe souris sur la couche
          st.x += uMouse.x * uDepth * layerDepth * 0.12;
          st.y += uMouse.y * uDepth * layerDepth * 0.06;

          // Déflexion magnétique souris (HIGH & MEDIUM)
          float mouseDist = 1.0;
          if (uQualityLevel >= 1) {
            vec2 mouseScreen = vec2(uMouse.x * 0.5 + 0.5, uMouse.y * 0.5 + 0.5);
            vec2 mouseDelta = vec2((uv.x - mouseScreen.x) * aspect, uv.y - mouseScreen.y);
            mouseDist = length(mouseDelta);
            if (mouseDist < 0.28) {
              float repel = smoothstep(0.28, 0.0, mouseDist) * uMouseGlow * 0.055;
              st.x += (mouseDelta.x / max(0.01, mouseDist)) * repel;
            }
          }

          // Découpage en colonnes avec marge
          float colW = 1.0 / (baseCols * max(0.2, uDensity));
          float colIdx = floor(st.x / colW);
          float colUvX = fract(st.x / colW);

          // Graines décorrélées par colonne : phase, intervalle, vitesse, luminance
          float colSeed1 = hash12(vec2(colIdx, 17.37 + layerDepth * 31.0));
          float colSeed2 = hash12(vec2(colIdx, 73.19 + layerDepth * 59.0));
          float colSeed3 = hash12(vec2(colIdx * 19.31 + 7.1, 41.73 + layerDepth * 37.0));
          float colSeed4 = hash12(vec2(colIdx * 37.9 + 3.7, 91.13 + layerDepth * 13.0));
          float colSpeedMult = 0.52 + 0.86 * colSeed3;
          float colLuminance = 0.70 + 0.30 * colSeed4;

          // Hauteur de ligne (monospace proportion haute 1.6)
          float rowH = colW * (1.6 / max(0.25, uCharSize * charScale));
          float numRows = ceil(1.0 / rowH);
          float rowIdx = floor(st.y / rowH);
          float cellUvY = fract(st.y / rowH);

          // Traînée allongée et chute plus posée (~0.57x de l'ancienne vitesse par défaut)
          float trailRows = max(6.0, floor(28.0 * max(0.2, uTailLength)));
          float gapRows = floor(10.0 + 26.0 * colSeed2);
          float cycleTotalRows = numRows + trailRows + gapRows;

          float rowsPerSec = (5.5 + 9.0 * uSpeed) * max(0.15, uFallSpeed) * layerSpeed * colSpeedMult;
          float totalRowsTraveled = uTime * rowsPerSec + colSeed1 * cycleTotalRows;
          float cycleIdx = floor(totalRowsTraveled / cycleTotalRows);
          float cycleRow = mod(totalRowsTraveled, cycleTotalRows);

          // Avance discrète ligne par ligne (fidèle aux terminaux Matrix)
          float stepCycle = floor(cycleRow);
          float headFrac = fract(cycleRow);
          float headRow = numRows - stepCycle;
          float dRow = rowIdx - headRow;

          if (dRow < 0.0 || dRow > trailRows) {
            return vec4(0.0);
          }

          // Décroissance phosphorescente longue et progressive sans coupure nette en queue
          float trailRatio = dRow / trailRows;
          float tailIntensity = exp(-trailRatio * 2.15) * (1.0 - smoothstep(0.84, 1.0, trailRatio));
          bool isHead = (dRow < 0.5);

          // Mutation sélective lente : la tête change au fil de la chute, ~35% des cellules de traînée mutent lentement
          float mutMult = max(0.0, uMutationSpeed) * (0.25 + 0.85 * uRandomness);
          float cellMutSel = hash12(vec2(colIdx * 23.7 + cycleIdx * 3.1, rowIdx * 41.3 + layerDepth * 19.0));
          float cellTimeOffset = hash12(vec2(colIdx * 13.1, rowIdx * 19.7)) * 12.0;

          float charSeed = cycleIdx * 17.3;
          if (isHead) {
            charSeed += floor(uTime * (0.6 + 1.4 * mutMult) + headRow * 0.37);
          } else if (cellMutSel > 0.65 && mutMult > 0.001) {
            float slowRate = (0.18 + 0.55 * cellMutSel) * mutMult;
            charSeed += floor((uTime + cellTimeOffset) * slowRate);
          }

          float glyphHash = hash12(vec2(colIdx * 31.7 + rowIdx * 7.9, charSeed));
          int gid = int(floor(glyphHash * 26.0));
          float glyphRnd = hash12(vec2(colIdx * 11.1 + rowIdx * 23.3, charSeed + 3.0));

          // Légère variation d'intensité par cellule (phosphore organique)
          float cellBright = 0.80 + 0.20 * hash12(vec2(colIdx * 9.3, rowIdx * 15.7 + cycleIdx));

          // Marges nettes autour de chaque caractère
          float charUvX = (colUvX - 0.14) / 0.72;
          float charUvY = (cellUvY - 0.11) / 0.78;

          float charMask = 0.0;
          if (charUvX >= 0.0 && charUvX <= 1.0 && charUvY >= 0.0 && charUvY <= 1.0) {
            vec2 p = vec2(charUvX * 5.0, charUvY * 7.0);
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            if (uQualityLevel >= 1) {
              float px = smoothstep(0.06, 0.16, fp.x) * (1.0 - smoothstep(0.84, 0.94, fp.x));
              float py = smoothstep(0.06, 0.16, fp.y) * (1.0 - smoothstep(0.84, 0.94, fp.y));
              charMask = getGlyphPixel(ip, gid, glyphRnd) * px * py;
            } else {
              if (fp.x >= 0.10 && fp.x <= 0.90 && fp.y >= 0.10 && fp.y <= 0.90) {
                charMask = getGlyphPixel(ip, gid, glyphRnd);
              }
            }
          }

          // Couleurs
          vec3 primary = uUseCustomColors ? uPrimaryColor : uPalettePrimary;
          vec3 head = uUseCustomColors ? uHeadColor : uPaletteAccent;
          vec3 glow = uUseCustomColors ? uGlowColor : uPaletteSecondary;

          float cellDist = length(vec2(colUvX - 0.5, cellUvY - 0.5));
          float cellGlow = smoothstep(0.68, 0.0, cellDist) * 0.20 * tailIntensity;

          vec3 color = vec3(0.0);
          float alpha = 0.0;

          if (isHead) {
            float headFlash = 1.0 + exp(-headFrac * 3.0) * 0.25;
            float headBloom = smoothstep(0.80, 0.0, cellDist) * 0.50;
            color = mix(head, vec3(1.0), 0.40) * (charMask * 1.85 + headBloom) * headFlash * colLuminance;
            alpha = clamp((charMask * 0.96 + headBloom * 0.62) * layerAlpha, 0.0, 1.0);
          } else {
            vec3 trailCol = mix(glow, primary, clamp(tailIntensity * 1.35, 0.0, 1.0));
            // Rémanence légèrement plus chaude juste derrière la tête
            if (dRow < 2.5) {
              trailCol = mix(trailCol, head, 0.22 * (1.0 - dRow / 2.5));
            }
            color = trailCol * (charMask * tailIntensity * 1.45 * cellBright + cellGlow) * colLuminance;
            alpha = clamp((charMask * tailIntensity + cellGlow) * layerAlpha * colLuminance, 0.0, 1.0);
          }

          if (uQualityLevel >= 1 && mouseDist < 0.22) {
            float boost = smoothstep(0.22, 0.0, mouseDist) * uMouseGlow;
            color += head * (boost * charMask * 0.65);
            alpha = min(1.0, alpha + boost * 0.28);
          }

          return vec4(color, alpha);
        }

        void main() {
          vec2 uv = vUv;
          vec4 col = vec4(0.0);

          // 1. Couche de Fond (Lointaine, dense, douce) - HIGH uniquement
          if (uQualityLevel >= 2) {
            vec4 bg = renderCodeLayer(uv, 48.0, 0.48, 0.15, 0.34, 0.75);
            col = bg;
          }

          // 2. Couche Médiane (Équilibrée, nette) - HIGH & MEDIUM
          if (uQualityLevel >= 1) {
            vec4 mid = renderCodeLayer(uv, 32.0, 0.76, 0.40, 0.72, 0.90);
            col = vec4(col.rgb * (1.0 - mid.a) + mid.rgb, max(col.a, mid.a));
          }

          // 3. Couche Premier Plan (Plus nette, caractères imposants) - TOUS PALIERS
          vec4 fg = renderCodeLayer(uv, 20.0, 1.12, 0.75, 1.0, 1.10);
          col = vec4(col.rgb * (1.0 - fg.a) + fg.rgb, max(col.a, fg.a));

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
    if (newProps.fallSpeed !== undefined)
      this.material.uniforms.uFallSpeed.value = newProps.fallSpeed
    if (newProps.mutationSpeed !== undefined)
      this.material.uniforms.uMutationSpeed.value = newProps.mutationSpeed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.charSize !== undefined) this.material.uniforms.uCharSize.value = newProps.charSize
    if (newProps.tailLength !== undefined)
      this.material.uniforms.uTailLength.value = newProps.tailLength
    if (newProps.mouseGlow !== undefined)
      this.material.uniforms.uMouseGlow.value = newProps.mouseGlow
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
