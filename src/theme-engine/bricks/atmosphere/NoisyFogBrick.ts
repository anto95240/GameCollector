/**
 * src/theme-engine/bricks/atmosphere/NoisyFogBrick.ts
 *
 * Brique d'ambiance Atmosphérique (Couche 4 : Atmosphere).
 * Brume bruitée volumétrique multi-couches en parallaxe, ancrée au sol,
 * animée par champ rotationnel (curl noise 2D) et FBM étiré par le vent,
 * avec éclairage directionnel par les sources de lumière de la scène
 * (diffusion vers l'avant + liseré lumineux / ombres propres) et sillage souris.
 */

import * as THREE from 'three'

import { GLSL_HASH, GLSL_NOISE_2D } from '../../shaders/noise.glsl'
import type { BrickContext, IBrickDefinition, IBrickInstance, QualityTier } from '../../types'
import { BrickRegistry } from '../registry'

/**
 * Paramètres typés et documentés pour la brique Brume Bruitée.
 */
export interface NoisyFogProps {
  /** Teinte dominante de la brume vaporeuse. Si absent, utilise uPaletteSecondary. */
  fogColor?: string
  /** Densité et opacité des bancs de brume (0.2 à 2.5, défaut 1.0). */
  density?: number
  /** Vitesse de dérive du vent et turbulence atmosphérique (0.0 à 1.0, défaut 0.2). */
  speed?: number
  /** Profondeur d'étagement et réactivité à la parallaxe souris (0.0 à 1.0, défaut 0.3). */
  depth?: number
  /** Radiance et diffusion lumineuse dans la brume (0.2 à 2.0, défaut 1.0). */
  intensity?: number
  /** Facteur d'asymétrie et de turbulence chaotique (0.0 à 1.0, défaut 0.35). */
  randomness?: number
  /** Gradient d'atténuation vertical : brume rampante au sol vs diffuse (0.3 à 3.0, défaut 1.5). */
  heightFalloff?: number
  /** Angle de direction du vent en radians (-3.14 à 3.14, défaut 0.15). */
  windAngle?: number
  /** Teinte de la source lumineuse éclairant la brume (si absent, dérivé de uPaletteAccent). */
  lightColor?: string
  /** Position horizontale X normalisée de la source lumineuse (-1.0 à 1.0, défaut 0.35). */
  lightSourceX?: number
  /** Position verticale Y normalisée de la source lumineuse (0.0 à 1.5, défaut 0.85). */
  lightSourceY?: number
  /** Amplitude des volutes tourbillonnaires de type curl noise (0.0 à 1.5, défaut 0.65). */
  curlStrength?: number
}

export class NoisyFogInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'noisy_fog'

  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private props: NoisyFogProps
  private fogColorVec: THREE.Color
  private lightColorVec: THREE.Color

  constructor(id: string, props: NoisyFogProps = {}, context: BrickContext) {
    this.id = id
    this.props = { ...props }
    this.scene = context.scene

    this.fogColorVec = new THREE.Color(props.fogColor ?? '#94a3b8')
    this.lightColorVec = new THREE.Color(props.lightColor ?? '#fef08a')

    const density = props.density ?? 1.0
    const speed = props.speed ?? 0.2
    const depth = props.depth ?? 0.3
    const intensity = props.intensity ?? 1.0
    const randomness = props.randomness ?? 0.35
    const heightFalloff = props.heightFalloff ?? 1.5
    const windAngle = props.windAngle ?? 0.15
    const lightSourceX = props.lightSourceX ?? 0.35
    const lightSourceY = props.lightSourceY ?? 0.85
    const curlStrength = props.curlStrength ?? 0.65

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
        uFogColor: { value: this.fogColorVec },
        uUseCustomColor: { value: Boolean(props.fogColor) },
        uLightColor: { value: this.lightColorVec },
        uUseCustomLightColor: { value: Boolean(props.lightColor) },
        uDensity: { value: density },
        uSpeed: { value: speed },
        uDepth: { value: depth },
        uIntensity: { value: intensity },
        uRandomness: { value: randomness },
        uHeightFalloff: { value: heightFalloff },
        uWindAngle: { value: windAngle },
        uLightSourceX: { value: lightSourceX },
        uLightSourceY: { value: lightSourceY },
        uCurlStrength: { value: curlStrength },
        uQualityLevel: {
          value: context.quality === 'HIGH' ? 2 : context.quality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.985, 1.0);
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
        uniform vec3 uFogColor;
        uniform bool uUseCustomColor;
        uniform vec3 uLightColor;
        uniform bool uUseCustomLightColor;
        uniform float uDensity;
        uniform float uSpeed;
        uniform float uDepth;
        uniform float uIntensity;
        uniform float uRandomness;
        uniform float uHeightFalloff;
        uniform float uWindAngle;
        uniform float uLightSourceX;
        uniform float uLightSourceY;
        uniform float uCurlStrength;
        uniform int uQualityLevel;
        varying vec2 vUv;

        ${GLSL_NOISE_2D}
        ${GLSL_HASH}

        // FBM atmosphérique avec rotation anti-coutures
        float fogFbm(vec2 coord, int octaves) {
          float v = 0.0;
          float a = 0.52;
          float total = 0.0;
          mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
          for (int i = 0; i < 3; i++) {
            if (i >= octaves) break;
            v += a * snoise(coord);
            total += a;
            coord = rot * coord * 2.07 + vec2(17.2, 43.7);
            a *= 0.48;
          }
          return v / max(total, 0.001);
        }

        // Champ rotationnel (curl noise 2D) sans divergence pour des volutes réalistes
        vec2 fogCurl(vec2 p) {
          float eps = 0.07;
          float n1 = snoise(p + vec2(0.0, eps));
          float n2 = snoise(p - vec2(0.0, eps));
          float n3 = snoise(p + vec2(eps, 0.0));
          float n4 = snoise(p - vec2(eps, 0.0));
          return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
        }

        // Curl rapide 3 échantillons pour palier MEDIUM
        vec2 fogCurlFast(vec2 p) {
          float eps = 0.08;
          float n0 = snoise(p);
          float nx = snoise(p + vec2(eps, 0.0));
          float ny = snoise(p + vec2(0.0, eps));
          return vec2((ny - n0) / eps, -(nx - n0) / eps);
        }

        // Convertit un point monde en coordonnées étirées le long de la direction du vent
        vec2 windStretch(vec2 p, vec2 windVec, vec2 windPerp, float alongScale, float acrossScale) {
          return vec2(dot(p, windVec) * alongScale, dot(p, windPerp) * acrossScale);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 screenP = (uv - 0.5) * vec2(aspect, 1.0);

          vec2 windVec = vec2(cos(uWindAngle), sin(uWindAngle));
          vec2 windPerp = vec2(-windVec.y, windVec.x);

          // Cisaillement vertical du vent : l'air se déplace un peu plus vite au-dessus du sol
          float windShear = 0.72 + 0.56 * smoothstep(0.0, 0.65, uv.y);
          float t = uTime * (uSpeed * 0.16);
          float scrollDrift = uScroll * 0.00035 * uDepth;

          // Sillage de souris calculé strictement en espace écran (ne dérive pas avec le vent)
          vec2 mouseScreen = uMouse * 0.5 * vec2(aspect, 1.0);
          vec2 toPixel = screenP - mouseScreen;
          float mouseDist = length(toPixel);
          float mouseWake = smoothstep(0.36, 0.04, mouseDist) * (0.22 + uDepth * 0.34);
          vec2 wakePush = (mouseDist > 0.001 ? toPixel / mouseDist : vec2(0.0)) * (mouseWake * 0.09);

          // Position de la source lumineuse de scène et direction locale
          vec2 lightCenter = vec2(uLightSourceX * aspect * 0.5, uLightSourceY - 0.5) + uMouse * (uDepth * 0.08);
          vec2 toLight = lightCenter - screenP;
          float lightDist = length(toLight);
          vec2 lightDir = lightDist > 0.001 ? toLight / lightDist : vec2(0.0, 1.0);

          // Profil d'ancrage au sol avec atténuation forte en altitude
          float groundCurve = exp(-max(0.0, uv.y) * (1.15 + uHeightFalloff * 1.45));

          float combinedAlpha = 0.0;
          float combinedLight = 0.0;
          float combinedShadow = 0.0;

          if (uQualityLevel >= 2) {
            // === PALIER HIGH : 3 couches en parallaxe + volutes curl + éclairage directionnel ===
            float curlAmp = (0.14 + uRandomness * 0.24) * uCurlStrength;

            // 1. Couche lointaine (lente, peu contrastée, voile de vallée jusqu'à mi-hauteur)
            vec2 pFar = screenP * 0.65 + uMouse * (uDepth * 0.05) + vec2(0.0, scrollDrift * 0.4);
            vec2 wFar = windStretch(pFar, windVec, windPerp, 0.75, 1.35) - vec2(t * 0.42 * windShear, t * 0.08);
            float nFar = fogFbm(wFar + vec2(3.1, 7.4), 2);
            float hFar = exp(-max(0.0, uv.y - 0.04) * (0.65 + uHeightFalloff * 0.85));
            float dFar = smoothstep(-0.22, 0.58, nFar) * hFar * 0.34;

            // 2. Couche médiane (bancs dérivants modulés par curl léger)
            vec2 pMid = screenP * 1.05 + uMouse * (uDepth * 0.11) + wakePush * 0.5 + vec2(0.0, scrollDrift * 0.75);
            vec2 wMid = windStretch(pMid, windVec, windPerp, 0.72, 1.45) - vec2(t * 0.85 * windShear, t * 0.12);
            vec2 curlMid = fogCurlFast(wMid * 0.85 + vec2(t * 0.15, -t * 0.10)) * (curlAmp * 0.55);
            float nMid = fogFbm(wMid + curlMid + vec2(11.3, 2.7), 2);
            float ceilingMid = nMid * 0.16 * (1.0 - uv.y);
            float hMid = clamp(groundCurve + ceilingMid, 0.0, 1.0);
            float dMid = smoothstep(-0.18, 0.62, nMid) * hMid * 0.50;

            // 3. Couche proche du sol (volutes curl détaillées, rapide, fort ancrage bas)
            vec2 pNear = screenP * 1.65 + uMouse * (uDepth * 0.19) + wakePush + vec2(0.0, scrollDrift);
            vec2 wNear = windStretch(pNear, windVec, windPerp, 0.68, 1.60) - vec2(t * 1.35 * windShear, t * 0.18);
            vec2 curlNear = fogCurlFast(wNear * 0.75 + vec2(t * 0.22, -t * 0.16)) * curlAmp;
            vec2 nearCoord = wNear + curlNear;
            float nNear = fogFbm(nearCoord, 3);
            // Échantillon décalé vers la source lumineuse pour l'ombrage / liseré brillant
            vec2 lightStep = windStretch(lightDir * 0.14, windVec, windPerp, 0.68, 1.60);
            float nLit = snoise(nearCoord + lightStep);

            float groundNear = exp(-max(0.0, uv.y) * (1.55 + uHeightFalloff * 1.85));
            float wispCeiling = smoothstep(0.55, 0.0, uv.y) * (nNear * 0.18);
            float hNear = clamp(groundNear + max(0.0, wispCeiling), 0.0, 1.0);
            float dNear = smoothstep(-0.12, 0.66, nNear) * hNear * (1.0 - mouseWake * 0.72) * 0.68;

            combinedAlpha = dFar * 0.45 + dMid * 0.65 + dNear * 0.85;
            // Éclairage sur les bords fins orientés vers la source + auto-ombrage dans les poches épaisses
            float rimLight = clamp((nNear - nLit) * 2.2, 0.0, 1.0);
            combinedLight = rimLight * 0.65 + (1.0 - smoothstep(0.2, 0.9, dNear)) * 0.25;
            combinedShadow = clamp(dNear * 0.65 + dMid * 0.25, 0.0, 1.0);

          } else if (uQualityLevel >= 1) {
            // === PALIER MEDIUM : 2 couches parallaxe + curl rapide + éclairage ===
            float curlAmp = (0.11 + uRandomness * 0.20) * uCurlStrength;

            // Couche lointaine
            vec2 pFar = screenP * 0.78 + uMouse * (uDepth * 0.07) + vec2(0.0, scrollDrift * 0.5);
            vec2 wFar = windStretch(pFar, windVec, windPerp, 0.75, 1.35) - vec2(t * 0.55 * windShear, 0.0);
            float nFar = snoise(wFar + vec2(4.2, 1.9));
            float hFar = exp(-max(0.0, uv.y - 0.02) * (0.75 + uHeightFalloff * 0.95));
            float dFar = smoothstep(-0.22, 0.62, nFar) * hFar * 0.42;

            // Couche proche avec volutes curl
            vec2 pNear = screenP * 1.45 + uMouse * (uDepth * 0.17) + wakePush + vec2(0.0, scrollDrift);
            vec2 wNear = windStretch(pNear, windVec, windPerp, 0.70, 1.50) - vec2(t * 1.15 * windShear, t * 0.12);
            vec2 curlNear = fogCurlFast(wNear * 0.75 + vec2(t * 0.18, -t * 0.12)) * curlAmp;
            float nNear = fogFbm(wNear + curlNear, 2);

            float hNear = clamp(groundCurve + max(0.0, nNear * 0.12 * (1.0 - uv.y)), 0.0, 1.0);
            float dNear = smoothstep(-0.15, 0.65, nNear) * hNear * (1.0 - mouseWake * 0.65) * 0.75;

            combinedAlpha = dFar * 0.50 + dNear * 0.85;
            combinedLight = smoothstep(0.0, 0.6, nNear) * 0.45;
            combinedShadow = clamp(dNear * 0.55, 0.0, 1.0);

          } else {
            // === PALIER LOW : 1 couche étirée par le vent + ancrage sol (budget mobile minimal) ===
            vec2 pLow = screenP * 1.05 + uMouse * (uDepth * 0.12);
            vec2 wLow = windStretch(pLow, windVec, windPerp, 0.70, 1.35) - vec2(t * 0.90, 0.0);
            float nLow = snoise(wLow);
            float lowHeight = exp(-max(0.0, uv.y) * (0.70 + uHeightFalloff * 0.85));
            float dLow = smoothstep(-0.22, 0.65, nLow) * lowHeight * (1.0 - mouseWake * 0.45);
            combinedAlpha = dLow * 0.92;
            combinedLight = smoothstep(-0.1, 0.7, nLow) * 0.38;
            combinedShadow = dLow * 0.30;
          }

          float alpha = clamp(combinedAlpha * uDensity * 0.44 * uIntensity, 0.0, 0.56);
          if (alpha <= 0.003) {
            discard;
          }

          // Éclairage de la brume par la source lumineuse de la scène (diffusion Mie vers l'avant)
          vec3 baseFog = uUseCustomColor ? uFogColor : uPaletteSecondary;
          vec3 sceneLight = uUseCustomLightColor
            ? uLightColor
            : mix(uPaletteAccent, vec3(1.0, 0.96, 0.88), 0.35);

          // Diffusion vers l'avant (halo lumineux doux dans la direction de la source)
          float forwardScatter = exp(-lightDist * 1.75) * (0.45 + 0.55 * smoothstep(0.0, 0.75, uv.y + 0.15));
          // Assombrissement subtil à la base des bancs denses (auto-ombrage atmosphérique)
          vec3 shadowFog = baseFog * mix(0.68, 0.88, uv.y);
          vec3 litFog = mix(shadowFog, baseFog * 1.15, clamp(combinedLight + 0.25, 0.0, 1.0));
          // Ajout de l'illumination de la scène sur les volutes et près de la source
          float lightMix = clamp(forwardScatter * 0.70 + combinedLight * forwardScatter * 0.45, 0.0, 0.78);
          vec3 finalColor = mix(litFog, mix(baseFog, sceneLight, 0.72), lightMix);
          finalColor = mix(finalColor, shadowFog, combinedShadow * 0.22 * (1.0 - forwardScatter));

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -15 // Au-dessus des silhouettes (-20), sous les rayons (-12)
    this.scene.add(this.mesh)
  }

  public init(): void {}
  public update(): void {}

  public updateProps(newProps: Partial<NoisyFogProps>): void {
    if (!this.material) return
    this.props = { ...this.props, ...newProps }

    if (newProps.fogColor !== undefined) {
      this.fogColorVec.set(newProps.fogColor)
      this.material.uniforms.uFogColor.value = this.fogColorVec
      this.material.uniforms.uUseCustomColor.value = true
    }
    if (newProps.lightColor !== undefined) {
      this.lightColorVec.set(newProps.lightColor)
      this.material.uniforms.uLightColor.value = this.lightColorVec
      this.material.uniforms.uUseCustomLightColor.value = true
    }
    if (newProps.density !== undefined) this.material.uniforms.uDensity.value = newProps.density
    if (newProps.speed !== undefined) this.material.uniforms.uSpeed.value = newProps.speed
    if (newProps.depth !== undefined) this.material.uniforms.uDepth.value = newProps.depth
    if (newProps.intensity !== undefined)
      this.material.uniforms.uIntensity.value = newProps.intensity
    if (newProps.randomness !== undefined)
      this.material.uniforms.uRandomness.value = newProps.randomness
    if (newProps.heightFalloff !== undefined)
      this.material.uniforms.uHeightFalloff.value = newProps.heightFalloff
    if (newProps.windAngle !== undefined)
      this.material.uniforms.uWindAngle.value = newProps.windAngle
    if (newProps.lightSourceX !== undefined)
      this.material.uniforms.uLightSourceX.value = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined)
      this.material.uniforms.uLightSourceY.value = newProps.lightSourceY
    if (newProps.curlStrength !== undefined)
      this.material.uniforms.uCurlStrength.value = newProps.curlStrength
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

export const NoisyFogDefinition: IBrickDefinition<NoisyFogProps> = {
  type: 'noisy_fog',
  category: 'atmosphere',
  create: (id, props, context) => new NoisyFogInstance(id, props, context),
}

BrickRegistry.register(NoisyFogDefinition)
