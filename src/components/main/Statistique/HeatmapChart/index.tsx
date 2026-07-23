import './HeatmapChart.css'

import { useMemo } from 'react'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const HeatmapChart = ({ stats }: any) => {
  const { heatData, maxCount, years } = useMemo(() => {
    if (!stats || !stats.rawGames) return { heatData: {}, maxCount: 1, years: [] }

    const counts: Record<string, any> = {}
    const yearSet = new Set()

    stats.rawGames.forEach((g: any) => {
      const d = new Date(g.created_at)
      if (isNaN(d.getTime())) return
      const y = d.getFullYear()
      const m = d.getMonth()
      yearSet.add(y)
      counts[`${y}-${m}`] = (counts[`${y}-${m}`] || 0) + 1
    })

    const sortedYears = Array.from(yearSet)
      .sort((a: any, b: any) => b - a)
      .slice(0, 4)
    const maxC = Math.max(...Object.values(counts), 1)

    return { heatData: counts, maxCount: maxC, years: sortedYears }
  }, [stats])

  const getIntensity = (count: number) => {
    if (!count) return 0
    return Math.ceil((count / maxCount) * 4)
  }

  if (!years.length) return null

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header">
        <span className="heatmap-title">Activité - Jeux ajoutés par mois</span>
      </div>
      <div className="heatmap-body">
        <div className="heatmap-months-row">
          <div className="heatmap-year-label" />
          {MONTHS.map((m: any) => (
            <div key={m} className="heatmap-month-label">
              {m}
            </div>
          ))}
        </div>
        {years.map((year: any) => (
          <div key={year} className="heatmap-row">
            <div className="heatmap-year-label">{year}</div>
            {MONTHS.map((_: any, mi: any) => {
              const count = heatData[`${year}-${mi}`] || 0
              const intensity = getIntensity(count)
              return (
                <div key={mi} className={`heatmap-cell intensity-${intensity}`}>
                  {count > 0 && <span className="heatmap-count">{count}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
export default HeatmapChart
