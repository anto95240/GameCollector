import './Statistique.css'

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { faCalendar, faChartPie, faCog, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CustomMetricsPanel from '@/components/common/CustomMetricsPanel'
import EditModeToolbar from '@/components/common/EditModeToolbar'
import SectionStatSecondary from '@/components/common/SectionStatSecondary'
import SkeletonText from '@/components/common/Skeleton/SkeletonText'
import WidgetWrapper from '@/components/common/WidgetWrapper'
import SectionGameCard from '@/components/main/Dashboard/SectionGameCard'
import DynamicBarChart from '@/components/main/Statistique/DynamicBarChart'
import DynamicDoughnutChart from '@/components/main/Statistique/DynamicDoughnutChart'
import HeatmapChart from '@/components/main/Statistique/HeatmapChart'
import InsightsPanel from '@/components/main/Statistique/InsightsPanel'
import TopGamesWidget from '@/components/main/Statistique/TopGamesWidget'
import { STATS_WIDGETS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'
import { triggerAchievementCheck } from '@/services/achievementService'
import type { StatsWidgetId } from '@/types/dashboardSettings'
import { mergeStoredUser } from '@/utils/userStorage'

// ── Tab Configuration ─────────────────────────────────────────────────────────
type StatsTab = 'overview' | 'charts' | 'activity'

interface TabDef {
  id: StatsTab
  labelKey: string
  icon: typeof faLightbulb
  widgetIds: StatsWidgetId[]
}

const TABS: TabDef[] = [
  {
    id: 'overview',
    labelKey: 'stats.tabs.overview',
    icon: faLightbulb,
    widgetIds: ['customMetrics', 'recentGames', 'insights', 'topGames'],
  },
  {
    id: 'charts',
    labelKey: 'stats.tabs.charts',
    icon: faChartPie,
    widgetIds: ['dynamicDoughnut', 'dynamicBarChart'],
  },
  {
    id: 'activity',
    labelKey: 'stats.tabs.activity',
    icon: faCalendar,
    widgetIds: ['heatmap'],
  },
]

// ── Mapping widgetId → render function ────────────────────────────────────────
const WIDGET_MAP: Record<StatsWidgetId, (stats: any, metadata: any) => React.ReactNode> = {
  customMetrics: (stats) => <CustomMetricsPanel stats={stats} />,
  recentGames: () => (
    <div className="mt-stats">
      <SectionGameCard />
    </div>
  ),
  insights: (stats, metadata) => (
    <div className="mt-stats">
      <InsightsPanel stats={stats} metadata={metadata} />
    </div>
  ),
  dynamicDoughnut: (stats, metadata) => (
    <div className="mt-stats">
      <DynamicDoughnutChart stats={stats} metadata={metadata} />
    </div>
  ),
  dynamicBarChart: (stats) => (
    <div className="mt-stats">
      <DynamicBarChart stats={stats} />
    </div>
  ),
  heatmap: (stats) => (
    <div className="mt-stats">
      <HeatmapChart stats={stats} />
    </div>
  ),
  topGames: (stats, metadata) => (
    <div className="mt-stats">
      <TopGamesWidget stats={stats} metadata={metadata} />
    </div>
  ),
}

function StatistiquePage() {
  const { t } = useTranslation()
  const { stats, metadata, isLoading } = useStatsData()
  const { isEditMode, toggleEditMode, getWidgetOrder, reorderWidgets } = useDashboardSettings()

  const [activeTab, setActiveTab] = useState<StatsTab>('overview')
  const [activeDragId, setActiveDragId] = useState<StatsWidgetId | null>(null)

  useEffect(() => {
    mergeStoredUser({ viewedStats: true })
    triggerAchievementCheck()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const widgetOrder = getWidgetOrder('stats')

  const handleDragStart = (event: any) => setActiveDragId(event.active.id as StatsWidgetId)

  const handleDragEnd = (event: any) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgetOrder.indexOf(active.id)
    const newIndex = widgetOrder.indexOf(over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWidgets('stats', oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => setActiveDragId(null)

  const getWidgetLabel = (widgetId: StatsWidgetId): string => {
    const def = STATS_WIDGETS.find((w) => w.id === widgetId)
    return def ? t(def.labelKey) : widgetId
  }

  // ── Get active tab's widget IDs, filtered by widget order ──
  const activeTabDef = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  const filteredWidgetOrder = useMemo(() => {
    if (isEditMode) {
      // En mode édition, afficher tous les widgets dans l'ordre global
      return widgetOrder
    }
    // En mode normal, afficher seulement les widgets de l'onglet actif, dans l'ordre personnalisé
    return widgetOrder.filter((wid) => activeTabDef.widgetIds.includes(wid as StatsWidgetId))
  }, [widgetOrder, activeTabDef, isEditMode])

  const renderWidgets = () => {
    const elements: React.ReactNode[] = []

    filteredWidgetOrder.forEach((widgetId) => {
      const renderFn = WIDGET_MAP[widgetId as StatsWidgetId]
      if (!renderFn) return

      elements.push(
        <div key={widgetId}>
          <WidgetWrapper
            widgetId={widgetId}
            page="stats"
            label={getWidgetLabel(widgetId as StatsWidgetId)}
          >
            {renderFn(stats, metadata)}
          </WidgetWrapper>
        </div>
      )
    })

    return elements
  }

  // ── Hero Stats (now using SectionStatSecondary) ─────────────────────────────────────────────────────────

  if (isLoading || !stats) {
    return (
      <div className="statistics-page-container">
        <div className="w-full md:w-[50%] mx-auto mt-4 md:mt-[2%]">
          <SkeletonText height="8rem" className="rounded-[20px] w-full" />
        </div>
        <div className="stats-tab-content flex flex-col gap-6 mt-6">
          <SkeletonText height="120px" className="rounded-xl w-full" />
          <SkeletonText height="350px" className="rounded-xl w-full" />
          <SkeletonText height="350px" className="rounded-xl w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className={`statistics-page-container ${isEditMode ? 'is-edit-mode' : ''}`}>
      {/* En-tête des actions */}
      <div className="stats-header-actions">
        <button
          className={`stats-edit-btn ${isEditMode ? 'active' : ''}`}
          onClick={toggleEditMode}
          title={t('editMode.toggle')}
        >
          <FontAwesomeIcon icon={faCog} />
        </button>
      </div>

      {/* ══ HERO BANNER ══ */}
      <div className="stats-hero">
        <div className="stats-hero-content">
          <h1 className="stats-hero-title">{t('navbar.statistics')}</h1>
          <div style={{ marginTop: '2rem' }}>
            <SectionStatSecondary />
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      {!isEditMode && (
        <div className="stats-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`stats-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <FontAwesomeIcon icon={tab.icon} />
              <span>{t(tab.labelKey)}</span>
              <span className="tab-count">{tab.widgetIds.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* ══ TAB CONTENT ══ */}
      <div className="stats-tab-content">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={filteredWidgetOrder}
            strategy={activeTab === 'charts' ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div
              className={`stats-section fade-in-tab ${activeTab === 'charts' ? 'stats-two-col' : 'flex flex-col gap-6'}`}
              key={activeTab}
            >
              {renderWidgets()}
            </div>
          </SortableContext>

          <DragOverlay zIndex={1500}>
            {activeDragId ? (
              <div className="drag-overlay-item">
                <WidgetWrapper
                  widgetId={activeDragId}
                  page="stats"
                  label={getWidgetLabel(activeDragId)}
                  isOverlay
                >
                  <div className="opacity-80 pointer-events-none">
                    {WIDGET_MAP[activeDragId]?.(stats, metadata)}
                  </div>
                </WidgetWrapper>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Toolbar flottante en mode édition */}
      {isEditMode && <EditModeToolbar />}
    </div>
  )
}

export default StatistiquePage
