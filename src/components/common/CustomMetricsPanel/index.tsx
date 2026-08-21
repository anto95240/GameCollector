import './CustomMetricsPanel.css'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { faGripVertical, faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CUSTOM_METRICS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import { CustomMetricId } from '@/types/dashboardSettings'

interface CustomMetricsPanelProps {
  stats: any
}

function SortableMetricItem({
  metric,
  isEnabled,
  toggle,
  t,
}: {
  metric: any
  isEnabled: boolean
  toggle: (id: CustomMetricId) => void
  t: any
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metric.id,
    transition: null,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging ? '0 8px 16px rgba(0, 0, 0, 0.3)' : 'none',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`custom-metric-toggle-row ${isDragging ? 'is-dragging' : ''}`}
    >
      <div className="custom-metric-toggle-left">
        <div
          className="custom-metric-drag-handle"
          {...attributes}
          {...listeners}
          onPointerDown={(e) => {
            // Empêcher le DndContext parent d'intercepter le drag
            e.stopPropagation()
            listeners?.onPointerDown?.(e)
          }}
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </div>
        <FontAwesomeIcon icon={metric.icon} />
        <span className="custom-metric-toggle-name">{t(metric.labelKey)}</span>
      </div>
      <button
        className={`metric-switch ${isEnabled ? 'active' : ''}`}
        onClick={() => toggle(metric.id)}
      >
        <div className="metric-switch-knob" />
      </button>
    </div>
  )
}

const CustomMetricsPanel: React.FC<CustomMetricsPanelProps> = ({ stats }) => {
  const { t } = useTranslation()
  const { settings, isEditMode, toggleCustomMetric, reorderCustomMetrics } = useDashboardSettings()

  const orderedMetrics = useMemo(() => {
    if (!settings.custom_metrics) return []
    return settings.custom_metrics
      .map((config) => {
        const def = CUSTOM_METRICS.find((m) => m.id === config.id)
        return def ? { def, config } : null
      })
      .filter((item): item is { def: (typeof CUSTOM_METRICS)[0]; config: any } => item !== null)
  }, [settings.custom_metrics])

  const activeMetrics = useMemo(() => {
    return orderedMetrics.filter((item) => item.config.enabled).map((item) => item.def)
  }, [orderedMetrics])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedMetrics.findIndex((m) => m.def.id === active.id)
    const newIndex = orderedMetrics.findIndex((m) => m.def.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderCustomMetrics(oldIndex, newIndex)
    }
  }

  // En mode normal : afficher uniquement les métriques actives
  if (!isEditMode && activeMetrics.length === 0) {
    return null
  }

  // En mode édition : afficher le panneau de configuration
  if (isEditMode) {
    return (
      <div className="custom-metrics-panel">
        <div className="custom-metrics-header">
          <div className="custom-metrics-title">
            <FontAwesomeIcon icon={faSlidersH} />
            <span>{t('customMetrics.title')}</span>
          </div>
        </div>

        <div className="custom-metrics-edit">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedMetrics.map((m) => m.def.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedMetrics.map(({ def: metric, config }) => (
                <SortableMetricItem
                  key={metric.id}
                  metric={metric}
                  isEnabled={config.enabled}
                  toggle={toggleCustomMetric}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    )
  }

  // En mode normal : afficher les valeurs calculées
  return (
    <div className="custom-metrics-panel">
      <div className="custom-metrics-header">
        <div className="custom-metrics-title">
          <FontAwesomeIcon icon={faSlidersH} />
          <span>{t('customMetrics.title')}</span>
        </div>
      </div>

      <div className="custom-metrics-grid">
        {activeMetrics.map((metric) => {
          const value = metric.compute(stats)

          return (
            <div key={metric.id} className="custom-metric-card">
              <div className="custom-metric-icon">
                <FontAwesomeIcon icon={metric.icon} />
              </div>
              <div className="custom-metric-body">
                <span className="custom-metric-label">{t(metric.labelKey)}</span>
                <span className="custom-metric-value">{value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CustomMetricsPanel
