import './DynamicDoughnutChart.css'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const CHART_COLORS = [
  '#0068AC',
  '#5AF2FF',
  '#36CDFA',
  '#6EB269',
  '#E9A23B',
  '#EF4444',
  '#9333EA',
  '#F43F5E',
]

const getRatingGroup = (rating: number | undefined | null) => {
  if (rating === undefined || rating === null || rating === 0) return 'Non noté'
  return `${rating} ★`
}

type DataSourceType = 'platform' | 'genre' | 'rating' | 'status'

const DynamicDoughnutChart = ({ stats, metadata }: any) => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<DataSourceType>('platform')

  const chartData = useMemo(() => {
    if (!stats || !stats.rawGames) return []

    const counts: Record<string, number> = {}

    stats.rawGames.forEach((g: any) => {
      if (dataSource === 'platform') {
        const platformName =
          metadata?.platforms?.find((p: any) => p.id === g.platform_id)?.platform_name || 'Inconnu'
        counts[platformName] = (counts[platformName] || 0) + 1
      } else if (dataSource === 'genre') {
        const genreName =
          metadata?.genres?.find((gen: any) => gen.id === g.genre_id)?.genre_name || 'Inconnu'
        counts[genreName] = (counts[genreName] || 0) + 1
      } else if (dataSource === 'rating') {
        const group = getRatingGroup(g.note)
        counts[group] = (counts[group] || 0) + 1
      } else if (dataSource === 'status') {
        const statusName = g.status?.status_name || 'Inconnu'
        counts[statusName] = (counts[statusName] || 0) + 1
      }
    })

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats, metadata, dataSource])

  if (!chartData.length) return null

  return (
    <div className="dynamic-doughnut-wrapper">
      <div className="dynamic-doughnut-content">
        <div className="dynamic-doughnut-header">
          <select
            className="dynamic-select"
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as DataSourceType)}
          >
            <option value="platform">{t('dynamicChart.platform')}</option>
            <option value="genre">{t('dynamicChart.genre')}</option>
            <option value="rating">{t('dynamicChart.rating')}</option>
            <option value="status">{t('dynamicChart.status')}</option>
          </select>
        </div>
        <div className="dynamic-doughnut-container">
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-area">
            {chartData.map((entry, index) => (
              <div key={index} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                <span className="legend-name">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default DynamicDoughnutChart
