import './SectionStatSecondary.css'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import StatCard from '@/components/common/StatCard'
import { useStatsData } from '@/hooks/domains/dashboard/useStatsData'

const SectionStatSecondary = () => {
  const { t } = useTranslation()
  const { stats } = useStatsData()
  const location = useLocation()

  const isStatisticsPage = location.pathname === '/statistics'

  return (
    <div
      className={`secondary-stats-grid ${isStatisticsPage ? 'statistics-page' : 'default-page'}`}
    >
      <StatCard title={t('dashboard.favorite')} value={stats?.favoriteCount ?? '-'} />
      <StatCard title={t('dashboard.platform')} value={stats?.platformCount ?? '-'} />
      <StatCard title={t('dashboard.genre')} value={stats?.genreCount ?? '-'} />

      {isStatisticsPage && <StatCard title={t('dashboard.totalGame')} value={stats?.totalGames ?? '-'} />}
    </div>
  )
}

export default React.memo(SectionStatSecondary)
