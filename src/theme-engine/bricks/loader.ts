/**
 * src/theme-engine/bricks/loader.ts
 *
 * Chargeur dynamique des briques par groupe fonctionnel.
 * Permet de ne charger via import() dynamique QUE les groupes de briques
 * sollicités par le thème actif, réduisant drastiquement le bundle initial.
 */

import { BrickRegistry } from './registry'

export type BrickGroup =
  | 'background'
  | 'parallax'
  | 'atmosphere'
  | 'particles'
  | 'events'
  | 'overlay'
  | 'special'

/**
 * Table de correspondance entre chaque type canonique (ou alias) et son groupe.
 */
export const BRICK_TYPE_TO_GROUP: Record<string, BrickGroup> = {
  // 1. Fonds (Background)
  gradient_sky: 'background',
  fbm_clouds: 'background',
  nebula: 'background',
  multilayer_starfield: 'background',
  aurora: 'background',
  water_caustics: 'background',
  waves: 'background',
  lava_flow: 'background',
  dunes: 'background',

  // 2. Intermédiaires & Parallaxe (Parallax)
  parallax_plane: 'parallax',
  parallax_forest: 'parallax',
  parallax_mountains: 'parallax',
  parallax_city: 'parallax',
  parallax_castle: 'parallax',
  parallax_fleet: 'parallax',
  parallax_pixel_tiles: 'parallax',

  // 3. Atmosphère (Atmosphere)
  noisy_fog: 'atmosphere',
  god_rays: 'atmosphere',
  flickering_light: 'atmosphere',
  heat_distortion: 'atmosphere',
  volumetric_glow: 'atmosphere',
  lens_flare: 'atmosphere',

  // 4. Particules (Particles)
  instanced_particles: 'particles',
  embers: 'particles',
  ash: 'particles',
  snow: 'particles',
  rain: 'particles',
  dust: 'particles',
  fireflies: 'particles',
  bubbles: 'particles',
  leaves: 'particles',
  sparks: 'particles',
  petals: 'particles',
  confetti: 'particles',
  smoke: 'particles',

  // 5. Événements (Events)
  lightning: 'events',
  shooting_star: 'events',
  wind_gust: 'events',
  shockwave: 'events',
  glitch: 'events',
  screen_shake: 'events',

  // 6. Overlay & Post-processing (Overlay)
  post_processing_overlay: 'overlay',
  film_grain: 'overlay',
  grain: 'overlay',
  vignette: 'overlay',
  vignettage: 'overlay',
  crt_scanlines: 'overlay',
  scanlines: 'overlay',
  halftone: 'overlay',
  comic_halftone: 'overlay',
  pixelation: 'overlay',
  pixelisation: 'overlay',
  chromatic_aberration: 'overlay',
  aberration_chromatique: 'overlay',

  // 7. Spéciaux (Special)
  neon_grid: 'special',
  code_rain: 'special',
  hex_grid: 'special',
  line_constellation: 'special',
}

/**
 * Correspondance catégorie de couche vers groupe de secours
 */
export const CATEGORY_TO_GROUP: Record<string, BrickGroup> = {
  background: 'background',
  intermediate: 'parallax',
  parallax: 'parallax',
  atmosphere: 'atmosphere',
  particles: 'particles',
  events: 'events',
  overlay: 'overlay',
  special: 'special',
}

const loadedGroups = new Set<BrickGroup>()
const groupPromises = new Map<BrickGroup, Promise<void>>()

/**
 * Charge un groupe de briques en import dynamique.
 */
export async function loadBrickGroup(group: BrickGroup): Promise<void> {
  if (loadedGroups.has(group)) {
    return
  }
  const pending = groupPromises.get(group)
  if (pending) {
    return pending
  }

  const promise = (async () => {
    switch (group) {
      case 'background':
        await import('./background')
        break
      case 'parallax':
        await import('./parallax')
        break
      case 'atmosphere':
        await import('./atmosphere')
        break
      case 'particles':
        await import('./particles')
        break
      case 'events':
        await import('./events')
        break
      case 'overlay':
        await import('./overlay')
        break
      case 'special':
        await import('./special')
        break
    }
    loadedGroups.add(group)
  })().finally(() => {
    groupPromises.delete(group)
  })

  groupPromises.set(group, promise)
  return promise
}

/**
 * Charge dynamiquement tous les groupes de briques nécessaires pour un ensemble
 * de types de briques demandés par un thème.
 */
export async function ensureBricksForTheme(
  brickTypes: Iterable<string>,
  layerCategories?: Iterable<string>
): Promise<void> {
  const groupsToLoad = new Set<BrickGroup>()

  for (const type of brickTypes) {
    if (BrickRegistry.has(type)) {
      continue
    }
    const group = BRICK_TYPE_TO_GROUP[type]
    if (group && !loadedGroups.has(group)) {
      groupsToLoad.add(group)
    }
  }

  if (layerCategories) {
    for (const cat of layerCategories) {
      const group = CATEGORY_TO_GROUP[cat]
      if (group && !loadedGroups.has(group)) {
        groupsToLoad.add(group)
      }
    }
  }

  if (groupsToLoad.size > 0) {
    await Promise.all(Array.from(groupsToLoad).map((group) => loadBrickGroup(group)))
  }
}

/**
 * Précharge l'intégralité des briques du moteur (mode préchargé, notamment pour ThemePreview).
 */
export async function loadAllBrickGroups(): Promise<void> {
  const allGroups: BrickGroup[] = [
    'background',
    'parallax',
    'atmosphere',
    'particles',
    'events',
    'overlay',
    'special',
  ]
  await Promise.all(allGroups.map((g) => loadBrickGroup(g)))
}

/**
 * Vérifie si un groupe de briques a déjà été chargé.
 */
export function isBrickGroupLoaded(group: BrickGroup): boolean {
  return loadedGroups.has(group)
}
