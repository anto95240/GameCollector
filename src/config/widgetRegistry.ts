// src/config/widgetRegistry.ts
import {
  faBookmark,
  faCalendar,
  faChartLine,
  faChartPie,
  faClock,
  faFire,
  faGamepad,
  faHeart,
  faLayerGroup,
  faLightbulb,
  faListOl,
  faMedal,
  faPercent,
  faStar,
  faThLarge,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'

import type {
  CustomMetricId,
  DashboardWidgetId,
  SecondaryStatId,
  StatsWidgetId,
} from '@/types/dashboardSettings'

// ── Dashboard Widgets ─────────────────────────────────────────────────────────

export interface WidgetDefinition<T extends string = string> {
  id: T
  labelKey: string
  icon: typeof faStar
  defaultVisible: boolean
  defaultOrder: number
}

export type StatsWidgetDefinition = WidgetDefinition<StatsWidgetId>

export const DASHBOARD_WIDGETS: WidgetDefinition<DashboardWidgetId>[] = [
  {
    id: 'customMetrics',
    labelKey: 'customMetrics.title',
    icon: faStar,
    defaultVisible: true,
    defaultOrder: 0,
  },
  {
    id: 'statPrimary',
    labelKey: 'editMode.widgets.statPrimary',
    icon: faTrophy,
    defaultVisible: true,
    defaultOrder: 1,
  },
  {
    id: 'statSecondary',
    labelKey: 'editMode.widgets.statSecondary',
    icon: faLayerGroup,
    defaultVisible: true,
    defaultOrder: 2,
  },
  {
    id: 'recentGames',
    labelKey: 'editMode.widgets.recentGames',
    icon: faGamepad,
    defaultVisible: true,
    defaultOrder: 3,
  },
]

// ── Stats Widgets ─────────────────────────────────────────────────────────────

export const STATS_WIDGETS: StatsWidgetDefinition[] = [
  {
    id: 'customMetrics',
    labelKey: 'customMetrics.title',
    icon: faStar,
    defaultVisible: true,
    defaultOrder: 0,
  },
  {
    id: 'recentGames',
    labelKey: 'editMode.widgets.recentGames',
    icon: faGamepad,
    defaultVisible: true,
    defaultOrder: 1,
  },
  {
    id: 'insights',
    labelKey: 'editMode.widgets.insights',
    icon: faLightbulb,
    defaultVisible: true,
    defaultOrder: 2,
  },
  {
    id: 'dynamicDoughnut',
    labelKey: 'editMode.widgets.dynamicDoughnut',
    icon: faChartPie,
    defaultVisible: true,
    defaultOrder: 3,
  },
  {
    id: 'dynamicBarChart',
    labelKey: 'editMode.widgets.dynamicBarChart',
    icon: faChartLine,
    defaultVisible: true,
    defaultOrder: 4,
  },
  {
    id: 'heatmap',
    labelKey: 'editMode.widgets.heatmap',
    icon: faFire,
    defaultVisible: true,
    defaultOrder: 5,
  },
  {
    id: 'topGames',
    labelKey: 'editMode.widgets.topGames',
    icon: faMedal,
    defaultVisible: true,
    defaultOrder: 6,
  },
]

// ── Custom Metrics ────────────────────────────────────────────────────────────

export interface CustomMetricDefinition {
  id: CustomMetricId
  labelKey: string
  icon: typeof faStar
  /** Fonction pour calculer la valeur à partir des stats brutes */
  compute: (stats: any) => string | number
}

export const CUSTOM_METRICS: CustomMetricDefinition[] = [
  {
    id: 'games-completed-year',
    labelKey: 'customMetrics.gamesCompletedYear',
    icon: faTrophy,
    compute: (stats) => {
      if (!stats?.rawGames) return 0
      const currentYear = new Date().getFullYear()
      return stats.rawGames.filter(
        (g: any) =>
          g.status?.status_name === 'Terminé' &&
          new Date(g.created_at).getFullYear() === currentYear
      ).length
    },
  },
  {
    id: 'avg-time-by-genre',
    labelKey: 'customMetrics.avgTimeByGenre',
    icon: faClock,
    compute: (stats) => {
      if (!stats?.rawGames) return '–'
      const gamesWithTime = stats.rawGames.filter((g: any) => g.playing_time > 0)
      if (!gamesWithTime.length) return '0h'
      const avg =
        gamesWithTime.reduce((a: number, g: any) => a + g.playing_time, 0) / gamesWithTime.length
      return `${Math.round(avg)}h`
    },
  },
  {
    id: 'games-by-decade',
    labelKey: 'customMetrics.gamesByDecade',
    icon: faCalendar,
    compute: (stats) => {
      if (!stats?.rawGames) return '–'
      const decades: Record<string, number> = {}
      stats.rawGames.forEach((g: any) => {
        if (g.year) {
          const decade = `${Math.floor(Number(g.year) / 10) * 10}s`
          decades[decade] = (decades[decade] || 0) + 1
        }
      })
      const top = Object.entries(decades).sort(([, a], [, b]) => (b as number) - (a as number))[0]
      return top ? `${top[0]}: ${top[1]}` : '–'
    },
  },
  {
    id: 'completion-rate',
    labelKey: 'customMetrics.completionRate',
    icon: faPercent,
    compute: (stats) => {
      if (!stats?.rawGames?.length) return '0%'
      const completed = stats.rawGames.filter(
        (g: any) => g.status?.status_name === 'Terminé'
      ).length
      return `${Math.round((completed / stats.rawGames.length) * 100)}%`
    },
  },
  {
    id: 'favorite-ratio',
    labelKey: 'customMetrics.favoriteRatio',
    icon: faHeart,
    compute: (stats) => {
      if (!stats?.rawGames?.length) return '0%'
      const favs = stats.rawGames.filter((g: any) => g.is_favorite).length
      return `${Math.round((favs / stats.rawGames.length) * 100)}%`
    },
  },
]

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_DASHBOARD_SETTINGS = {
  widgetOrder: DASHBOARD_WIDGETS.map((w) => w.id),
  hiddenWidgets: [] as DashboardWidgetId[],
}

export const DEFAULT_STATS_SETTINGS = {
  widgetOrder: STATS_WIDGETS.map((w) => w.id),
  hiddenWidgets: [] as StatsWidgetId[],
}

export const DEFAULT_CUSTOM_METRICS = CUSTOM_METRICS.map((m) => ({
  id: m.id,
  enabled: false,
}))

// ── Secondary Stats ───────────────────────────────────────────────────────────

export interface SecondaryStatDefinition {
  id: SecondaryStatId
  labelKey: string
  icon: typeof faStar
  compute: (stats: any) => string | number
}

export const SECONDARY_STATS: SecondaryStatDefinition[] = [
  {
    id: 'favoriteCount',
    labelKey: 'dashboard.favorite',
    icon: faHeart,
    compute: (stats) => stats?.favoriteCount ?? '-',
  },
  {
    id: 'platformCount',
    labelKey: 'dashboard.platform',
    icon: faThLarge,
    compute: (stats) => stats?.platformCount ?? '-',
  },
  {
    id: 'genreCount',
    labelKey: 'dashboard.genre',
    icon: faLayerGroup,
    compute: (stats) => stats?.genreCount ?? '-',
  },
  {
    id: 'completedCount',
    labelKey: 'customMetrics.gamesCompletedYear', // Will need a proper label, but this works for now, or just use general term
    icon: faTrophy,
    compute: (stats) => stats?.completedCount ?? '-',
  },
  {
    id: 'inProgressCount',
    labelKey: 'dashboard.status',
    icon: faFire,
    compute: (stats) => stats?.inProgressCount ?? '-',
  },
  {
    id: 'wishlistCount',
    labelKey: 'dashboard.wishlist',
    icon: faBookmark,
    compute: (stats) => stats?.wishlistCount ?? '-',
  },
  {
    id: 'avgRating',
    labelKey: 'editMode.widgets.avgRating',
    icon: faStar,
    compute: (stats) => stats?.avgRating ?? '-',
  },
  {
    id: 'totalPlayingTime',
    labelKey: 'editMode.widgets.totalPlayingTime',
    icon: faClock,
    compute: (stats) => {
      if (!stats?.totalPlayingTime) return '0h'
      const totalHours = Math.round(stats.totalPlayingTime)
      return totalHours >= 1000 ? `${(totalHours / 1000).toFixed(1)}k h` : `${totalHours}h`
    },
  },
  {
    id: 'statusCount',
    labelKey: 'dashboard.status',
    icon: faListOl,
    compute: (stats) => stats?.statusCount ?? '-',
  },
]

export const DEFAULT_SECONDARY_STATS = SECONDARY_STATS.map((s) => ({
  id: s.id,
  enabled: ['favoriteCount', 'platformCount', 'genreCount'].includes(s.id),
}))
