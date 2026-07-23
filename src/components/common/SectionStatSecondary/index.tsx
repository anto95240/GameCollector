import './SectionStatSecondary.css'

import { faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import StatCard from '@/components/common/StatCard'
import { SECONDARY_STATS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'

const SectionStatSecondary = () => {
  const { t } = useTranslation()
  const { stats } = useStatsData()
  const location = useLocation()
  const { settings, isEditMode, toggleSecondaryStat } = useDashboardSettings()

  const isStatisticsPage = location.pathname === '/statistics'

  const activeStats = useMemo(() => {
    return SECONDARY_STATS.filter((def) => {
      const config = settings.secondary_stats?.find((s) => s.id === def.id)
      return config?.enabled
    })
  }, [settings.secondary_stats])

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
          {SECONDARY_STATS.map((stat) => {
            const config = settings.secondary_stats?.find((s) => s.id === stat.id)
            const isEnabled = config?.enabled ?? false

            return (
              <div
                key={stat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <FontAwesomeIcon icon={stat.icon} />
                  <span>{t(stat.labelKey)}</span>
                </div>
                <button
                  className={`metric-switch ${isEnabled ? 'active' : ''}`}
                  onClick={() => toggleSecondaryStat(stat.id)}
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
          })}
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
