import './SectionStatPrimary.css'

import { useTranslation } from 'react-i18next'

import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'

const SectionStatPrimary = () => {
  const { t } = useTranslation()
  const { stats } = useStatsData()
  return (
    <div className="main-total-card">
      <h1 className="main-title">{t('dashboard.title')}</h1>

      <div className="total-info">
        <p className="total-label">{t('dashboard.totalGame')}</p>
        <p className="total-value">{stats.totalGames}</p>
      </div>
    </div>
  )
}

export default SectionStatPrimary
