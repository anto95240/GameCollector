/**
 * src/theme-engine/bricks/parallax/OrganicTendrilsBrick.ts
 *
 * Brique de silhouettes organiques & vrilles animées (Couche 2 : Intermediate).
 * Shader SDF à domain-warped FBM générant des vrilles ramifiées, lianes palpitantes,
 * ferrofluide visqueux ou faille dimensionnelle bioluminescente :
 * - 'edges' : vrilles et tentacules rampant depuis les bordures (Upside Down, Symbiote)
 * - 'vertical_rift' : faille dimensionnelle centrale/latérale bioluminescente (Hawkins Lab)
 *
 * Normales analytiques pour reflets spéculaires visqueux (ferrofluide), veines internes
 * pulsant de façon organique non-linéaire, réaction douce au pointeur souris,
 * et adaptation stricte aux 3 paliers de qualité (HIGH, MEDIUM, LOW).
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

export type TendrilAnchorMode = 'edges' | 'vertical_rift'

export interface OrganicTendrilsProps {
  /** Couleur de la matière sombre des vrilles (défaut #09090b ou uPaletteSecondary). */
  primaryColor?: string
  /** Couleur bioluminescente des veines et du cœur de faille (défaut #ef4444 ou uPaletteAccent). */
  veinColor?: string
  /** Couleur des reflets spéculaires visqueux / ferrofluide (défaut #f8fafc). */
  specularColor?: string
  /** Mode d'ancrage spatial des vrilles (défaut 'edges'). */
  anchorMode?: TendrilAnchorMode
  /** Emprise spatiale vers l'intérieur, bridée en mode edges (0.15 à 0.45, défaut 0.30). */
  reach?: number
  /** Intensité lumineuse des veines bioluminescentes (0.0 à 1.0, défaut 0.55). */
  veinGlow?: number
  /** Brillance spéculaire humide / ferrofluide (0.0 à 1.0, défaut 0.55). */
  specularStrength?: number
  /** Cadence de battement organique des veines (0.0 à 1.5, défaut 0.50). */
  pulseSpeed?: number
  /** Densité et finesse de ramification des vrilles (0.4 à 2.2, défaut 1.0). */
  density?: number
  /** Vitesse d'ondulation et reptation (0.0 à 1.5, défaut 0.35). */
  speed?: number
  /** Profondeur et sensibilité à la souris/scroll (0.0 à 1.0, défaut 0.40). */
  depth?: number
  /** Contraste et opacité globale (0.2 à 2.0, défaut 1.0). */
  intensity?: number
  /** Turbulence organique du domain warping (0.0 à 1.0, défaut 0.50). */
  randomness?: number
}

const ANCHOR_MODE_MAP: Record<TendrilAnchorMode, number> = {
  edges: 0,
  vertical_rift: 1,
}

export class OrganicTendrilsInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'organic_tendrils'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: OrganicTendrilsProps
  private primaryColorVec: THREE.Color
  private veinColorVec: THREE.Color
  private specularColorVec: THREE.Color

  constructor(id: string, props: OrganicTendrilsProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.primaryColorVec = new THREE.Color(props.primaryColor ?? '#09090b')
    this.veinColorVec = new THREE.Color(props.veinColor ?? '#ef4444')
    this.specularColorVec = new THREE.Color(props.specularColor ?? '#f8fafc')

    const anchorIdx = ANCHOR_MODE_MAP[props.anchorMode ?? 'edges'] ?? 0
    const reach = props.reach ?? 0.3
    const veinGlow = props.veinGlow ?? 0.55
    const specularStrength = props.specularStrength ?? 0.55
    const pulseSpeed = props.pulseSpeed ?? 0.5
    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.35
    const depth = props.depth ?? 0.4
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.5

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
        uPrimaryColor: { value: this.primaryColorVec },
        uVeinColor: { value: this.veinColorVec },
        uSpecularColor: { value: this.specularColorVec },
        uUseCustomColors: {
          value: Boolean(props.primaryColor || props.veinColor || props.specularColor),
        },
        uAnchorMode: { value: anchorIdx },
        uReach: { value: reach },
        uVeinGlow: { value: veinGlow },
        uSpecularStrength: { value: specularStrength },
        uPulseSpeed: { value: pulseSpeed },
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
          gl_Position = vec4(position.xy, 0.988, 1.0);
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
        uniform vec3 uPrimaryColor;
        uniform vec3 uVeinColor;
        uniform vec3 uSpecularColor;
        uniform bool uUseCustomColors;
        uniform int uAnchorMode;
        uniform float uReach;
        uniform float uVeinGlow;
        uniform float uSpecularStrength;
        uniform float uPulseSpeed;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // Battement organique asymétrique (double impulsion cardiaque sans boucle sèche)
        float organicHeartbeat(float t, float phase) {
          float b1 = pow(max(0.0, sin(t * 2.1 + phase)), 6.0);
          float b2 = pow(max(0.0, sin(t * 2.1 + phase - 0.55)), 8.0) * 0.65;
          float n = 0.78 + 0.22 * snoise(vec2(t * 0.35, phase));
          return (0.28 + 0.72 * clamp(b1 + b2, 0.0, 1.0)) * n;
        }

        // Évalue le champ de vrilles ramifiées (retourne vec2(hauteurMatière, intensitéVeine))
        vec2 evalTendrilField(vec2 p, vec2 uvCoord, float anchorMask, float t) {
          float scale = 3.1 * clamp(uDensity, 0.4, 2.2);
          vec2 q = p * scale;

          // Domain warping organique adaptatif selon le palier de qualité
          vec2 warp1 = vec2(
            snoise(q * 0.85 + vec2(t * 0.42, -t * 0.27)),
            snoise(q * 0.85 + vec2(-t * 0.31 + 5.2, t * 0.38))
          ) * (0.45 + uRandomness * 0.65);

          vec2 warped = q + warp1;

          if (uQualityLevel >= 2) {
            vec2 warp2 = vec2(
              snoise(warped * 1.15 - vec2(t * 0.48, 2.3)),
              snoise(warped * 1.15 + vec2(3.7, t * 0.42))
            ) * (0.24 + uRandomness * 0.30);
            warped += warp2;
          }

          // Filaments principaux par crêtes Simplex (1 - abs(snoise))
          float ridge1 = 1.0 - abs(snoise(warped));
          float ridge2 = 0.0;
          if (uQualityLevel >= 1) {
            ridge2 = 1.0 - abs(snoise(warped * 1.85 + vec2(7.3, -t * 0.35)));
          }

          // Tentacules radiaux directionnels (ancrés aux bords ou à la faille)
          float radialStalks = 0.0;
          if (uAnchorMode == 0) {
            float ang = atan(p.y, p.x);
            // Multiples entiers de ang => zéro couture à -PI / +PI
            float s1 = 0.5 + 0.5 * sin(ang * 12.0 + warp1.x * 3.8 + t * 0.35);
            float s2 = 0.5 + 0.5 * sin(ang * 19.0 - warp1.y * 4.2 - t * 0.28);
            radialStalks = pow(max(s1, s2 * 0.85), 2.2);
          } else {
            // Branches émanant latéralement de la faille verticale
            float branchWave = 0.5 + 0.5 * sin(p.y * 22.0 + warp1.y * 4.5 + sign(p.x) * t * 0.5);
            radialStalks = pow(branchWave, 2.0);
          }

          float ridgeMix = (uQualityLevel == 0) ? ridge1 : max(ridge1, ridge2 * 0.82);
          float rawFilament = mix(ridgeMix, max(ridgeMix, radialStalks), 0.38);

          // La zone d'ancrage contrôle l'épaisseur : dense aux racines, effilée en pointes
          float threshold = mix(0.88, 0.22, anchorMask);
          float matter = smoothstep(threshold, threshold + 0.16, rawFilament) * step(0.02, anchorMask);

          // Veines bioluminescentes au cœur des vrilles
          float vein = pow(clamp((rawFilament - threshold) / max(0.08, 1.0 - threshold), 0.0, 1.0), 3.4);
          vein *= smoothstep(0.05, 0.35, anchorMask);

          return vec2(matter, vein);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          float t = uTime * max(0.02, uSpeed);
          vec2 mousePos = uMouse * 0.5 * vec2(aspect, 1.0);
          vec2 parallaxShift = uMouse * (uDepth * 0.09) + vec2(0.0, uScroll * uDepth * 0.05);

          // Réaction organique de répulsion/curling au passage de la souris
          vec2 pReact = p - parallaxShift;
          vec2 toMouse = pReact - mousePos;
          float dMouse = length(toMouse);
          if (dMouse < 0.38 && uDepth > 0.01) {
            vec2 pushDir = toMouse / max(0.001, dMouse);
            float pushStr = exp(-dMouse * 8.5) * 0.065 * uDepth;
            pReact += pushDir * pushStr;
          }

          // Calcul du masque d'ancrage spatial
          float reachClamped = clamp(uReach, 0.15, 0.45);
          float anchorMask = 0.0;
          float riftCoreGlow = 0.0;

          if (uAnchorMode == 0) {
            // === EDGES : rampant depuis le pourtour vers le centre (centre dégagé) ===
            vec2 dBorder = min(uv, 1.0 - uv);
            float minEdge = min(dBorder.x, dBorder.y);
            // Légère portée accrue aux coins pour un encadrement naturel
            float cornerReach = length(dBorder * vec2(aspect, 1.0)) * 0.72;
            float distInward = min(minEdge, cornerReach);
            float reachNoise = snoise(pReact * 2.6 + vec2(t * 0.14, -t * 0.11)) * 0.08 * (0.4 + uRandomness);
            anchorMask = 1.0 - smoothstep(0.02, reachClamped + reachNoise, distInward);
          } else {
            // === VERTICAL_RIFT : brèche dimensionnelle verticale (Hawkins Lab) ===
            float riftMeander = snoise(vec2(pReact.y * 2.8, t * 0.24)) * 0.085 * (0.5 + uRandomness);
            float dx = abs(pReact.x - riftMeander);
            float vEnvelope = smoothstep(0.49, 0.12, abs(pReact.y));
            float jaggedEdge = snoise(vec2(pReact.y * 12.0 - t * 0.35, 3.1)) * 0.018;
            float riftHalfW = (0.025 + reachClamped * 0.11) * vEnvelope + jaggedEdge;

            // Cœur incandescent déchiré à l'intérieur de la faille
            riftCoreGlow = exp(-max(0.0, dx - max(0.0, riftHalfW * 0.35)) * 28.0) * vEnvelope;
            // Tentacules s'étendant autour de la brèche
            float tendrilExtent = (0.14 + reachClamped * 0.72) * (0.45 + 0.55 * vEnvelope);
            anchorMask = 1.0 - smoothstep(0.0, tendrilExtent, dx);
          }

          // Rejet rapide hors portée (garde le centre 100 % net et économise le GPU)
          if (anchorMask <= 0.004 && riftCoreGlow <= 0.004) {
            discard;
          }

          vec2 field = evalTendrilField(pReact, uv, anchorMask, t);
          float matter = field.x;
          float vein = field.y;

          // Strate d'arrière-plan en parallaxe subtile (HIGH uniquement)
          float backMatter = 0.0;
          if (uQualityLevel >= 2 && anchorMask > 0.05) {
            vec2 backRes = evalTendrilField(pReact * 0.78 + parallaxShift * 0.5 + vec2(2.1, -1.4), uv, anchorMask * 0.85, t * 0.65);
            backMatter = backRes.x * 0.55;
          }

          float combinedMatter = max(matter, backMatter);
          if (combinedMatter <= 0.005 && riftCoreGlow <= 0.01) {
            discard;
          }

          vec3 colMatter = uUseCustomColors ? uPrimaryColor : (uPaletteSecondary * 0.35);
          vec3 colVein = uUseCustomColors ? uVeinColor : uPaletteAccent;
          vec3 colSpec = uUseCustomColors ? uSpecularColor : vec3(0.97, 0.98, 1.0);

          vec3 finalCol = colMatter;

          // Normales de surface pour reflet spéculaire ferrofluide visqueux (MEDIUM & HIGH)
          if (uQualityLevel >= 1 && matter > 0.02 && uSpecularStrength > 0.01) {
            float eps = 0.010;
            float hx = evalTendrilField(pReact + vec2(eps, 0.0), uv, anchorMask, t).x;
            float hy = evalTendrilField(pReact + vec2(0.0, eps), uv, anchorMask, t).x;
            vec2 grad = clamp(vec2(matter - hx, matter - hy), vec2(-0.35), vec2(0.35));
            vec3 norm = normalize(vec3(grad, eps * 3.0));

            vec3 lightDir = normalize(vec3(uMouse.x * uDepth * 1.1 + 0.35, uMouse.y * uDepth * 1.1 + 0.6, 0.85));
            vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
            float spec = pow(max(0.0, dot(norm, halfVec)), 20.0) * uSpecularStrength * 1.35;
            float rim = pow(1.0 - max(norm.z, 0.0), 2.2) * uSpecularStrength * 0.50;

            finalCol += colSpec * (spec + rim) * smoothstep(0.04, 0.25, matter);
          }

          // Pulsation des veines bioluminescentes + cœur de brèche dimensionnelle
          float pulse = organicHeartbeat(uTime * max(0.05, uPulseSpeed), pReact.y * 3.2 + pReact.x * 2.1);
          if (uVeinGlow > 0.01) {
            finalCol += colVein * vein * uVeinGlow * pulse * 1.45;
          }
          if (uAnchorMode == 1 && riftCoreGlow > 0.01) {
            vec3 riftHot = mix(colVein, vec3(1.0, 0.88, 0.72), clamp(riftCoreGlow * 0.7, 0.0, 0.85));
            finalCol = mix(finalCol, riftHot * (0.8 + 0.45 * pulse), clamp(riftCoreGlow * (1.0 - matter * 0.65), 0.0, 1.0));
          }

          float alpha = clamp(max(combinedMatter, riftCoreGlow * 0.92) * uIntensity, 0.0, 0.96);
          if (alpha <= 0.004) {
            discard;
          }

          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -22
    this.scene.add(this.mesh)
  }

  public init(): void {}

  public update(): void {}

  public updateProps(newProps: Partial<OrganicTendrilsProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.primaryColor !== undefined) {
      this.primaryColorVec.set(newProps.primaryColor)
      this.material.uniforms.uPrimaryColor.value = this.primaryColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.veinColor !== undefined) {
      this.veinColorVec.set(newProps.veinColor)
      this.material.uniforms.uVeinColor.value = this.veinColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.specularColor !== undefined) {
      this.specularColorVec.set(newProps.specularColor)
      this.material.uniforms.uSpecularColor.value = this.specularColorVec
      this.material.uniforms.uUseCustomColors.value = true
    }
    if (newProps.anchorMode !== undefined) {
      this.material.uniforms.uAnchorMode.value = ANCHOR_MODE_MAP[newProps.anchorMode] ?? 0
    }
    if (newProps.reach !== undefined) this.material.uniforms.uReach.value = newProps.reach
    if (newProps.veinGlow !== undefined) this.material.uniforms.uVeinGlow.value = newProps.veinGlow
    if (newProps.specularStrength !== undefined)
      this.material.uniforms.uSpecularStrength.value = newProps.specularStrength
    if (newProps.pulseSpeed !== undefined)
      this.material.uniforms.uPulseSpeed.value = newProps.pulseSpeed
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

export const OrganicTendrilsDefinition: IBrickDefinition<OrganicTendrilsProps> = {
  type: 'organic_tendrils',
  category: 'intermediate',
  create: (id, props, context) => new OrganicTendrilsInstance(id, props, context),
}

BrickRegistry.register(OrganicTendrilsDefinition)
