/**
 * themeAnimationConfig.ts — Source de verite des animations par theme
 */

export type LayerType =
  | 'particles'
  | 'fog'
  | 'glow'
  | 'scanlines'
  | 'stars'
  | 'rain'
  | 'aurora_bands'

export interface ParticleLayerConfig {
  type: 'particles'
  colors: string[]
  maxParticles: number
  radiusRange: [number, number]
  opacityRange: [number, number]
  speedY: number
  driftX: number
  speedVariance?: number
  shape: 'circle' | 'star' | 'cross' | 'diamond'
  connections?: {
    enabled: boolean
    maxDistance: number
    color: string
    width: number
  }
}

export interface FogLayerConfig {
  type: 'fog'
  color: string
  opacity: number
  duration: number
  layers: number
}

export interface GlowLayerConfig {
  type: 'glow'
  color: string
  opacity: number
  duration: number
  position: 'top' | 'bottom' | 'all' | 'corners'
  size: number
}

export interface ScanlinesLayerConfig {
  type: 'scanlines'
  opacity: number
  spacing: number
  color: string
  speed: number
}

export interface StarsLayerConfig {
  type: 'stars'
  count: number
  color: string
  twinkle: number
  maxSize: number
  zone?: 'full' | 'top' | 'bottom'
}

export interface RainLayerConfig {
  type: 'rain'
  color: string
  count: number
  length: number
  speed: number
  angle: number
  opacity: number
}

export interface AuroraBandsLayerConfig {
  type: 'aurora_bands'
  /** Couleurs principales des bandes (vert, vert-teal, etc.) */
  colors: string[]
  /** Nombre de bandes horizontales */
  bandCount: number
  /** Hauteur max de la zone aurora (ratio ecran, 0-1) */
  heightRatio: number
  /** Opacite globale [0-1] */
  opacity: number
  /** Vitesse base du shimmer */
  waveSpeed: number
  /** Amplitude de l'ondulation verticale (px) */
  waveAmplitude: number
  /** Sigma de base pour la taille des bandes (px) */
  bandWidth: number
}

export type LayerConfig =
  | ParticleLayerConfig
  | FogLayerConfig
  | GlowLayerConfig
  | ScanlinesLayerConfig
  | StarsLayerConfig
  | RainLayerConfig
  | AuroraBandsLayerConfig

export interface ThemeAnimationEntry {
  layers: LayerConfig[]
  contentShield?: { enabled: boolean; color: string }
}

export const THEME_ANIMATION_CONFIG: Record<string, ThemeAnimationEntry> = {
  /**
   * neon_night — Reseau de particules cyber connectees
   */
  neon_night: {
    layers: [
      {
        type: 'particles',
        colors: ['#00f0ff', '#0088cc', '#5af2ff', '#00aaff', '#0060bb', '#33ddff'],
        maxParticles: 80,
        radiusRange: [1.5, 4],
        opacityRange: [0.3, 0.85],
        speedY: -0.45,
        driftX: 1.0,
        speedVariance: 0.6,
        shape: 'circle',
        connections: {
          enabled: true,
          maxDistance: 150,
          color: 'rgba(0, 200, 255, 0.3)',
          width: 0.7,
        },
      } as ParticleLayerConfig,
    ],
    contentShield: { enabled: false, color: 'transparent' },
  },

  /**
   * aurora — Aurores boréales hyperréalistes v6
   * (Moteur fidèle à l'analyse de la vidéo de référence)
   *
   * waveAmplitude : amplitude des méandres du rideau (px)
   * bandWidth     : hauteur de base des rayons (px) — maxRayH = bandWidth * 5-8
   * waveSpeed     : vitesse de la dérive MACRO. Le micro est 300× plus rapide en interne.
   * bandCount     : 4 bandes bien espacées dans la zone aurora
   * heightRatio   : 0.50 → aurore occupe la moitié haute du ciel
   */
  aurora: {
    layers: [
      {
        type: 'stars',
        count: 350,
        color: '#ddeeff',
        twinkle: 0.8,
        maxSize: 2.0,
        zone: 'full',
      } as StarsLayerConfig,
      {
        type: 'aurora_bands',
        colors: ['#00ff55', '#22ff77', '#00ee44', '#44ffaa'],
        bandCount: 4,
        heightRatio: 0.5,
        opacity: 0.7,
        waveSpeed: 0.0002,
        waveAmplitude: 38,
        bandWidth: 52,
      } as AuroraBandsLayerConfig,
    ],
    contentShield: { enabled: false, color: 'transparent' },
  },
}
