import './YearChart.css'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts'

const CHART_MARGIN = { top: 30, right: 0, left: 0, bottom: 0 }

const _YearTooltip = ({ label, value }: any) => {
  if (label === null || label === undefined) return null

  return (
    <div className="year-custom-tooltip">
      <div className="year-tooltip-label">{label}</div>
      <p className="year-tooltip-info">{value} jeux</p>
    </div>
  )
}

const BarShape = ({ x, y, width, height, fill, onHover, index }: any) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    fill={fill}
    rx={4}
    ry={4}
    onMouseEnter={() => onHover(index, { x, y, width, height })}
    onFocus={() => onHover(index, { x, y, width, height })}
  />
)

const YearChart = ({ stats }: any) => {
  const { t } = useTranslation()
  const [activeBar, setActiveBar] = useState<any>(null)

  const currentData = useMemo(() => {
    if (!stats || !stats.years) return []
    return stats.years.map((y: any) => ({
      name: y.year,
      count: y.count,
      color: '#0068AC',
    }))
  }, [stats])

  const handleHover = (index: number, geometry: any) => {
    const hoveredBar = currentData[index]

    if (!hoveredBar) return

    setActiveBar({
      label: hoveredBar.name,
      value: hoveredBar.count,
      centerX: geometry.x + geometry.width / 2,
      centerY: geometry.y + geometry.height / 2,
    })
  }

  const handleMouseLeave = () => {
    setActiveBar(null)
  }

  return (
    <div className="year-chart-wrapper">
      <div className="year-chart-content">
        <div className="year-chart-header">
          <span
            style={{ color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}
          >
            {t('statistics.barChart.gamesByYear')}
          </span>
        </div>
        <div className="year-chart-container" onMouseLeave={handleMouseLeave}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} margin={CHART_MARGIN}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                shape={(barProps: any) => <BarShape {...barProps} onHover={handleHover} />}
              >
                {currentData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {activeBar && (
            <div
              className="year-custom-tooltip year-custom-tooltip-fixed"
              style={{ left: activeBar.centerX, top: activeBar.centerY }}
            >
              <div className="year-tooltip-label">{activeBar.label}</div>
              <p className="year-tooltip-info">{activeBar.value} jeux</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default YearChart
