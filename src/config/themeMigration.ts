/**
 * themeMigration.ts — Mapping de compatibilité et migration (Sous-étape 1b)
 *
 * Ce fichier centralise :
 *   1. Le mapping ancien identifiant → identifiant canonique retenu
 *   2. Les fonctions de migration des données stockées côté client (localStorage)
 *
 * Décision (plan.md §D, point 4) : les IDs canoniques retenus sont ceux de
 * themeRegistry.ts (source unique de vérité), soit les IDs de l'ancien themeData.ts :
 * andy_s_room, gusteau_s, sant_agata, ici_c_est_paris.
 * La migration convertit les variantes orphelines (andys_room, gusteaus,
 * santagata, ici_cest_paris) vers ces IDs canoniques.
 *
 * IMPORTANT — Supabase :
 *   La colonne `id_name` de la table `themes` est la clé métier.
 *   Si un utilisateur a en base un ancien id_name orphelin, il ne retrouvera pas
 *   son thème jusqu'à ce qu'une migration SQL soit appliquée.
 *   La migration SQL est documentée ci-dessous pour exécution manuelle.
 *
 * --- Migration SQL (à exécuter dans l'éditeur Supabase SQL) ---
 *
 *   UPDATE themes SET id_name = 'andy_s_room'      WHERE id_name = 'andys_room';
 *   UPDATE themes SET id_name = 'gusteau_s'         WHERE id_name = 'gusteaus';
 *   UPDATE themes SET id_name = 'sant_agata'        WHERE id_name = 'santagata';
 *   UPDATE themes SET id_name = 'ici_c_est_paris'   WHERE id_name = 'ici_cest_paris';
 *   -- Correction du bug de tiret (normalement inexistant en base, mais par sécurité)
 *   UPDATE themes SET id_name = 'neon_night'  WHERE id_name = 'neon-night';
 *   UPDATE themes SET id_name = 'arctic_day'  WHERE id_name = 'arctic-day';
 *   UPDATE themes SET id_name = 'arctic_day'  WHERE id_name = 'light';
 *
 * ---------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Mapping statique ancien → canonique
// ---------------------------------------------------------------------------

/**
 * Table de correspondance : toute valeur à gauche doit être normalisée
 * vers la valeur à droite avant d'être utilisée dans l'app ou comparée
 * à la base de données.
 */
export const THEME_ID_MIGRATION_MAP: Readonly<Record<string, string>> = {
  // IDs divergents (orphelins de l'ancienne version doublonnée de themeRules.ts)
  andys_room: 'andy_s_room',
  gusteaus: 'gusteau_s',
  santagata: 'sant_agata',
  ici_cest_paris: 'ici_c_est_paris',

  // Bug de tiret dans index.html et ThemeContext (déjà partiellement corrigé)
  'neon-night': 'neon_night',
  'arctic-day': 'arctic_day',
  light: 'arctic_day',
}

// ---------------------------------------------------------------------------
// Fonction de normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise un identifiant de thème :
 * - Si l'ID est un ancien identifiant connu, retourne le canonique.
 * - Sinon retourne l'ID inchangé.
 */
export function normalizeThemeId(id: string): string {
  return THEME_ID_MIGRATION_MAP[id] ?? id
}

// ---------------------------------------------------------------------------
// Migration localStorage
// ---------------------------------------------------------------------------

/** Clé du thème équipé dans localStorage */
const LS_EQUIPPED = 'gc_equipped_theme'
/** Clé de la liste des thèmes déjà vus/débloqués dans localStorage */
const LS_KNOWN_UNLOCKED = 'gc_known_unlocked_themes'

/**
 * Migre toutes les valeurs de thème présentes dans le localStorage.
 *
 * - `gc_equipped_theme` : normalise l'ID du thème équipé.
 * - `gc_known_unlocked_themes` : normalise chaque ID de la liste.
 *
 * Idempotent : appeler plusieurs fois est sans effet si la migration est déjà faite.
 * Doit être appelé AU PLUS TÔT dans l'initialisation, depuis ThemeContext ou main.tsx.
 */
export function migrateLocalStorage(): void {
  try {
    // --- gc_equipped_theme ---
    const raw = localStorage.getItem(LS_EQUIPPED)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'string') {
        const normalized = normalizeThemeId(parsed)
        if (normalized !== parsed) {
          localStorage.setItem(LS_EQUIPPED, JSON.stringify(normalized))
        }
      }
    }
  } catch {
    // Valeur corrompue : on laisse ThemeContext gérer le fallback
  }

  try {
    // --- gc_known_unlocked_themes ---
    const raw = localStorage.getItem(LS_KNOWN_UNLOCKED)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const migrated = parsed.map((id) => (typeof id === 'string' ? normalizeThemeId(id) : id))
        // Dédupliquer (deux anciens IDs pourraient mapper sur le même canonique)
        const deduped = [...new Set(migrated)]
        localStorage.setItem(LS_KNOWN_UNLOCKED, JSON.stringify(deduped))
      }
    }
  } catch {
    // Valeur corrompue : on laisse useThemeUnlocks gérer
  }
}
