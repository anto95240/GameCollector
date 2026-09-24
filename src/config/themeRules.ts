/**
 * themeRules.ts — Façade (Sous-étape 1a)
 *
 * Ce fichier ne contient plus de données en dur.
 * Il dérive THEME_RULES depuis themeRegistry.ts (source unique de vérité).
 * Le type ThemeRule et le nom de l'export sont préservés pour assurer la
 * compatibilité avec tous les consommateurs existants
 * (useThemeUnlocks, ThemePreview, SandboxThemes, AdminThemeWelcome).
 *
 * Avant cette migration, themeRules.ts contenait ~87 doublons
 * (lignes 189-274 de l'original). Ces doublons sont supprimés ici :
 * chaque thème n'a plus qu'une seule entrée dans THEME_RULES.
 */

import { getAllThemes } from '@/config/themeRegistry'
import { ExternalGameDetails } from '@/services/externalApiService'

export interface ThemeRule {
  id: string
  name: string
  condition: string
  max: number
  evaluate: (games: ExternalGameDetails[]) => number
}

/**
 * Liste des règles de déblocage.
 * Dérivée automatiquement depuis THEME_REGISTRY (source unique de vérité).
 * Chaque thème n'apparaît qu'UNE seule fois (doublons historiques supprimés).
 */
export const THEME_RULES: ThemeRule[] = getAllThemes().map((t) => ({
  id: t.id,
  name: t.name,
  condition: t.rule.condition,
  max: t.rule.max,
  evaluate: t.rule.evaluate,
}))
