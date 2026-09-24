/**
 * themeRegistry.ts — Source unique de vérité (Sous-étape 1a)
 *
 * Ce fichier est LA source d'autorité pour TOUS les thèmes de l'application.
 * Il remplace la duplication entre themeData.ts (catégories + couleurs)
 * et themeRules.ts (règles de déblocage).
 *
 * Les fichiers themeData.ts et themeRules.ts dérivent désormais leurs exports
 * depuis ce registre, garantissant la cohérence sans breaking change.
 *
 * Points d'attention documentés (à corriger en sous-étapes ultérieures) :
 *   - Les IDs divergents (andy_s_room/andys_room etc.) sont conservés à l'identique
 *     jusqu'à la décision de standardisation (Phase 1b/1c).
 *   - Les doublons de themeRules.ts (lignes 189-274 de l'original) sont consolidés
 *     ici en une seule entrée par thème, avec la définition la plus complète retenue.
 *   - La clé fantôme "nom_du_theme" est absente de ce registre.
 */

import { ExternalGameDetails } from '@/services/externalApiService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeUnlockRule {
  /** Texte lisible décrivant la condition */
  condition: string
  /** Valeur maximale pour les paliers de collection (1 pour trophées/événements) */
  max: number
  /** Évalue la progression à partir de la liste de jeux */
  evaluate: (games: ExternalGameDetails[]) => number
}

export interface ThemeEntry {
  /** Identifiant technique unique, correspond au data-preset CSS et à l'id_name Supabase */
  id: string
  /** Nom affiché */
  name: string
  /** [couleur de fond, couleur d'accent] pour la prévisualisation */
  colors: [string, string]
  /** Identifiant de la catégorie parente */
  categoryId: string
  /** Titre de la catégorie parente */
  categoryTitle: string
  /** Règle de déblocage */
  rule: ThemeUnlockRule
}

export interface ThemeCategoryEntry {
  id: string
  title: string
  themes: ThemeEntry[]
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/** Crée une règle "trophée" (simulée via le système d'achievements) */
const byTrophy = (trophy: string): ThemeUnlockRule => ({
  condition: `Trophée \`${trophy}\``,
  max: 1,
  evaluate: () => 0,
})

/** Crée une règle "saisonnier/événementiel" */
const seasonal = (label: 'Saisonnière' | 'Événementielle'): ThemeUnlockRule => ({
  condition: label,
  max: 1,
  evaluate: () => 0,
})

/** Crée une règle "collection de jeux par genre" */
const byGenre = (genre: string, count: number): ThemeUnlockRule => ({
  condition: `Ajouter ${count} jeu${count > 1 ? 'x' : ''} "${genre}"`,
  max: count,
  evaluate: (games) =>
    games.filter(
      (g) =>
        g.name.toLowerCase().includes(genre.toLowerCase()) ||
        g.genres?.some((gen) => gen.toLowerCase().includes(genre.toLowerCase())) ||
        g.tags?.some((t) => t.toLowerCase().includes(genre.toLowerCase()))
    ).length,
})

/** Crée une règle "jeu spécifique par franchise" */
const byGame = (franchise: string, count: number): ThemeUnlockRule => ({
  condition: `Ajouter ${count} jeu${count > 1 ? 'x' : ''} : ${franchise}`,
  max: count,
  evaluate: (games) =>
    games.filter(
      (g) =>
        g.name.toLowerCase().includes(franchise.toLowerCase()) ||
        g.genres?.some((gen) => gen.toLowerCase().includes(franchise.toLowerCase())) ||
        g.tags?.some((t) => t.toLowerCase().includes(franchise.toLowerCase()))
    ).length,
})

/** Crée une règle "par palier de jeux (simulé)" */
const byCount = (description: string, count: number): ThemeUnlockRule => ({
  condition: description,
  max: count,
  evaluate: () => 0,
})

/** Crée une règle "par condition texte libre" (simulé) */
const byFreeCondition = (description: string): ThemeUnlockRule => ({
  condition: description,
  max: 1,
  evaluate: () => 0,
})

// ---------------------------------------------------------------------------
// Registre complet
// ---------------------------------------------------------------------------

export const THEME_REGISTRY: ThemeCategoryEntry[] = [
  // -------------------------------------------------------------------------
  // 1. Thèmes Classiques (18)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_classiques_16_id_es',
    title: '🖥️ Thèmes Classiques (16 idées)',
    themes: [
      {
        id: 'neon_night',
        name: 'Neon Night',
        colors: ['#001128', '#0068ac'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: { condition: 'Thème par défaut', max: 1, evaluate: () => 0 },
      },
      {
        id: 'arctic_day',
        name: 'Arctic Day',
        colors: ['#f0f5fa', '#0068ac'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: { condition: 'Thème par défaut', max: 1, evaluate: () => 0 },
      },
      {
        id: 'emerald_city',
        name: 'Emerald City',
        colors: ['#f8fafc', '#059669'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_amethyst'),
      },
      {
        id: 'coral_reef',
        name: 'Coral Reef',
        colors: ['#082f49', '#ff6b6b'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_abyss'),
      },
      {
        id: 'ember',
        name: 'Ember',
        colors: ['#7f1d1d', '#ea580c'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dune'),
      },
      {
        id: 'arctic_neon',
        name: 'Arctic Neon',
        colors: ['#f8fafc', '#00f0ff'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_cyberpunk'),
      },
      {
        id: 'gold_rush',
        name: 'Gold Rush',
        colors: ['#f8fafc', '#f59e0b'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dune'),
      },
      {
        id: 'midnight_ocean',
        name: 'Midnight Ocean',
        colors: ['#020617', '#06b6d4'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_abyss'),
      },
      {
        id: 'ocean_deep',
        name: 'Ocean Deep',
        colors: ['#003459', '#00b4d8'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_abyss'),
      },
      {
        id: 'lava',
        name: 'Lava',
        colors: ['#020617', '#ff4500'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dracula'),
      },
      {
        id: 'forest_dark',
        name: 'Forest Dark',
        colors: ['#064e3b', '#065f46'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dracula'),
      },
      {
        id: 'parchment',
        name: 'Parchment',
        colors: ['#fef3c7', '#b45309'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_amethyst'),
      },
      {
        id: 'ice_cave',
        name: 'Ice Cave',
        colors: ['#f8fafc', '#a5f3fc'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_arctic'),
      },
      {
        id: 'aurora',
        name: 'Aurora',
        colors: ['#020617', '#10b981'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_neon'),
      },
      {
        id: 'desert_night',
        name: 'Desert Night',
        colors: ['#0f172a', '#d97706'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dune'),
      },
      {
        id: 'vapor',
        name: 'Vapor',
        colors: ['#f8fafc', '#0ea5e9'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_neon'),
      },
      {
        id: 'champagne',
        name: 'Champagne',
        colors: ['#f8fafc', '#eab308'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_amethyst'),
      },
      {
        id: 'inferno',
        name: 'Inferno',
        colors: ['#020617', '#ef4444'],
        categoryId: 'th_mes_classiques_16_id_es',
        categoryTitle: '🖥️ Thèmes Classiques (16 idées)',
        rule: byTrophy('theme_dracula'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Thèmes Saisonniers & Événementiels (9)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
    title: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
    themes: [
      {
        id: 'halloween',
        name: 'Halloween',
        colors: ['#020617', '#f97316'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Événementielle'),
      },
      {
        id: 'christmas',
        name: 'Christmas',
        colors: ['#450a0a', '#22c55e'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Événementielle'),
      },
      {
        id: 'spring',
        name: 'Spring',
        colors: ['#064e3b', '#ec4899'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Saisonnière'),
      },
      {
        id: 'easter',
        name: 'Easter',
        colors: ['#fef08a', '#8b5cf6'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Événementielle'),
      },
      {
        id: 'summer',
        name: 'Summer',
        colors: ['#082f49', '#eab308'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Saisonnière'),
      },
      {
        id: 'winter',
        name: 'Winter',
        colors: ['#020617', '#0ea5e9'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Saisonnière'),
      },
      {
        id: 'autumn',
        name: 'Autumn',
        colors: ['#450a0a', '#d97706'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Saisonnière'),
      },
      {
        id: 'chandeleur',
        name: 'Chandeleur',
        colors: ['#fef08a', '#8b4513'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Événementielle'),
      },
      {
        id: 'epiphanie',
        name: 'Epiphanie',
        colors: ['#334155', '#eab308'],
        categoryId: 'th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s',
        categoryTitle: '🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)',
        rule: seasonal('Événementielle'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Thèmes Gaming / Univers (4)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_gaming_univers',
    title: '🎮 Thèmes Gaming / Univers',
    themes: [
      {
        id: 'retro_pixel',
        name: 'Retro Pixel',
        colors: ['#000000', '#00ff00'],
        categoryId: 'th_mes_gaming_univers',
        categoryTitle: '🎮 Thèmes Gaming / Univers',
        rule: byTrophy('retro_gamer'),
      },
      {
        id: 'ps2_era',
        name: 'PS2 Era',
        colors: ['#000000', '#00439c'],
        categoryId: 'th_mes_gaming_univers',
        categoryTitle: '🎮 Thèmes Gaming / Univers',
        rule: byTrophy('guerre_consoles'),
      },
      {
        id: 'game_boy',
        name: 'Game Boy',
        colors: ['#787b82', '#8bac0f'],
        categoryId: 'th_mes_gaming_univers',
        categoryTitle: '🎮 Thèmes Gaming / Univers',
        rule: byTrophy('nostalgie'),
      },
      {
        id: 'retro_arcade',
        name: 'Retro Arcade',
        colors: ['#000000', '#facc15'],
        categoryId: 'th_mes_gaming_univers',
        categoryTitle: '🎮 Thèmes Gaming / Univers',
        rule: byTrophy('shortcut_master'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Thèmes Géographiques / Culturels (4)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_g_ographiques_culturels',
    title: '🌍 Thèmes Géographiques / Culturels',
    themes: [
      {
        id: 'egypte_antique',
        name: 'Egypte Antique',
        colors: ['#fef3c7', '#d4a853'],
        categoryId: 'th_mes_g_ographiques_culturels',
        categoryTitle: '🌍 Thèmes Géographiques / Culturels',
        rule: byGenre('Aventure', 3),
      },
      {
        id: 'viking_norse',
        name: 'Viking Norse',
        colors: ['#334155', '#991b1b'],
        categoryId: 'th_mes_g_ographiques_culturels',
        categoryTitle: '🌍 Thèmes Géographiques / Culturels',
        rule: byTrophy('shortcut_pro'),
      },
      {
        id: 'tundra',
        name: 'Tundra',
        colors: ['#f8fafc', '#0ea5e9'],
        categoryId: 'th_mes_g_ographiques_culturels',
        categoryTitle: '🌍 Thèmes Géographiques / Culturels',
        rule: byGenre('Aventure', 4),
      },
      {
        id: 'andalousie',
        name: 'Andalousie',
        colors: ['#fff7ed', '#ea580c'],
        categoryId: 'th_mes_g_ographiques_culturels',
        categoryTitle: '🌍 Thèmes Géographiques / Culturels',
        rule: byGenre('Aventure', 7),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Thèmes Historiques / Fantasy (6)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_historiques_fantasy',
    title: '🏛️ Thèmes Historiques / Fantasy',
    themes: [
      {
        id: 'medieval_kingdom',
        name: 'Medieval Kingdom',
        colors: ['#450a0a', '#eab308'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byTrophy('mon_precieux'),
      },
      {
        id: 'roman_empire',
        name: 'Roman Empire',
        colors: ['#7f1d1d', '#fef3c7'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byTrophy('coup_de_foudre'),
      },
      {
        id: 'age_of_sail',
        name: 'Age of Sail',
        colors: ['#082f49', '#8b4513'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byTrophy('critique_art'),
      },
      {
        id: 'aztec',
        name: 'Aztec',
        colors: ['#14b8a6', '#d4a853'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byTrophy('data_analyst'),
      },
      {
        id: 'elven_forest',
        name: 'Elven Forest',
        colors: ['#064e3b', '#fef08a'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byGenre('RPG', 3),
      },
      {
        id: 'deep_sea',
        name: 'Deep Sea',
        colors: ['#020617', '#06b6d4'],
        categoryId: 'th_mes_historiques_fantasy',
        categoryTitle: '🏛️ Thèmes Historiques / Fantasy',
        rule: byGenre('RPG', 4),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Thèmes Astronomie / Espace / Futurisme (6)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_astronomie_espace_futurisme',
    title: '🌠 Thèmes Astronomie / Espace / Futurisme',
    themes: [
      {
        id: 'nebula',
        name: 'Nebula',
        colors: ['#020617', '#7c3aed'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byTrophy('shortcut_novice'),
      },
      {
        id: 'black_hole',
        name: 'Black Hole',
        colors: ['#000000', '#ea580c'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byTrophy('insomniaque'),
      },
      {
        id: 'quantum',
        name: 'Quantum',
        colors: ['#f8fafc', '#0ea5e9'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byGenre('Science-Fiction', 3),
      },
      {
        id: 'mars_colony',
        name: 'Mars Colony',
        colors: ['#7f1d1d', '#ea580c'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byGenre('Science-Fiction', 4),
      },
      {
        id: 'stargate',
        name: 'Stargate',
        colors: ['#0f172a', '#3b82f6'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byGenre('Science-Fiction', 7),
      },
      {
        id: 'deep_space',
        name: 'Deep Space',
        colors: ['#000000', '#a855f7'],
        categoryId: 'th_mes_astronomie_espace_futurisme',
        categoryTitle: '🌠 Thèmes Astronomie / Espace / Futurisme',
        rule: byGenre('Science-Fiction', 10),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Thèmes Films & Séries (Déblocables via les Jeux) (18)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
    title: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
    themes: [
      {
        id: 'upside_down',
        name: 'Upside Down',
        colors: ['#020617', '#ef4444'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Horreur/Thriller', 1),
      },
      {
        id: 'replicant',
        name: 'Replicant',
        colors: ['#020617', '#0ea5e9'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Cyberpunk', 3),
      },
      {
        id: 'dino_dna',
        name: 'Dino DNA',
        colors: ['#14532d', '#d97706'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGame('Jurassic Park', 1),
      },
      {
        id: 'isla_nublar',
        name: 'Isla Nublar',
        colors: ['#064e3b', '#ea580c'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGame('Jurassic Park', 3),
      },
      {
        id: 'whip_hat',
        name: 'Whip & Hat',
        colors: ['#451a03', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGame('Indiana Jones', 1),
      },
      {
        id: 'delorean',
        name: 'Delorean',
        colors: ['#94a3b8', '#0ea5e9'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byTrophy('voyage_temps'),
      },
      {
        id: 'skynet',
        name: 'Skynet',
        colors: ['#000000', '#ef4444'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGame('Terminator', 1),
      },
      {
        id: 'gargantua',
        name: 'Gargantua',
        colors: ['#000000', '#eab308'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byFreeCondition("Ajouter 2 jeux dans l'Espace"),
      },
      {
        id: 'unsinkable',
        name: 'Unsinkable',
        colors: ['#082f49', '#f8fafc'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Narratifs', 3),
      },
      {
        id: 'butterfly_effect',
        name: 'Butterfly Effect',
        colors: ['#1e293b', '#f8fafc'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Narratifs', 3),
      },
      {
        id: 'walking_sim',
        name: 'Walking Sim',
        colors: ['#ea580c', '#064e3b'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Narratifs', 1),
      },
      {
        id: 'broken_screen',
        name: 'Broken Screen',
        colors: ['#020617', '#94a3b8'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Cyberpunk', 1),
      },
      {
        id: '221b',
        name: '221B',
        colors: ['#1e293b', '#facc15'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Enquête', 1),
      },
      {
        id: 'the_truth',
        name: 'The Truth',
        colors: ['#000000', '#22c55e'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Mystère', 1),
      },
      {
        id: 'reactor_4',
        name: 'Reactor 4',
        colors: ['#334155', '#84cc16'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Post-Apo', 1),
      },
      {
        id: 'dark_passenger',
        name: 'Dark Passenger',
        colors: ['#f8fafc', '#ef4444'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Horreur/Sanglant', 1),
      },
      {
        id: 'nakatomi',
        name: 'Nakatomi',
        colors: ['#334155', '#ea580c'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Action', 1),
      },
      {
        id: 'proton_pack',
        name: 'Proton Pack',
        colors: ['#000000', '#84cc16'],
        categoryId: 'th_mes_films_s_ries_d_blocables_via_les_jeux',
        categoryTitle: '🎬 Thèmes Films & Séries (Déblocables via les Jeux)',
        rule: byGenre('Surnaturel', 1),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Thèmes Jeux Vidéo (6)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_jeux_vid_o',
    title: '🎮 Thèmes Jeux Vidéo',
    themes: [
      {
        id: 'mushroom_kingdom',
        name: 'Mushroom Kingdom',
        colors: ['#ef4444', '#3b82f6'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byTrophy('its_a_me'),
      },
      {
        id: 'kanto',
        name: 'Kanto',
        colors: ['#ef4444', '#ffffff'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byGame('Pokémon', 1),
      },
      {
        id: 'green_hill',
        name: 'Green Hill',
        colors: ['#3b82f6', '#22c55e'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byGame('Sonic', 1),
      },
      {
        id: 'sic_parvis_magna',
        name: 'Sic Parvis Magna',
        colors: ['#451a03', '#d4a853'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byGame('Uncharted', 1),
      },
      {
        id: 'tomb_raider',
        name: 'Tomb Raider',
        colors: ['#451a03', '#14b8a6'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byGame('Tomb Raider', 1),
      },
      {
        id: 'los_santos',
        name: 'Los Santos',
        colors: ['#22c55e', '#ea580c'],
        categoryId: 'th_mes_jeux_vid_o',
        categoryTitle: '🎮 Thèmes Jeux Vidéo',
        rule: byGame('GTA', 1),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. Thèmes Gestion, Nature & Animaux (6)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_gestion_nature_animaux',
    title: '🐾 Thèmes Gestion, Nature & Animaux',
    themes: [
      {
        id: 'cozy_farm',
        name: 'Cozy Farm',
        colors: ['#fef3c7', '#22c55e'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('cozy_farmer'),
      },
      {
        id: 'tycoon',
        name: 'Tycoon',
        colors: ['#2563eb', '#facc15'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('tycoon_master'),
      },
      {
        id: 'aquarium',
        name: 'Aquarium',
        colors: ['#082f49', '#06b6d4'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('zookeeper'),
      },
      {
        id: 'safari_zoo',
        name: 'Safari Zoo',
        colors: ['#fef3c7', '#451a03'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('zookeeper'),
      },
      {
        id: 'city_builder',
        name: 'City Builder',
        colors: ['#334155', '#facc15'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('city_mayor'),
      },
      {
        id: 'jurassic',
        name: 'Jurassic',
        colors: ['#14532d', '#d97706'],
        categoryId: 'th_mes_gestion_nature_animaux',
        categoryTitle: '🐾 Thèmes Gestion, Nature & Animaux',
        rule: byTrophy('dino_dna'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Thèmes Univers Entiers (16)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_univers_entiers',
    title: '🪐 Thèmes Univers Entiers',
    themes: [
      {
        id: 'infinity',
        name: 'Infinity',
        colors: ['#450a0a', '#facc15'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byTrophy('infinity_stones'),
      },
      {
        id: 'multiverse',
        name: 'Multiverse',
        colors: ['#1e3a8a', '#facc15'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byTrophy('justice_league'),
      },
      {
        id: 'galaxy_far_away',
        name: 'Galaxy Far Away',
        colors: ['#000000', '#3b82f6'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byTrophy('may_the_force'),
      },
      {
        id: 'hogwarts',
        name: 'Hogwarts',
        colors: ['#7f1d1d', '#d4a853'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byGame('Harry Potter', 1),
      },
      {
        id: 'forgotten_realms',
        name: 'Forgotten Realms',
        colors: ['#7f1d1d', '#fef3c7'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition("Ajouter 1 jeux : D&D / Baldur's Gate"),
      },
      {
        id: 'arrakis',
        name: 'Arrakis',
        colors: ['#d97706', '#3b82f6'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byGame('Dune', 1),
      },
      {
        id: 'psychohistory',
        name: 'Psychohistory',
        colors: ['#94a3b8', '#3b82f6'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Sci-Fi Spatiale'),
      },
      {
        id: 'the_construct',
        name: 'The Construct',
        colors: ['#000000', '#22c55e'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byGame('Matrix', 1),
      },
      {
        id: 'cybertron',
        name: 'Cybertron',
        colors: ['#ef4444', '#8b5cf6'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byGame('Transformers', 1),
      },
      {
        id: 'forks',
        name: 'Forks',
        colors: ['#475569', '#14532d'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Vampires/Loups-Garous'),
      },
      {
        id: 'pandora',
        name: 'Pandora',
        colors: ['#020617', '#06b6d4'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byGame('Avatar', 1),
      },
      {
        id: 'once_upon_a_dream',
        name: 'Once Upon a Dream',
        colors: ['#ec4899', '#3b82f6'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byTrophy('retro_gamer'),
      },
      {
        id: 'luxo',
        name: 'Luxo',
        colors: ['#3b82f6', '#facc15'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Pixar'),
      },
      {
        id: 'castle_rock',
        name: 'Castle Rock',
        colors: ['#0f172a', '#ef4444'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Horreur/Surnaturel'),
      },
      {
        id: 'wardrobe',
        name: 'Wardrobe',
        colors: ['#f8fafc', '#064e3b'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Fantasy/Narnia'),
      },
      {
        id: 'panem',
        name: 'Panem',
        colors: ['#451a03', '#facc15'],
        categoryId: 'th_mes_univers_entiers',
        categoryTitle: '🪐 Thèmes Univers Entiers',
        rule: byFreeCondition('Ajouter 1 jeux : Survie/Battle Royale'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. Thèmes Super-Héros (Marvel & DC) (14)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_super_h_ros_marvel_dc',
    title: '🦸 Thèmes Super-Héros (Marvel & DC)',
    themes: [
      {
        id: 'web_slinger',
        name: 'Web-Slinger',
        colors: ['#ef4444', '#3b82f6'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byTrophy('spider_web'),
      },
      {
        id: 'the_dark_knight',
        name: 'The Dark Knight',
        colors: ['#000000', '#facc15'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byTrophy('nocturne'),
      },
      {
        id: 'stark_tech',
        name: 'Stark Tech',
        colors: ['#b91c1c', '#facc15'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byTrophy('i_am_iron_man'),
      },
      {
        id: 'man_of_steel',
        name: 'Man of Steel',
        colors: ['#1d4ed8', '#ef4444'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('1 jeu Super-Héros', 1),
      },
      {
        id: 'speed_force',
        name: 'Speed Force',
        colors: ['#b91c1c', '#facc15'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byTrophy('speedrunner'),
      },
      {
        id: 'clown_prince',
        name: 'Clown Prince',
        colors: ['#7c3aed', '#22c55e'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('1 jeu Super-Héros', 1),
      },
      {
        id: 'first_avenger',
        name: 'First Avenger',
        colors: ['#1e3a8a', '#ef4444'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('2 jeux Super-Héros', 2),
      },
      {
        id: 'god_of_thunder',
        name: 'God of Thunder',
        colors: ['#475569', '#ef4444'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('2 jeux Super-Héros', 2),
      },
      {
        id: 'gamma_smash',
        name: 'Gamma Smash',
        colors: ['#14532d', '#7c3aed'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('3 jeux Super-Héros', 3),
      },
      {
        id: 'red_room',
        name: 'Red Room',
        colors: ['#000000', '#ef4444'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('3 jeux Super-Héros', 3),
      },
      {
        id: 'weapon_x',
        name: 'Weapon X',
        colors: ['#facc15', '#3b82f6'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('4 jeux Super-Héros', 4),
      },
      {
        id: 'wakanda_forever',
        name: 'Wakanda Forever',
        colors: ['#000000', '#8b5cf6'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('4 jeux Super-Héros', 4),
      },
      {
        id: 'sorcerer_supreme',
        name: 'Sorcerer Supreme',
        colors: ['#1e3a8a', '#ef4444'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('5 jeux Super-Héros', 5),
      },
      {
        id: 'symbiote',
        name: 'Symbiote',
        colors: ['#000000', '#ffffff'],
        categoryId: 'th_mes_super_h_ros_marvel_dc',
        categoryTitle: '🦸 Thèmes Super-Héros (Marvel & DC)',
        rule: byCount('5 jeux Spider-man', 5),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. Thèmes Disney / Pixar (Par Film) (17)
  // NOTE: ID canonique 'andy_s_room' retenu (aligné sur themeData.ts + Supabase).
  //       Variantes 'andys_room', 'gusteaus', 'ici_cest_paris', 'santagata'
  //       présentes dans themeRules.ts doublon 2 → orphelines documentées.
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_disney_pixar_par_film',
    title: '🏰 Thèmes Disney / Pixar (Par Film)',
    themes: [
      {
        id: 'andy_s_room',
        name: "Andy's Room",
        colors: ['#3b82f6', '#facc15'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('1 jeu Familial/Cartoon', 1),
      },
      {
        id: 'motunui',
        name: 'Motunui',
        colors: ['#0ea5e9', '#fef3c7'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('1 jeu Familial/Cartoon', 1),
      },
      {
        id: 'scare_floor',
        name: 'Scare Floor',
        colors: ['#3b82f6', '#84cc16'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('2 jeux Familial/Cartoon', 2),
      },
      {
        id: 'route_66',
        name: 'Route 66',
        colors: ['#ef4444', '#000000'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('2 jeux Familial/Cartoon', 2),
      },
      {
        id: 'arendelle',
        name: 'Arendelle',
        colors: ['#e0f2fe', '#0ea5e9'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('3 jeux Familial/Cartoon', 3),
      },
      {
        id: 'eac',
        name: 'EAC',
        colors: ['#082f49', '#ea580c'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('3 jeux Familial/Cartoon', 3),
      },
      {
        id: 'agrabah',
        name: 'Agrabah',
        colors: ['#4c1d95', '#d4a853'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('3 jeux Familial/Cartoon', 3),
      },
      {
        id: 'pride_rock',
        name: 'Pride Rock',
        colors: ['#ea580c', '#facc15'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('4 jeux Familial/Cartoon', 4),
      },
      {
        id: 'headquarters',
        name: 'Headquarters',
        colors: ['#facc15', '#3b82f6'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byTrophy('indecis'),
      },
      {
        id: 'enchanted_rose',
        name: 'Enchanted Rose',
        colors: ['#d4a853', '#1e3a8a'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('4 jeux Familial/Cartoon', 4),
      },
      {
        id: 'dragon_warrior',
        name: 'Dragon Warrior',
        colors: ['#991b1b', '#d4a853'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('4 jeux Familial/Cartoon', 4),
      },
      {
        id: 'paradise_falls',
        name: 'Paradise Falls',
        colors: ['#3b82f6', '#22c55e'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('5 jeux Familial/Cartoon', 5),
      },
      {
        id: 'gusteau_s',
        name: "Gusteau's",
        colors: ['#b45309', '#ffffff'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('5 jeux Familial/Cartoon', 5),
      },
      {
        id: 'axiom',
        name: 'Axiom',
        colors: ['#9a3412', '#4ade80'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('5 jeux Familial/Cartoon', 5),
      },
      {
        id: 'olympus',
        name: 'Olympus',
        colors: ['#fef3c7', '#d4a853'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('5 jeux Familial/Cartoon', 5),
      },
      {
        id: 'neverland',
        name: 'Neverland',
        colors: ['#15803d', '#d4a853'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('6 jeux Familial/Cartoon', 6),
      },
      {
        id: 'bella_notte',
        name: 'Bella Notte',
        colors: ['#991b1b', '#0f172a'],
        categoryId: 'th_mes_disney_pixar_par_film',
        categoryTitle: '🏰 Thèmes Disney / Pixar (Par Film)',
        rule: byCount('6 jeux Familial/Cartoon', 6),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 13. Thèmes Clubs de Sport (11)
  // NOTE: ID canonique 'ici_c_est_paris' retenu (aligné sur themeData.ts + Supabase).
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_clubs_de_sport',
    title: '⚽ Thèmes Clubs de Sport',
    themes: [
      {
        id: 'ici_c_est_paris',
        name: "Ici c'est Paris",
        colors: ['#1e3a8a', '#ef4444'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('1 jeu de Football', 1),
      },
      {
        id: 'citizens',
        name: 'Citizens',
        colors: ['#38bdf8', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('1 jeu de Sport', 1),
      },
      {
        id: 'red_devils',
        name: 'Red Devils',
        colors: ['#dc2626', '#000000'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('2 jeux de Sport', 2),
      },
      {
        id: 'ynwa',
        name: 'YNWA',
        colors: ['#ef4444', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('2 jeux de Sport', 2),
      },
      {
        id: 'gunners',
        name: 'Gunners',
        colors: ['#dc2626', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('3 jeux de Sport', 3),
      },
      {
        id: 'los_blancos',
        name: 'Los Blancos',
        colors: ['#ffffff', '#d4a853'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('3 jeux de Sport', 3),
      },
      {
        id: 'blaugrana',
        name: 'Blaugrana',
        colors: ['#1d4ed8', '#991b1b'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('4 jeux de Sport', 4),
      },
      {
        id: 'colchoneros',
        name: 'Colchoneros',
        colors: ['#dc2626', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('5 jeux de Sport', 5),
      },
      {
        id: 'mia_san_mia',
        name: 'Mia San Mia',
        colors: ['#dc2626', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('5 jeux de Sport', 5),
      },
      {
        id: 'bianconeri',
        name: 'Bianconeri',
        colors: ['#000000', '#ffffff'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('7 jeux de Sport', 7),
      },
      {
        id: 'rossoneri',
        name: 'Rossoneri',
        colors: ['#dc2626', '#000000'],
        categoryId: 'th_mes_clubs_de_sport',
        categoryTitle: '⚽ Thèmes Clubs de Sport',
        rule: byCount('8 jeux de Sport', 8),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 14. Thèmes Automobile (Marques Iconiques) (12)
  // NOTE: ID canonique 'sant_agata' retenu (aligné sur themeData.ts + Supabase).
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_automobile_marques_iconiques',
    title: '🏎️ Thèmes Automobile (Marques Iconiques)',
    themes: [
      {
        id: 'pony_car',
        name: 'Pony Car',
        colors: ['#1e3a8a', '#ef4444'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('1 jeu de Course', 1),
      },
      {
        id: 'm_power',
        name: 'M-Power',
        colors: ['#ffffff', '#3b82f6'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('1 jeu de Course', 1),
      },
      {
        id: 'quattro',
        name: 'Quattro',
        colors: ['#475569', '#ef4444'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('2 jeux de Course', 2),
      },
      {
        id: 'silver_star',
        name: 'Silver Star',
        colors: ['#94a3b8', '#0f172a'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('2 jeux de Course', 2),
      },
      {
        id: 'stingray',
        name: 'Stingray',
        colors: ['#ef4444', '#000000'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('3 jeux de Course', 3),
      },
      {
        id: 'carrera',
        name: 'Carrera',
        colors: ['#94a3b8', '#ef4444'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('3 jeux de Course', 3),
      },
      {
        id: 'rosso_corsa',
        name: 'Rosso Corsa',
        colors: ['#dc2626', '#facc15'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('4 jeux de Course', 4),
      },
      {
        id: 'sant_agata',
        name: "Sant'Agata",
        colors: ['#bef264', '#000000'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('5 jeux de Course', 5),
      },
      {
        id: 'db_series',
        name: 'DB Series',
        colors: ['#064e3b', '#94a3b8'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('5 jeux de Course', 5),
      },
      {
        id: 'flying_b',
        name: 'Flying B',
        colors: ['#14532d', '#fef3c7'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('7 jeux de Course', 7),
      },
      {
        id: 'molsheim',
        name: 'Molsheim',
        colors: ['#1d4ed8', '#000000'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('8 jeux de Course', 8),
      },
      {
        id: 'spirit_of_ecstasy',
        name: 'Spirit of Ecstasy',
        colors: ['#000000', '#f8fafc'],
        categoryId: 'th_mes_automobile_marques_iconiques',
        categoryTitle: '🏎️ Thèmes Automobile (Marques Iconiques)',
        rule: byCount('10 jeux de Course', 10),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 15. Thèmes Films & Séries (Par Défaut ou Actions) (26)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_films_s_ries_par_d_faut_ou_actions',
    title: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
    themes: [
      {
        id: 'danger_zone',
        name: 'Danger Zone',
        colors: ['#38bdf8', '#ea580c'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_neon'),
      },
      {
        id: 'winden',
        name: 'Winden',
        colors: ['#475569', '#facc15'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_dracula'),
      },
      {
        id: 'berk',
        name: 'Berk',
        colors: ['#14532d', '#ef4444'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_amethyst'),
      },
      {
        id: 'phone_home',
        name: 'Phone Home',
        colors: ['#0f172a', '#ef4444'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('appel_maison'),
      },
      {
        id: 'mystery_machine',
        name: 'Mystery Machine',
        colors: ['#86efac', '#0ea5e9'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('tag_master'),
      },
      {
        id: 'flux',
        name: 'Flux',
        colors: ['#e0f2fe', '#000000'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('import_export'),
      },
      {
        id: 'street_football',
        name: 'Street Football',
        colors: ['#94a3b8', '#facc15'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('multi_device'),
      },
      {
        id: 'lasagna',
        name: 'Lasagna',
        colors: ['#ea580c', '#000000'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('coup_de_foudre'),
      },
      {
        id: 'cambrioleur',
        name: 'Cambrioleur',
        colors: ['#000000', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_amethyst'),
      },
      {
        id: 'glade',
        name: 'Glade',
        colors: ['#15803d', '#94a3b8'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_dune'),
      },
      {
        id: '007',
        name: '007',
        colors: ['#000000', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('agent_secret'),
      },
      {
        id: 'manners',
        name: 'Manners',
        colors: ['#1e3a8a', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('critique_art'),
      },
      {
        id: 'flight_828',
        name: 'Flight 828',
        colors: ['#0f172a', '#94a3b8'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('data_analyst'),
      },
      {
        id: 'sarsaparilla',
        name: 'Sarsaparilla',
        colors: ['#3b82f6', '#ffffff'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_abyss'),
      },
      {
        id: 'potion_magique',
        name: 'Potion Magique',
        colors: ['#ef4444', '#15803d'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('theme_dune'),
      },
      {
        id: 'reporter',
        name: 'Reporter',
        colors: ['#3b82f6', '#451a03'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byTrophy('mon_precieux'),
      },
      {
        id: 'imhotep',
        name: 'Imhotep',
        colors: ['#fde047', '#000000'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Égypte/Momies'),
      },
      {
        id: 'ahkmenrah',
        name: 'Ahkmenrah',
        colors: ['#0f172a', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Musée/Histoire'),
      },
      {
        id: 'kevin',
        name: 'Kevin!',
        colors: ['#ef4444', '#15803d'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeu Défense/Pièges'),
      },
      {
        id: 'slappy',
        name: 'Slappy',
        colors: ['#84cc16', '#000000'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Horreur Familiale'),
      },
      {
        id: 'lv_426',
        name: 'LV-426',
        colors: ['#84cc16', '#000000'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Horreur Spatiale'),
      },
      {
        id: 'welcome_to_earth',
        name: 'Welcome to Earth',
        colors: ['#0ea5e9', '#84cc16'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Invasion'),
      },
      {
        id: 'street_racing',
        name: 'Street Racing',
        colors: ['#000000', '#0ea5e9'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Course Urbaine'),
      },
      {
        id: 'imf',
        name: 'IMF',
        colors: ['#000000', '#84cc16'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Espionnage'),
      },
      {
        id: 'jungle_board',
        name: 'Jungle Board',
        colors: ['#15803d', '#d4a853'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Aventure Jungle'),
      },
      {
        id: 'neuralyzer',
        name: 'Neuralyzer',
        colors: ['#000000', '#ffffff'],
        categoryId: 'th_mes_films_s_ries_par_d_faut_ou_actions',
        categoryTitle: '🍿 Thèmes Films & Séries (Par Défaut ou Actions)',
        rule: byFreeCondition('Ajouter 1 jeux Extraterrestres'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 16. Thèmes Catastrophes Naturelles (Méta) (6)
  // -------------------------------------------------------------------------
  {
    id: 'th_mes_catastrophes_naturelles_m_ta',
    title: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
    themes: [
      {
        id: 'eruption',
        name: 'Eruption',
        colors: ['#000000', '#ea580c'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('theme_dracula'),
      },
      {
        id: 'tsunami',
        name: 'Tsunami',
        colors: ['#082f49', '#0ea5e9'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('theme_dracula'),
      },
      {
        id: 'twister',
        name: 'Twister',
        colors: ['#94a3b8', '#000000'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('speedrunner'),
      },
      {
        id: 'whiteout',
        name: 'Whiteout',
        colors: ['#f8fafc', '#0ea5e9'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('hibernation'),
      },
      {
        id: 'meteor_strike',
        name: 'Meteor Strike',
        colors: ['#ef4444', '#facc15'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('impact_massif'),
      },
      {
        id: 'sinkhole',
        name: 'Sinkhole',
        colors: ['#000000', '#451a03'],
        categoryId: 'th_mes_catastrophes_naturelles_m_ta',
        categoryTitle: '🌪️ Thèmes Catastrophes Naturelles (Méta)',
        rule: byTrophy('long_journey'),
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers publics
// ---------------------------------------------------------------------------

/** Retourne la liste plate de tous les thèmes */
export function getAllThemes(): ThemeEntry[] {
  return THEME_REGISTRY.flatMap((cat) => cat.themes)
}

/** Retourne un thème par son ID (undefined si introuvable) */
export function getThemeById(id: string): ThemeEntry | undefined {
  return getAllThemes().find((t) => t.id === id)
}

/** Retourne la règle de déblocage d'un thème par son ID (undefined si introuvable) */
export function getThemeRule(id: string): ThemeUnlockRule | undefined {
  return getThemeById(id)?.rule
}

/** Retourne la liste des catégories (structure complète pour admin et site public) */
export function getThemeCategories(): ThemeCategoryEntry[] {
  return THEME_REGISTRY
}
