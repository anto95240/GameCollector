// src/context/DashboardSettingsContext.tsx
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  DEFAULT_CUSTOM_METRICS,
  DEFAULT_DASHBOARD_SETTINGS,
  DEFAULT_SECONDARY_STATS,
  DEFAULT_STATS_SETTINGS,
} from '@/config/widgetRegistry'
import { useApiUserSettings } from '@/hooks/api/useApiUserSettings'
import type {
  CustomMetricId,
  DashboardSettingsContextType,
  SecondaryStatId,
  UserSettings,
  WidgetId,
} from '@/types/dashboardSettings'

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  dashboard_widgets: DEFAULT_DASHBOARD_SETTINGS,
  stats_widgets: DEFAULT_STATS_SETTINGS,
  custom_metrics: DEFAULT_CUSTOM_METRICS,
  secondary_stats: DEFAULT_SECONDARY_STATS,
}

// ── Context ───────────────────────────────────────────────────────────────────

const DashboardSettingsContext = createContext<DashboardSettingsContextType | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export const DashboardSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { getUserSettings, upsertUserSettings } = useApiUserSettings()

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Sauvegarde de l'état avant édition pour permettre "Annuler"
  const settingsBeforeEdit = useRef<UserSettings | null>(null)

  // ── Chargement initial ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const loadSettings = async () => {
      try {
        const data = await getUserSettings()
        if (!isMounted) return

        if (data) {
          // Merge avec les defaults pour gérer les nouveaux widgets ajoutés après la sauvegarde
          const mergePageSettings = (defaults: any, saved?: any) => {
            if (!saved) return defaults
            const savedOrder = saved.widgetOrder || []
            const missingWidgets = defaults.widgetOrder.filter(
              (id: string) => !savedOrder.includes(id)
            )
            return {
              ...defaults,
              ...saved,
              widgetOrder: [...savedOrder, ...missingWidgets],
            }
          }

          const mergeArraySettings = (defaults: any[], saved?: any[]) => {
            if (!saved || saved.length === 0) return defaults
            const savedIds = saved.map((s) => s.id)
            const missing = defaults.filter((d) => !savedIds.includes(d.id))
            return [...saved, ...missing]
          }

          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            dashboard_widgets: mergePageSettings(
              DEFAULT_DASHBOARD_SETTINGS,
              data.dashboard_widgets
            ),
            stats_widgets: mergePageSettings(DEFAULT_STATS_SETTINGS, data.stats_widgets),
            custom_metrics: mergeArraySettings(DEFAULT_CUSTOM_METRICS, data.custom_metrics),
            secondary_stats: mergeArraySettings(DEFAULT_SECONDARY_STATS, data.secondary_stats),
          })
        }
      } catch (err) {
        console.error('Erreur chargement settings:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadSettings()

    return () => {
      isMounted = false
    }
  }, [getUserSettings])

  // ── Toggle Edit Mode ──────────────────────────────────────────────────
  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      if (!prev) {
        // Entrer en mode édition → sauvegarder l'état actuel
        settingsBeforeEdit.current = JSON.parse(JSON.stringify(settings))
      }
      return !prev
    })
  }, [settings])

  // ── Cancel Edit ───────────────────────────────────────────────────────
  const cancelEdit = useCallback(() => {
    if (settingsBeforeEdit.current) {
      setSettings(settingsBeforeEdit.current)
      settingsBeforeEdit.current = null
    }
    setIsEditMode(false)
  }, [])

  // ── Toggle Widget Visibility ──────────────────────────────────────────
  const toggleWidgetVisibility = useCallback((page: 'dashboard' | 'stats', widgetId: WidgetId) => {
    setSettings((prev) => {
      const key = page === 'dashboard' ? 'dashboard_widgets' : 'stats_widgets'
      const pageSettings = { ...prev[key] }
      const hidden = [...(pageSettings.hiddenWidgets || [])]

      const index = hidden.indexOf(widgetId)
      if (index >= 0) {
        hidden.splice(index, 1)
      } else {
        hidden.push(widgetId)
      }

      return {
        ...prev,
        [key]: {
          ...pageSettings,
          hiddenWidgets: hidden,
        },
      }
    })
  }, [])

  // ── Reorder Widgets ───────────────────────────────────────────────────
  const reorderWidgets = useCallback(
    (page: 'dashboard' | 'stats', fromIndex: number, toIndex: number) => {
      setSettings((prev) => {
        const key = page === 'dashboard' ? 'dashboard_widgets' : 'stats_widgets'
        const pageSettings = { ...prev[key] }
        const order = [...(pageSettings.widgetOrder || [])]

        const [moved] = order.splice(fromIndex, 1)
        order.splice(toIndex, 0, moved)

        return {
          ...prev,
          [key]: {
            ...pageSettings,
            widgetOrder: order,
          },
        }
      })
    },
    []
  )

  // ── Reorder Custom Metrics ──────────────────────────────────────────────
  const reorderCustomMetrics = useCallback((fromIndex: number, toIndex: number) => {
    setSettings((prev) => {
      const metrics = [...(prev.custom_metrics || [])]
      const [moved] = metrics.splice(fromIndex, 1)
      metrics.splice(toIndex, 0, moved)
      return { ...prev, custom_metrics: metrics }
    })
  }, [])

  // ── Reorder Secondary Stats ─────────────────────────────────────────────
  const reorderSecondaryStats = useCallback((fromIndex: number, toIndex: number) => {
    setSettings((prev) => {
      const stats = [...(prev.secondary_stats || [])]
      const [moved] = stats.splice(fromIndex, 1)
      stats.splice(toIndex, 0, moved)
      return { ...prev, secondary_stats: stats }
    })
  }, [])

  // ── Toggle Custom Metric ──────────────────────────────────────────────
  const toggleCustomMetric = useCallback((metricId: CustomMetricId) => {
    setSettings((prev) => {
      const metrics = [...(prev.custom_metrics || [])]
      const index = metrics.findIndex((m) => m.id === metricId)

      if (index >= 0) {
        metrics[index] = { ...metrics[index], enabled: !metrics[index].enabled }
      } else {
        metrics.push({ id: metricId, enabled: true })
      }

      return { ...prev, custom_metrics: metrics }
    })
  }, [])

  // ── Toggle Secondary Stat ───────────────────────────────────────────────
  const toggleSecondaryStat = useCallback((statId: SecondaryStatId) => {
    setSettings((prev) => {
      const stats = [...(prev.secondary_stats || [])]
      const index = stats.findIndex((m) => m.id === statId)

      if (index >= 0) {
        stats[index] = { ...stats[index], enabled: !stats[index].enabled }
      } else {
        stats.push({ id: statId, enabled: true })
      }

      return { ...prev, secondary_stats: stats }
    })
  }, [])

  // ── Save Settings ─────────────────────────────────────────────────────
  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true)
      await upsertUserSettings({
        dashboard_widgets: settings.dashboard_widgets,
        stats_widgets: settings.stats_widgets,
        custom_metrics: settings.custom_metrics,
        secondary_stats: settings.secondary_stats,
      })
      settingsBeforeEdit.current = null

      try {
        import('@/utils/userStorage').then(({ incrementStoredUserMetric, mergeStoredUser }) => {
          incrementStoredUserMetric('dashboardCustomizations')
          mergeStoredUser({
            customStatsCount: settings.custom_metrics.filter((m) => m.enabled).length,
          })
          window.dispatchEvent(new CustomEvent('checkAchievements'))
        })
      } catch (err) {
        console.error('[Dashboard] Error updating metrics', err)
      }
    } catch (err) {
      console.error('Erreur sauvegarde settings:', err)
      // Even on error, we exit edit mode so the user isn't stuck
    } finally {
      setIsSaving(false)
      setIsEditMode(false)
    }
  }, [settings, upsertUserSettings])

  // ── Helpers ───────────────────────────────────────────────────────────
  const isWidgetVisible = useCallback(
    (page: 'dashboard' | 'stats', widgetId: WidgetId): boolean => {
      const key = page === 'dashboard' ? 'dashboard_widgets' : 'stats_widgets'
      const hidden = settings[key]?.hiddenWidgets || []
      return !hidden.includes(widgetId)
    },
    [settings]
  )

  const getWidgetOrder = useCallback(
    (page: 'dashboard' | 'stats'): WidgetId[] => {
      const key = page === 'dashboard' ? 'dashboard_widgets' : 'stats_widgets'
      return settings[key]?.widgetOrder || []
    },
    [settings]
  )

  return (
    <DashboardSettingsContext.Provider
      value={{
        settings,
        isEditMode,
        isLoading,
        isSaving,
        toggleEditMode,
        toggleWidgetVisibility,
        reorderWidgets,
        reorderCustomMetrics,
        reorderSecondaryStats,
        toggleCustomMetric,
        toggleSecondaryStat,
        saveSettings,
        cancelEdit,
        isWidgetVisible,
        getWidgetOrder,
      }}
    >
      {children}
    </DashboardSettingsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useDashboardSettings = () => {
  const context = useContext(DashboardSettingsContext)
  if (!context) {
    throw new Error('useDashboardSettings doit être utilisé dans un DashboardSettingsProvider')
  }
  return context
}
