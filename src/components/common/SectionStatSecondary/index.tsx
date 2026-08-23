import './SectionStatSecondary.css'

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
import { faGripVertical, faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import StatCard from '@/components/common/StatCard'
import { SECONDARY_STATS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'
import { SecondaryStatId } from '@/types/dashboardSettings'

function SortableStatItem({
  stat,
  isEnabled,
  toggle,
  t,
}: {
  stat: any
  isEnabled: boolean
  toggle: (id: SecondaryStatId) => void
  t: any
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stat.id,
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
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: isDragging ? '1px solid var(--accent-primary)' : '1px solid transparent',
      }}
      className={isDragging ? 'is-dragging' : ''}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="custom-metric-drag-handle"
          {...attributes}
          {...listeners}
          onPointerDown={(e) => {
            e.stopPropagation()
            listeners?.onPointerDown?.(e)
          }}
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </div>
        <FontAwesomeIcon icon={stat.icon} />
        <span>{t(stat.labelKey)}</span>
      </div>
      <button
        className={`metric-switch ${isEnabled ? 'active' : ''}`}
        onClick={() => toggle(stat.id)}
        style={{
          background: isEnabled ? 'var(--accent-primary)' : 'var(--border-subtle)',
          borderRadius: '20px',
          width: '40px',
          height: '24px',
          position: 'relative',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: isEnabled ? '18px' : '2px',
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '50%',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  )
}

const SectionStatSecondary = () => {
  const { t } = useTranslation()
  const { stats } = useStatsData()
  const location = useLocation()
  const { settings, isEditMode, toggleSecondaryStat, reorderSecondaryStats } =
    useDashboardSettings()

  const isStatisticsPage = location.pathname === '/statistics'

  const orderedStats = useMemo(() => {
    if (!settings.secondary_stats) return []
    return settings.secondary_stats
      .map((config) => {
        const def = SECONDARY_STATS.find((s) => s.id === config.id)
        return def ? { def, config } : null
      })
      .filter((item): item is { def: (typeof SECONDARY_STATS)[0]; config: any } => item !== null)
  }, [settings.secondary_stats])

  const activeStats = useMemo(() => {
    return orderedStats.filter((item) => item.config.enabled).map((item) => item.def)
  }, [orderedStats])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedStats.findIndex((s) => s.def.id === active.id)
    const newIndex = orderedStats.findIndex((s) => s.def.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSecondaryStats(oldIndex, newIndex)
    }
  }

  // En mode édition : afficher les toggles
  if (isEditMode) {
    return (
      <div
        className={`secondary-stats-panel ${isStatisticsPage ? 'statistics-page' : 'default-page'}`}
      >
        <div
          className="secondary-stats-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          <FontAwesomeIcon icon={faLayerGroup} />
          <span style={{ fontWeight: '600' }}>{t('editMode.widgets.statSecondary')}</span>
        </div>
        <div
          className="secondary-stats-edit"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedStats.map((s) => s.def.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedStats.map(({ def: stat, config }) => (
                <SortableStatItem
                  key={stat.id}
                  stat={stat}
                  isEnabled={config.enabled}
                  toggle={toggleSecondaryStat}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    )
  }

  // En mode normal : n'afficher rien si aucune stat n'est active
  if (!activeStats.length) return null

  return (
    <div
      className={`secondary-stats-grid ${isStatisticsPage ? 'statistics-page' : 'default-page'}`}
    >
      {activeStats.map((stat) => (
        <StatCard key={stat.id} title={t(stat.labelKey)} value={stat.compute(stats)} />
      ))}
    </div>
  )
}

export default React.memo(SectionStatSecondary)
