/**
 * src/theme-engine/bricks/background/BubblingLiquidSurfaceBrick.ts
 *
 * Brique de Fond : Surface Liquide Bouillonnante & Visqueuse (Couche 1 : Background).
 * Shader procédural 1 draw call combinant :
 * - Fluide visqueux animé par double domain-warped FBM avec courants de convection profonds
 * - 2 strates de cellules convectives Voronoi générant des bulles asynchrones à cycle organique
 *   en 3 phases : gonflement en dôme translucide rétroéclairé -> éclatement incandescent ->
 *   anneaux concentriques amortis selon la viscosité
 * - Sillage convectif interactif au passage de la souris (remous dans le chaudron/bassin)
 *
 * Thèmes cibles : potion_magique, clown_prince, league_of_assassins.
 * Adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export interface BubblingLiquidSurfaceProps {
  /** Teinte profonde du liquide / chaudron / bain chimique (défaut #065f46 ou uPaletteSecondary). */
  liquidColor?: string
  /** Teinte des crêtes effervescentes, parois de bulles et anneaux (défaut #34d399 ou uPalettePrimary). */
  bubbleColor?: string
  /** Teinte du cœur luminescent interne et flash d'éclatement (défaut #fde047 ou uPaletteAccent). */
  coreGlowColor?: string
  /** Viscosité du fluide : lourd/sirupeux (0.9) vs vif/aqueux (0.2) (0.2 à 0.9, défaut 0.55). */
  viscosity?: number
  /** Cadence d'ébullition et d'éclatement des bulles (0.2 à 1.2, défaut 0.50). */
  boilSpeed?: number
  /** Calibre moyen des bulles convectives (0.5 à 2.0, défaut 1.0). */
  bubbleScale?: number
  /** Densité globale des cellules convectives (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Vitesse d'écoulement des courants visqueux (0.0 à 1.5, défaut 0.35). */
  speed?: number
  /** Profondeur d'immersion et réactivité souris/scroll (0.0 à 1.0, défaut 0.30). */
  depth?: number
  /** Radiance lumineuse et contraste global (0.3 à 2.2, défaut 1.15). */
  intensity?: number
  /** Turbulence organique des courants et dispersion des bulles (0.0 à 1.0, défaut 0.45). */
  randomness?: number
}

export class BubblingLiquidSurfaceInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'bubbling_liquid_surface'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: BubblingLiquidSurfaceProps
  private liquidColorVec: THREE.Color
  private bubbleColorVec: THREE.Color
  private coreGlowColorVec: THREE.Color

  constructor(id: string, props: BubblingLiquidSurfaceProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.liquidColorVec = new THREE.Color(props.liquidColor ?? '#065f46')
    this.bubbleColorVec = new THREE.Color(props.bubbleColor ?? '#34d399')
    this.coreGlowColorVec = new THREE.Color(props.coreGlowColor ?? '#fde047')

    const viscosity = props.viscosity ?? 0.55
    const boilSpeed = props.boilSpeed ?? 0.5
    const bubbleScale = props.bubbleScale ?? 1.0
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.15
    const randomness = props.randomness ?? 0.45

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
        uLiquidColor: { value: this.liquidColorVec },
        uBubbleColor: { value: this.bubbleColorVec },
        uCoreGlowColor: { value: this.coreGlowColorVec },
        uUseCustomColors: {
          value: Boolean(props.liquidColor || props.bubbleColor || props.coreGlowColor),
        },
        uViscosity: { value: viscosity },
        uBoilSpeed: { value: boilSpeed },
        uBubbleScale: { value: bubbleScale },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9986, 1.0);
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
        uniform vec3 uLiquidColor;
        uniform vec3 uBubbleColor;
        uniform vec3 uCoreGlowColor;
        uniform bool uUseCustomColors;
        uniform float uViscosity;
        uniform float uBoilSpeed;
        uniform float uBubbleScale;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Évalue une strate de bulles convectives qui gonflent, éclatent et créent des anneaux.
        // Retourne vec4(domeRim, coreGlow, rippleRings, specular)
        vec4 evalBubbleLayer(vec2 p, float tBoil, float cellScale, float sizeMul, float visc, vec3 lightDir, float seed) {
          vec2 gp = p * cellScale;
          vec2 n = floor(gp);
          vec2 f = fract(gp);

          float accRim = 0.0;
          float accCore = 0.0;
          float accRipple = 0.0;
          float accSpec = 0.0;

          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 cellId = n + g;
              vec2 h = hash22(cellId + seed);
              float h3 = hash12(cellId + seed + 17.9);

              // Cycle asynchrone propre à chaque cellule (jamais de boucle globale visible)
              float rate = (0.48 + h.x * 0.64) * mix(1.25, 0.58, visc);
              float phase = fract(tBoil * rate + h.y * 23.17);
              // Pause naturelle entre deux bulles dans la même cellule
              float activeWindow = 0.72 + h3 * 0.24;
              if (phase > activeWindow) continue;
              float life = phase / activeWindow;

              // Légère dérive organique de la bulle pendant son gonflement
              vec2 drift = vec2(
                sin(tBoil * 0.7 + h.x * 6.2831),
                cos(tBoil * 0.6 + h.y * 6.2831)
              ) * (0.08 + uRandomness * 0.08) * (1.0 - visc * 0.45);
              vec2 center = g + 0.5 + (h - 0.5) * 0.62 + drift;
              vec2 delta = f - center;
              float dist = length(delta);

              float maxR = clamp((0.18 + h3 * 0.21) * sizeMul, 0.08, 0.44);
              // Durée de gonflement prolongée si le liquide est visqueux
              float popTime = mix(0.56, 0.74, visc);

              if (life < popTime) {
                // Phase 1 : Gonflement progressif du dôme translucide
                float u = life / popTime;
                // Courbe organique de dilatation (lente au début, tendue avant l'éclatement)
                float grow = smoothstep(0.0, 0.85, u) * (0.78 + 0.22 * sin(u * 3.14159 * 0.65));
                float r = max(0.015, maxR * grow);

                if (dist < r * 1.18) {
                  float nd = dist / r;
                  float inside = smoothstep(1.04, 0.88, nd);
                  float rim = smoothstep(0.42, 0.96, nd) * inside;
                  // La peau au sommet s'amincit juste avant d'éclater => cœur incandescent
                  float thinApex = (1.0 - nd * nd) * smoothstep(0.25, 1.0, u) * inside;

                  // Normale hémisphérique du dôme pour reflet spéculaire liquide
                  float nz = sqrt(max(0.02, 1.0 - min(0.98, nd * nd)));
                  vec3 norm = normalize(vec3(delta / r, nz));
                  vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
                  float spec = pow(max(0.0, dot(norm, halfVec)), mix(18.0, 38.0, visc)) * inside;

                  accRim = max(accRim, rim * (0.65 + 0.35 * u));
                  accCore = max(accCore, thinApex * (0.45 + 0.75 * u));
                  accSpec = max(accSpec, spec * (0.75 + 0.35 * u));
                }
              } else {
                // Phase 2 & 3 : Éclatement incandescent + anneaux concentriques amortis
                float pAge = (life - popTime) / max(0.05, 1.0 - popTime);

                // Bref flash au point de rupture
                float burstFlash = exp(-pAge * 10.5) * exp(-dist * dist / max(0.004, maxR * maxR * 0.38));
                accCore = max(accCore, burstFlash * 1.15);

                // Onde circulaire principale + harmonique secondaire
                float waveSpeed = mix(0.55, 0.30, visc);
                float ringR = maxR * 0.78 + pAge * waveSpeed;
                float ringWidth = mix(0.045, 0.085, visc);
                float ring1 = exp(-pow((dist - ringR) / ringWidth, 2.0));
                float ring2 = exp(-pow((dist - (ringR - 0.09)) / (ringWidth * 0.85), 2.0)) * 0.52 * smoothstep(0.12, 0.35, pAge);
                float ringFade = (1.0 - pAge) * (1.0 - pAge);

                accRipple += (ring1 + ring2) * ringFade * smoothstep(0.0, 0.06, pAge);
              }
            }
          }

          return vec4(accRim, accCore, clamp(accRipple, 0.0, 1.4), accSpec);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float visc = clamp(uViscosity, 0.2, 0.9);
          float flowRate = mix(1.35, 0.45, visc);
          float tFlow = uTime * max(0.02, uSpeed) * flowRate;
          float tBoil = uTime * max(0.04, uBoilSpeed) * (0.55 + uSpeed * 0.9);

          // Parallaxe douce et léger remous convectif autour du pointeur souris
          vec2 parallax = uMouse * (uDepth * 0.12) + vec2(0.0, uScroll * uDepth * 0.08);
          vec2 q = p - parallax;

          vec2 mousePos = uMouse * 0.5 * vec2(aspect, 1.0);
          vec2 toMouse = q - mousePos;
          float dMouse = length(toMouse);
          float mouseWake = 0.0;
          if (dMouse < 0.42 && uDepth > 0.01) {
            float angle = exp(-dMouse * 5.5) * 0.32 * uDepth * (1.15 - visc * 0.45);
            float cs = cos(angle);
            float sn = sin(angle);
            q = mousePos + mat2(cs, -sn, sn, cs) * toMouse;
            mouseWake = exp(-dMouse * 6.5) * (0.5 + 0.5 * sin(dMouse * 28.0 - uTime * 4.5)) * uDepth;
          }

          // 1. Fluide visqueux domain-warped FBM
          float fluidScale = (2.1 + uDensity * 0.55);
          vec2 fq = q * fluidScale;
          vec2 warp1 = vec2(
            snoise(fq * 0.72 + vec2(tFlow * 0.36, -tFlow * 0.24)),
            snoise(fq * 0.72 + vec2(-tFlow * 0.28 + 4.1, tFlow * 0.33))
          ) * (0.48 + uRandomness * 0.55);

          float fluidVal = 0.0;
          float ridgeVal = 0.0;

          if (uQualityLevel == 0) {
            // === PALIER LOW : 2 octaves FBM visqueux + points chauds d'ébullition ===
            float n1 = snoise(fq + warp1 * 0.55);
            float n2 = snoise(fq * 2.05 + warp1 * 0.4 - vec2(tFlow * 0.2, 1.3));
            fluidVal = (n1 * 0.65 + n2 * 0.35) * 0.5 + 0.5;
            ridgeVal = pow(clamp(1.0 - abs(n2), 0.0, 1.0), 2.2);
          } else {
            vec2 warped = fq + warp1;
            if (uQualityLevel >= 2) {
              vec2 warp2 = vec2(
                snoise(warped * 1.12 - vec2(tFlow * 0.42, 2.7)),
                snoise(warped * 1.12 + vec2(6.3, tFlow * 0.38))
              ) * (0.28 + uRandomness * 0.32);
              warped += warp2;
            }
            float f1 = snoise(warped);
            float f2 = snoise(warped * 1.95 + vec2(tFlow * 0.22, -tFlow * 0.18));
            float f3 = (uQualityLevel >= 2) ? snoise(warped * 3.7 - vec2(tFlow * 0.35, 3.4)) : 0.0;
            fluidVal = (f1 * 0.58 + f2 * 0.30 + f3 * 0.12) * 0.5 + 0.5;
            // Crêtes visqueuses brillantes à la jonction des cellules de convection
            ridgeVal = pow(clamp(1.0 - abs(f1 * 0.65 + f2 * 0.35), 0.0, 1.0), mix(2.2, 3.6, visc));
          }

          vec3 colLiquid = uUseCustomColors ? uLiquidColor : uPaletteSecondary;
          vec3 colBubble = uUseCustomColors ? uBubbleColor : uPalettePrimary;
          vec3 colCore = uUseCustomColors ? uCoreGlowColor : uPaletteAccent;

          // Profondeur de chaudron : bords légèrement plus sombres, cœur plus chaud/convectif
          float cauldronDepth = smoothstep(1.15, 0.08, length(p));
          vec3 deepCol = colLiquid * (0.24 + 0.34 * cauldronDepth);
          vec3 midCol = mix(deepCol, colLiquid * 1.15, smoothstep(0.18, 0.78, fluidVal));
          vec3 surfaceCol = mix(midCol, colBubble, smoothstep(0.45, 0.92, fluidVal) * 0.58 + ridgeVal * 0.34);
          // Lueur de convection sous-jacente dans les zones chaudes
          float subsurfacePlume = pow(clamp(fluidVal, 0.0, 1.0), 3.2) * (0.35 + 0.65 * cauldronDepth);
          surfaceCol += colCore * subsurfacePlume * 0.32;

          // 2. Strates de bulles convectives éclatantes
          vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 0.9 + 0.32, uMouse.y * uDepth * 0.9 + 0.58, 0.92));
          float scaleInv = 1.0 / clamp(uBubbleScale, 0.5, 2.0);
          float baseCells = 3.2 * clamp(uDensity, 0.4, 2.2) * scaleInv;
          // Légère distorsion de la grille de bulles par les courants du liquide
          vec2 bubbleCoord = q + warp1 * 0.055;

          if (uQualityLevel == 0) {
            // Halos d'ébullition analytiques légers (0 boucle)
            float hotspot = pow(max(0.0, snoise(bubbleCoord * baseCells * 1.3 + vec2(0.0, tBoil * 0.8))), 4.0);
            surfaceCol += colBubble * hotspot * 0.55 + colCore * pow(hotspot, 1.6) * 0.75;
          } else {
            vec4 b1 = evalBubbleLayer(bubbleCoord, tBoil, baseCells, 1.0, visc, lightDir, 3.1);
            vec4 bCombined = b1;

            if (uQualityLevel >= 2) {
              // Seconde strate de bulles secondaires plus fines et plus vives
              vec4 b2 = evalBubbleLayer(bubbleCoord + vec2(0.41, -0.27), tBoil * 1.28, baseCells * 1.75, 0.85, visc, lightDir, 41.7);
              bCombined = vec4(
                max(b1.x, b2.x * 0.82),
                max(b1.y, b2.y * 0.78),
                clamp(b1.z + b2.z * 0.65, 0.0, 1.5),
                max(b1.w, b2.w * 0.85)
              );
            }

            // Assombrissement subtil sous le dôme de bulle pour détacher le volume
            surfaceCol *= (1.0 - bCombined.x * 0.25);
            // Parois effervescentes + anneaux concentriques
            surfaceCol += colBubble * (bCombined.x * 0.78 + bCombined.z * 0.62);
            // Cœur incandescent des bulles mûres et flash d'éclatement
            surfaceCol += colCore * bCombined.y * 0.95;
            // Éclat spéculaire brillant sur les dômes visqueux
            surfaceCol += mix(colCore, vec3(1.0), 0.72) * bCombined.w * 0.95;
          }

          // Remous lumineux au passage de la souris
          if (mouseWake > 0.005) {
            surfaceCol += colBubble * mouseWake * 0.35 + colCore * mouseWake * 0.18;
          }

          // Contraste final & vignettage naturel de profondeur
          surfaceCol *= (0.72 + 0.36 * cauldronDepth) * clamp(uIntensity, 0.3, 2.2);
          gl_FragColor = vec4(surfaceCol, 1.0);
        }
      `,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -86
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<BubblingLiquidSurfaceProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.liquidColor !== undefined) {
      this.liquidColorVec.set(newProps.liquidColor)
      this.material.uniforms.uLiquidColor.value = this.liquidColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.bubbleColor !== undefined) {
      this.bubbleColorVec.set(newProps.bubbleColor)
      this.material.uniforms.uBubbleColor.value = this.bubbleColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.coreGlowColor !== undefined) {
      this.coreGlowColorVec.set(newProps.coreGlowColor)
      this.material.uniforms.uCoreGlowColor.value = this.coreGlowColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.viscosity !== undefined)
      this.material.uniforms.uViscosity.value = newProps.viscosity
    if (newProps.boilSpeed !== undefined)
      this.material.uniforms.uBoilSpeed.value = newProps.boilSpeed
    if (newProps.bubbleScale !== undefined)
      this.material.uniforms.uBubbleScale.value = newProps.bubbleScale
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
  }

  public onQualityChange(quality: QualityTier): void {
    if (!this.material) return
    this.material.uniforms.uQualityLevel.value =
      quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
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

export const BubblingLiquidSurfaceDefinition: IBrickDefinition<BubblingLiquidSurfaceProps> = {
  type: 'bubbling_liquid_surface',
  category: 'background',
  create: (id, props, context) => new BubblingLiquidSurfaceInstance(id, props, context),
}

BrickRegistry.register(BubblingLiquidSurfaceDefinition)
