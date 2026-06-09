import './PlatformChart.css'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import CustomSelect from '@/components/common/CustomSelect'

export interface PlatformChartProps {
  stats: any;
  metadata?: {
    platforms?: any[];
    genres?: any[];
    statuses?: any[];
    [key: string]: any;
  };
}

const PlatformChart: React.FC<PlatformChartProps> = ({ stats, metadata = {} }: any) => {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState<any>(null)
  const [chartType, setChartType] = useState('platform')

  const chartData = useMemo(() => {
    if (!stats || !metadata) return []

    let rawData = []
    let metaList = []
    let nameKey = 'name'

    if (chartType === 'platform') {
      rawData = stats.platforms || []
      metaList = metadata.platforms || []
      nameKey = 'platform_name'
    } else if (chartType === 'genre') {
      rawData = (stats.radar || []).map((r: any) => ({ name: r.subject, value: r.A }))
      metaList = metadata.genres || []
      nameKey = 'genre_name'
    } else if (chartType === 'status') {
      rawData = stats.funnel || []
      metaList = metadata.statuses || []
      nameKey = 'status_name'
    }

    return rawData
      .map((item: any) => {
        const meta = metaList.find((m: any) => m._id === item.name)
        return {
          name: meta ? meta[nameKey] : 'Inconnu',
          value: item.value,
          color: meta?.color || '#5AF2FF',
        }
      })
      .filter((d: any) => d.value > 0)
  }, [stats, metadata, chartType])

  const options = [
    { value: 'platform', label: t('statistics.doughnut.platform') },
    { value: 'genre', label: t('statistics.doughnut.genre') },
    { value: 'status', label: t('statistics.doughnut.status') },
  ]

  return (
    <div className="platform-chart-wrapper">
      <div className="platform-chart-content">
        <div className="platform-chart-header">
          <CustomSelect options={options} value={chartType} onChange={(val: any) => setChartType(val as string)} />
        </div>
        <div className="platform-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
export default PlatformChart
