/**
 * src/theme-engine/types.ts
 *
 * Schéma TypeScript et types canoniques pour le moteur d'animation de thèmes.
 */

import type * as THREE from 'three'

export type ThemeFamily =
  | 'classics'
  | 'seasons'
  | 'gaming'
  | 'cinema'
  | 'heroes'
  | 'universes'
  | 'realworld'

export type AnimationIntensity = 1 | 2 | 3

export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW'

export type LayerCategory =
  | 'background'      // Couche 1 : Fond, ciel, dégradé profond
  | 'intermediate'    // Couche 2 : Décors intermédiaires avec parallaxe
  | 'particles'       // Couche 3 : Éléments mobiles (particules, braises, gouttes)
  | 'atmosphere'      // Couche 4 : Lumière, brume volumétrique, aurore, rayons
  | 'overlay'         // Couche 5 : Grain cinéma, vignettage, bloom subtil

export interface PaletteConfig {
  primary: string                   // Couleur dominante principale (ex: #00f0ff)
  secondary: string                 // Teinte secondaire (ex: #0068ac)
  accent: string                    // Accent signature / reflets (ex: #ff007f)
  ambientLight: string              // Teinte de la lumière ambiante
  fogColor?: string                 // Teinte de diffusion atmosphérique
}

export interface SharedUniforms {
  uTime: { value: number }
  uResolution: { value: THREE.Vector2 }
  uMouse: { value: THREE.Vector2 }
  uScroll: { value: number }
  uPalettePrimary: { value: THREE.Color }
  uPaletteSecondary: { value: THREE.Color }
  uPaletteAccent: { value: THREE.Color }
  uQualityTier: { value: number }   // 0 = LOW, 1 = MEDIUM, 2 = HIGH
  uTimeScale: { value: number }
  uTransitionProgress: { value: number }
}

export interface InteractionState {
  mouseX: number          // Normalisé [-1, 1] amorti
  mouseY: number          // Normalisé [-1, 1] amorti
  targetMouseX: number    // Cible brute
  targetMouseY: number    // Cible brute
  scrollY: number          // Défilement lissé
  tiltX: number           // Gyroscope mobile amorti
  tiltY: number           // Gyroscope mobile amorti
}

export interface BrickConfig<TProps = Record<string, unknown>> {
  id: string                          // Identifiant unique dans la scène
  brickType: string                   // Nom de la brique (ex: 'instanced_particles')
  enabled?: boolean
  renderOrder?: number                // Ordre de rendu dans la couche
  props: TProps                       // Propriétés spécifiques de la brique
}

export interface RareEventTrigger {
  id: string
  type: 'lightning' | 'shooting_star' | 'wind_gust' | 'light_flicker' | 'aurora_surge'
  minIntervalSeconds: number          // Temps minimum entre deux occurrences
  maxIntervalSeconds: number          // Temps maximum
  probability: number                 // 0 à 1 (chance par cycle d'évaluation)
  durationSeconds: number             // Durée de l'effet
  params?: Record<string, unknown>    // Couleurs, intensités, cibles
}

export interface InteractionProfile {
  mouseParallaxStrength: number       // Facteur d'influence de la souris (ex: 0.15)
  scrollDepthFactor: number           // Facteur d'influence du défilement de page
  gyroscopeEnabled: boolean           // Réactivité à l'inclinaison mobile
  targetBrickId?: string              // Brique réagissant directement au pointeur
}

export interface ContentShieldConfig {
  autoRegulateWcag: boolean           // Si true, calcule automatiquement l'opacité selon le fond
  minContrastRatio?: number           // Ratio WCAG cible (4.5 par défaut pour AA)
  blurRadiusPx?: number               // Flou d'arrière-plan optionnel (backdrop-filter)
  tintColor?: string                  // Couleur d'atténuation optionnelle
  baseOpacity?: number                // Opacité de secours si autoRegulateWcag = false
}

export interface WelcomeIntroConfig {
  enabled: boolean
  titlePrefix?: string                // Ex: "Bienvenue à"
  titleDisplay: string                // Ex: "Poudlard" ou "Néo-Tokyo"
  googleFont?: {
    family: string
    url?: string
  }
  introAnimation: 'surge_particles' | 'aurora_sweep' | 'light_pulse' | 'shockwave' | 'scan_glitch'
  durationSeconds: number             // Typiquement 3.5 à 4 secondes
}

export interface ThemeSignatureElement {
  title: string                       // Ex: "Rayons boréaux et braises cosmiques"
  brickId: string                     // Brique associée
  description: string                 // Synthèse artistique
}

export interface ThemeEngineConfig {
  id: string                          // ID canonique issu de themeRegistry (ex: 'neon_night')
  name?: string
  family: ThemeFamily
  intrinsicIntensity: AnimationIntensity // Niveau 1, 2 ou 3 défini par la DA
  palette: PaletteConfig
  signature: ThemeSignatureElement    // Élément signature unique (règle qualité)
  layers: {
    category: LayerCategory
    bricks: BrickConfig[]
  }[]
  rareEvents?: RareEventTrigger[]     // Événements rares et asynchrones
  interaction: InteractionProfile     // Profil d'interactivité
  contentShield: ContentShieldConfig  // Régulateur d'accessibilité WCAG AA
  welcomeIntro?: WelcomeIntroConfig   // Animation d'introduction à l'activation du thème
}

export interface IBrickInstance {
  readonly id: string
  readonly type: string
  init: (scene: THREE.Scene, camera: THREE.Camera, sharedUniforms: SharedUniforms) => void
  update: (delta: number, time: number, interaction: InteractionState, quality: QualityTier) => void
  onResize?: (width: number, height: number, dpr: number) => void
  onQualityChange?: (quality: QualityTier) => void
  triggerEvent?: (event: RareEventTrigger) => void
  triggerIntro?: (introType: string, progress: number) => void
  updateProps?: (props: Record<string, unknown>) => void
  dispose: () => void
}

export interface BrickContext {
  id: string
  scene: THREE.Scene
  camera: THREE.Camera
  sharedUniforms: SharedUniforms
  quality: QualityTier
}

export interface IBrickDefinition<TProps = any> {
  readonly type: string
  readonly category: LayerCategory
  readonly minIntensityRequired?: AnimationIntensity
  create: (id: string, props: TProps, context: BrickContext) => IBrickInstance
}
