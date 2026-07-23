// src/types/dashboardSettings.ts

// ── Widget IDs ────────────────────────────────────────────────────────────────

/** IDs des widgets disponibles sur le Dashboard */
export type DashboardWidgetId = 'customMetrics' | 'statPrimary' | 'statSecondary' | 'recentGames'

/** IDs des widgets disponibles sur la page Statistiques */
export type StatsWidgetId =
  | 'customMetrics'
  | 'recentGames'
  | 'insights'
  | 'dynamicDoughnut'
  | 'dynamicBarChart'
  | 'heatmap'
  | 'topGames'

/** Tous les IDs de widgets combinés */
export type WidgetId = DashboardWidgetId | StatsWidgetId

// ── Widget Configuration ──────────────────────────────────────────────────────

export interface WidgetConfig {
  id: WidgetId
  visible: boolean
  order: number
}

export interface PageWidgetSettings {
  widgetOrder: WidgetId[]
  hiddenWidgets: WidgetId[]
}

// ── Custom Metrics ────────────────────────────────────────────────────────────

export type CustomMetricId =
  | 'games-completed-year'
  | 'avg-time-by-genre'
  | 'games-by-decade'
  | 'completion-rate'
  | 'favorite-ratio'

export interface CustomMetricConfig {
  id: CustomMetricId
  enabled: boolean
}

// ── Secondary Stats ───────────────────────────────────────────────────────────

export type SecondaryStatId =
  | 'favoriteCount'
  | 'platformCount'
  | 'genreCount'
  | 'completedCount'
  | 'inProgressCount'
  | 'wishlistCount'
  | 'avgRating'
  | 'totalPlayingTime'
  | 'statusCount'

export interface SecondaryStatConfig {
  id: SecondaryStatId
  enabled: boolean
}

// ── User Settings (structure Supabase) ────────────────────────────────────────

export interface UserSettings {
  id?: string
  user_id?: string
  dashboard_widgets: PageWidgetSettings
  stats_widgets: PageWidgetSettings
  custom_metrics: CustomMetricConfig[]
  secondary_stats: SecondaryStatConfig[]
  created_at?: string
  updated_at?: string
}

// ── Context value ─────────────────────────────────────────────────────────────

export interface DashboardSettingsContextType {
  settings: UserSettings
  isEditMode: boolean
  isLoading: boolean
  isSaving: boolean
  toggleEditMode: () => void
  toggleWidgetVisibility: (page: 'dashboard' | 'stats', widgetId: WidgetId) => void
  reorderWidgets: (page: 'dashboard' | 'stats', fromIndex: number, toIndex: number) => void
  toggleCustomMetric: (metricId: CustomMetricId) => void
  toggleSecondaryStat: (statId: SecondaryStatId) => void
  saveSettings: () => Promise<void>
  cancelEdit: () => void
  isWidgetVisible: (page: 'dashboard' | 'stats', widgetId: WidgetId) => boolean
  getWidgetOrder: (page: 'dashboard' | 'stats') => WidgetId[]
}
