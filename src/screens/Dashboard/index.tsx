import './Dashboard.css'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { faCog } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'

import CustomMetricsPanel from '@/components/common/CustomMetricsPanel'
import EditModeToolbar from '@/components/common/EditModeToolbar'
import SectionStatSecondary from '@/components/common/SectionStatSecondary'
import SkeletonText from '@/components/common/Skeleton/SkeletonText'
import WidgetWrapper from '@/components/common/WidgetWrapper'
import SectionGameCard from '@/components/main/Dashboard/SectionGameCard'
import SectionStatPrimary from '@/components/main/Dashboard/SectionStatPrimary'
import { DASHBOARD_WIDGETS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'
import type { DashboardWidgetId } from '@/types/dashboardSettings'

// ── Mapping widgetId → render function ────────────────────────────────────────
const WIDGET_MAP: Record<DashboardWidgetId, (stats?: any, metadata?: any) => React.ReactNode> = {
  customMetrics: (stats) => <CustomMetricsPanel stats={stats} />,
  statPrimary: () => <SectionStatPrimary />,
  statSecondary: () => <SectionStatSecondary />,
  recentGames: () => <SectionGameCard />,
}

function HomePage() {
  const { t } = useTranslation()
  const { isEditMode, toggleEditMode, getWidgetOrder, reorderWidgets } = useDashboardSettings()
  const { stats, metadata, isLoading } = useStatsData()

  const widgetOrder = getWidgetOrder('dashboard')

  // ── Drag & Drop Sensors ─────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = () => {}

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgetOrder.indexOf(active.id)
    const newIndex = widgetOrder.indexOf(over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWidgets('dashboard', oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {}

  // ── Résoudre le label d'un widget ─────────────────────────────────────
  const getWidgetLabel = (widgetId: DashboardWidgetId): string => {
    const def = DASHBOARD_WIDGETS.find((w) => w.id === widgetId)
    return def ? t(def.labelKey) : widgetId
  }

  // ── Séparer les widgets pour le layout grid (primary + secondary) ───
  const renderWidgets = () => {
    const primaryWidgets: React.ReactNode[] = []
    const otherWidgets: React.ReactNode[] = []

    widgetOrder.forEach((widgetId) => {
      const id = widgetId as DashboardWidgetId
      const renderFn = WIDGET_MAP[id]
      if (!renderFn) return

      // Injecter margin-bottom générique sauf si pris en charge par le composant (via "mt-stats" div)
      const element = renderFn(stats, metadata)
      const isCard = id === 'customMetrics' || id === 'recentGames'

      const wrapped = (
        <WidgetWrapper
          key={id}
          widgetId={id}
          page="dashboard"
          label={getWidgetLabel(id)}
          className={`${id === 'statPrimary' ? 'stat-primary-wrapper' : ''} ${id === 'statSecondary' ? 'stat-secondary-wrapper' : ''}`}
        >
          <div className={`${isCard && id !== 'recentGames' ? 'mb-6' : ''}`}>{element}</div>
        </WidgetWrapper>
      )

      if (id === 'statPrimary' || id === 'statSecondary') {
        primaryWidgets.push(wrapped)
      } else {
        otherWidgets.push(wrapped)
      }
    })

    return { primaryWidgets, otherWidgets }
  }

  const { primaryWidgets, otherWidgets } = renderWidgets()

  if (isLoading) {
    return (
      <div className="dashboard-content">
        <div className="main-stats-grid">
          <SkeletonText height="250px" className="rounded-xl w-full" />
          <SkeletonText height="250px" className="rounded-xl w-full" />
        </div>
        <SkeletonText height="400px" className="rounded-xl w-full" />
      </div>
    )
  }

  return (
    <div className={`dashboard-content ${isEditMode ? 'is-edit-mode' : ''}`}>
      {/* En-tête des actions */}
      <div className="dashboard-header-actions">
        <button
          className={`dashboard-edit-btn ${isEditMode ? 'active' : ''}`}
          onClick={toggleEditMode}
          title={t('editMode.toggle')}
        >
          <FontAwesomeIcon icon={faCog} />
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          {/* SECTION STATS PRINCIPALES */}
          <div className="main-stats-grid">{primaryWidgets}</div>

          {otherWidgets}
        </SortableContext>
      </DndContext>

      {/* Toolbar flottante en mode édition */}
      {isEditMode && <EditModeToolbar />}
    </div>
  )
}

export default HomePage
