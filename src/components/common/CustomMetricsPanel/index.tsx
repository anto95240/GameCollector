import './CustomMetricsPanel.css'

import { faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CUSTOM_METRICS } from '@/config/widgetRegistry'
import { useDashboardSettings } from '@/context/DashboardSettingsContext'

interface CustomMetricsPanelProps {
  stats: any
}

const CustomMetricsPanel: React.FC<CustomMetricsPanelProps> = ({ stats }) => {
  const { t } = useTranslation()
  const { settings, isEditMode, toggleCustomMetric } = useDashboardSettings()

  const activeMetrics = useMemo(() => {
    return CUSTOM_METRICS.filter((def) => {
      const config = settings.custom_metrics?.find((m) => m.id === def.id)
      return config?.enabled
    })
  }, [settings.custom_metrics])

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
          {CUSTOM_METRICS.map((metric) => {
            const config = settings.custom_metrics?.find((m) => m.id === metric.id)
            const isEnabled = config?.enabled ?? false

            return (
              <div key={metric.id} className="custom-metric-toggle-row">
                <div className="custom-metric-toggle-left">
                  <FontAwesomeIcon icon={metric.icon} />
                  <span className="custom-metric-toggle-name">{t(metric.labelKey)}</span>
                </div>
                <button
                  className={`metric-switch ${isEnabled ? 'active' : ''}`}
                  onClick={() => toggleCustomMetric(metric.id)}
                >
                  <div className="metric-switch-knob" />
                </button>
              </div>
            )
          })}
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
