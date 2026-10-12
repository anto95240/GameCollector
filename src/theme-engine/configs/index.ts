/**
 * src/theme-engine/configs/index.ts
 *
 * Registre et chargeur à la demande des configurations de thèmes.
 */

import { getAllThemes } from '@/config/themeRegistry'

import type { ThemeEngineConfig } from '../types'
import { TEST_THEME_CONFIG } from './testTheme'

// Table des configurations chargées en mémoire
const themeConfigsMap: Record<string, ThemeEngineConfig> = {
  test_ambient: TEST_THEME_CONFIG,
  // Thème de test également associé à 'neon_night' par défaut pour les tests
  neon_night: {
    ...TEST_THEME_CONFIG,
    id: 'neon_night',
    name: 'Neon Night V2',
  },
}

/**
 * Charge la configuration d'un thème à la demande.
 * Si le thème n'a pas encore de configuration spécifique dans le moteur V2,
 * génère dynamiquement une configuration de base s'appuyant sur ses 2 couleurs canoniques.
 */
export async function getThemeConfig(themeId: string): Promise<ThemeEngineConfig> {
  if (themeConfigsMap[themeId]) {
    return themeConfigsMap[themeId]
  }

  // Vérifier si c'est un thème existant dans themeRegistry
  const allThemes = getAllThemes()
  const found = allThemes.find((t) => t.id === themeId)

  if (found) {
    const primary = found.colors[0] || '#00f0ff'
    const secondary = found.colors[1] || '#0f172a'

    // Configuration adaptative automatique basée sur les briques du catalogue
    const generatedConfig: ThemeEngineConfig = {
      id: found.id,
      name: found.name,
      family: 'classics',
      intrinsicIntensity: 1,
      palette: {
        primary,
        secondary,
        accent: primary,
        ambientLight: secondary,
        fogColor: secondary,
      },
      signature: {
        title: `Ambiance ${found.name}`,
        brickId: 'sky_ambient',
        description: `Génération procédurale basée sur la palette ${primary} / ${secondary}`,
      },
      layers: [
        {
          category: 'background',
          bricks: [
            {
              id: 'sky_ambient',
              brickType: 'gradient_sky',
              props: {
                speed: 0.15,
                noiseScale: 1.0,
                noiseIntensity: 0.08,
              },
            },
          ],
        },
        {
          category: 'particles',
          bricks: [
            {
              id: 'particles_subtle',
              brickType: 'instanced_particles',
              props: {
                count: 60,
                speedY: -0.2,
                speedX: 0.02,
                turbulenceStrength: 0.25,
                depthRange: [-8, 0],
                sizeRange: [0.06, 0.16],
                mouseRepulsion: 0.5,
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
                vignetteDarkness: 0.35,
                vignetteOffset: 1.2,
                grainIntensity: 0.025,
                bloomSoftness: 0.04,
              },
            },
          ],
        },
      ],
      interaction: {
        mouseParallaxStrength: 0.15,
        scrollDepthFactor: 0.1,
        gyroscopeEnabled: true,
      },
      contentShield: {
        autoRegulateWcag: true,
        minContrastRatio: 4.5,
      },
    }

    themeConfigsMap[themeId] = generatedConfig
    return generatedConfig
  }

  // Fallback universel
  return TEST_THEME_CONFIG
}
