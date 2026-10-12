/**
 * src/theme-engine/configs/testTheme.ts
 *
 * Thème de test composé de 3 briques simples pour valider l'architecture :
 * 1. gradient_sky (Couche Fond)
 * 2. parallax_plane (Couche Intermédiaire Parallaxe)
 * 3. instanced_particles (Couche Particules Organiques)
 * + post_processing_overlay (Vignettage et grain cinématographique)
 * + Événement rare : Pulsation d'éclat périodique
 */

import type { ThemeEngineConfig } from '../types'

export const TEST_THEME_CONFIG: ThemeEngineConfig = {
  id: 'test_ambient',
  name: 'Laboratoire Test V2',
  family: 'classics',
  intrinsicIntensity: 2,
  palette: {
    primary: '#00f0ff',       // Cyan néon
    secondary: '#0f172a',     // Bleu nuit profond
    accent: '#ec4899',        // Rose vibrant signature
    ambientLight: '#1e293b',
    fogColor: '#090d16',
  },
  signature: {
    title: 'Horizon Synthwave & Nuée de Braises Cosmiques',
    brickId: 'particles_stream',
    description: 'Crête procédurale décalée en profondeur avec braises réactives à la souris.',
  },
  layers: [
    {
      category: 'background',
      bricks: [
        {
          id: 'sky_ambient',
          brickType: 'gradient_sky',
          props: {
            speed: 0.25,
            noiseScale: 1.2,
            noiseIntensity: 0.12,
          },
        },
      ],
    },
    {
      category: 'intermediate',
      bricks: [
        {
          id: 'parallax_ridge',
          brickType: 'parallax_plane',
          props: {
            depthZ: -8,
            parallaxFactor: 0.45,
            ridgeFrequency: 1.6,
            ridgeHeight: 0.45,
            opacity: 0.85,
          },
        },
      ],
    },
    {
      category: 'particles',
      bricks: [
        {
          id: 'particles_stream',
          brickType: 'instanced_particles',
          props: {
            count: 140,
            speedY: -0.35,
            speedX: 0.04,
            turbulenceStrength: 0.4,
            turbulenceScale: 0.2,
            depthRange: [-10, 1],
            sizeRange: [0.08, 0.22],
            mouseRepulsion: 0.8,
            shape: 'circle',
            colorMode: 'mixed',
          },
        },
      ],
    },
    {
      category: 'overlay',
      bricks: [
        {
          id: 'overlay_cinema',
          brickType: 'post_processing_overlay',
          props: {
            vignetteDarkness: 0.4,
            vignetteOffset: 1.2,
            grainIntensity: 0.035,
            bloomSoftness: 0.06,
          },
        },
      ],
    },
  ],
  rareEvents: [
    {
      id: 'cosmic_pulse',
      type: 'light_flicker',
      minIntervalSeconds: 15,
      maxIntervalSeconds: 30,
      probability: 0.9,
      durationSeconds: 2.5,
      params: {
        intensityBoost: 2.0,
      },
    },
  ],
  interaction: {
    mouseParallaxStrength: 0.2,
    scrollDepthFactor: 0.15,
    gyroscopeEnabled: true,
  },
  contentShield: {
    autoRegulateWcag: true,
    minContrastRatio: 4.5,
  },
  welcomeIntro: {
    enabled: true,
    titlePrefix: 'Bienvenue dans',
    titleDisplay: 'Le Moteur V2',
    introAnimation: 'surge_particles',
    durationSeconds: 3.5,
  },
}
