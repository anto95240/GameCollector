import './CompletionProgress.css'

import { faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface CompletionProgressProps {
  stats: any
}

const CompletionProgress: React.FC<CompletionProgressProps> = ({ stats }) => {
  const { t } = useTranslation()

  const data = useMemo(() => {
    if (!stats) return null

    const total = stats.totalGames || 0
    const completed = stats.completedCount || 0
    const inProgress = stats.inProgressCount || 0
    const other = total - completed - inProgress
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, inProgress, other, pct }
  }, [stats])

  if (!data || data.total === 0) return null

  return (
    <div className="completion-progress">
      <div className="completion-header">
        <div className="completion-title">
          <FontAwesomeIcon icon={faTrophy} />
          <span>{t('editMode.widgets.completionProgress')}</span>
        </div>
        <div className="completion-fraction">
          {data.completed} <span className="completion-total">/ {data.total}</span>
        </div>
      </div>

      <div className="completion-bar-wrapper">
        <div className="completion-bar-fill" style={{ width: `${data.pct}%` }} />
      </div>

      <div className="completion-pct">{data.pct}%</div>

      <div className="completion-breakdown">
        <div className="completion-status-item">
          <span className="completion-status-dot dot-completed" />
          <span>{t('editMode.widgets.completed')}</span>
          <span className="completion-status-count">{data.completed}</span>
        </div>
        <div className="completion-status-item">
          <span className="completion-status-dot dot-in-progress" />
          <span>{t('editMode.widgets.inProgress')}</span>
          <span className="completion-status-count">{data.inProgress}</span>
        </div>
        <div className="completion-status-item">
          <span className="completion-status-dot dot-other" />
          <span>{t('editMode.widgets.otherStatus')}</span>
          <span className="completion-status-count">{data.other}</span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(CompletionProgress)
