/**
 * themeData.ts — Façade (Sous-étape 1a)
 *
 * Ce fichier ne contient plus de données en dur.
 * Il dérive THEME_CATEGORIES_DATA depuis themeRegistry.ts (source unique de vérité).
 * Les types et le nom de l'export sont préservés pour assurer la compatibilité
 * avec tous les consommateurs existants (ThemesGallery, etc.).
 */

import { THEME_REGISTRY } from '@/config/themeRegistry'

export interface ThemeInfo {
  id: string
  name: string
  colors: string[]
}

export interface ThemeCategory {
  id: string
  title: string
  themes: ThemeInfo[]
}

/**
 * Catalogue des thèmes organisé par catégorie.
 * Dérivé automatiquement depuis THEME_REGISTRY (source unique de vérité).
 */
export const THEME_CATEGORIES_DATA: ThemeCategory[] = THEME_REGISTRY.map((cat) => ({
  id: cat.id,
  title: cat.title,
  themes: cat.themes.map((t) => ({
    id: t.id,
    name: t.name,
    colors: t.colors,
  })),
}))
