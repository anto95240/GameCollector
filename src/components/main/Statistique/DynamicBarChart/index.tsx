import './DynamicBarChart.css'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts'

const CHART_MARGIN = { top: 30, right: 0, left: 0, bottom: 0 }

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

type BarDataSource = 'year' | 'tag'

const DynamicBarChart = ({ stats }: any) => {
  const { t } = useTranslation()
  const [activeBar, setActiveBar] = useState<any>(null)

  const [dataSource, setDataSource] = useState<BarDataSource>('year')
  const [selectedDecade, setSelectedDecade] = useState<string>('all')
  const [tagPage, setTagPage] = useState<number>(0)

  const availableDecades = useMemo(() => {
    if (!stats || !stats.rawGames) return []
    const decades = new Set<string>()
    stats.rawGames.forEach((g: any) => {
      if (g.year) {
        decades.add(`${Math.floor(Number(g.year) / 10) * 10}s`)
      }
    })
    return Array.from(decades).sort((a, b) => parseInt(a) - parseInt(b))
  }, [stats])

  const allTagData = useMemo(() => {
    if (!stats || !stats.rawGames) return []
    const counts: Record<string, number> = {}
    stats.rawGames.forEach((g: any) => {
      g.tags?.forEach((tWrapper: any) => {
        const tagName = tWrapper.tag?.tag_name
        if (tagName) {
          counts[tagName] = (counts[tagName] || 0) + 1
        }
      })
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  const maxTagPages = Math.ceil(allTagData.length / 10) || 1

  const currentData = useMemo(() => {
    if (dataSource === 'tag') {
      const start = tagPage * 10
      return allTagData.slice(start, start + 10).map((item) => ({
        ...item,
        color: '#6EB269', // Green for tags to differentiate
      }))
    } else {
      const yearCounts: Record<string, number> = {}
      stats?.rawGames?.forEach((g: any) => {
        if (!g.year) return
        const decade = `${Math.floor(Number(g.year) / 10) * 10}s`
        if (selectedDecade !== 'all' && decade !== selectedDecade) return

        const yearStr = g.year.toString()
        yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1
      })

      return Object.entries(yearCounts)
        .map(([year, count]) => ({
          name: year,
          count,
          color: '#0068AC', // Blue for years
        }))
        .sort((a, b) => Number(a.name) - Number(b.name))
    }
  }, [dataSource, selectedDecade, tagPage, allTagData, stats])

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

  const metricLabel = dataSource === 'year' ? t('yearChart.games').toLowerCase() : 'jeux'

  return (
    <div className="dynamic-bar-wrapper">
      <div className="dynamic-bar-content">
        <div className="dynamic-bar-header">
          <select
            className="dynamic-select-title"
            value={dataSource}
            onChange={(e) => {
              setDataSource(e.target.value as BarDataSource)
              setActiveBar(null)
            }}
          >
            <option value="year">{t('dynamicChart.barYear')}</option>
            <option value="tag">{t('dynamicChart.barTag')}</option>
          </select>

          <div className="dynamic-bar-controls">
            {dataSource === 'year' ? (
              <select
                className="dynamic-select-filter"
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(e.target.value)}
              >
                <option value="all">{t('yearChart.allDecades')}</option>
                {availableDecades.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="dynamic-select-filter"
                value={tagPage}
                onChange={(e) => setTagPage(Number(e.target.value))}
              >
                {Array.from({ length: maxTagPages }).map((_, i) => {
                  const start = i * 10 + 1
                  const end = Math.min((i + 1) * 10, allTagData.length) || 1
                  return (
                    <option key={i} value={i}>
                      Tags {start} - {end}
                    </option>
                  )
                })}
              </select>
            )}
          </div>
        </div>
        <div className="dynamic-bar-container" onMouseLeave={handleMouseLeave}>
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
              className="dynamic-custom-tooltip dynamic-custom-tooltip-fixed"
              style={{ left: activeBar.centerX, top: activeBar.centerY }}
            >
              <div className="dynamic-tooltip-label">{activeBar.label}</div>
              <p className="dynamic-tooltip-info">
                {activeBar.value} {metricLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default DynamicBarChart
