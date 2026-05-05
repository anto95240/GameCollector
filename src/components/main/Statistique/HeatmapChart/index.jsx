import { useMemo } from "react";
import "./HeatmapChart.css";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const HeatmapChart = ({ stats }) => {
  const { heatData, maxCount, years } = useMemo(() => {
    if (!stats || !stats.heatmap) return { heatData: {}, maxCount: 1, years: [] };
    
    const counts = {};
    const yearSet = new Set();
    
    stats.heatmap.forEach(h => {
      const d = new Date(h.date);
      if (isNaN(d)) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      yearSet.add(y);
      counts[`${y}-${m}`] = (counts[`${y}-${m}`] || 0) + h.count;
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a).slice(0, 4);
    const maxC = Math.max(...Object.values(counts), 1);
    
    return { heatData: counts, maxCount: maxC, years: sortedYears };
  }, [stats]);

  const getIntensity = (count) => {
    if (!count) return 0;
    return Math.ceil((count / maxCount) * 4);
  };

  if (!years.length) return null;

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header">
        <span className="heatmap-title">Activité - Jeux ajoutés par mois</span>
      </div>
      <div className="heatmap-body">
        <div className="heatmap-months-row">
          <div className="heatmap-year-label" />
          {MONTHS.map(m => (
            <div key={m} className="heatmap-month-label">{m}</div>
          ))}
        </div>
        {years.map(year => (
          <div key={year} className="heatmap-row">
            <div className="heatmap-year-label">{year}</div>
            {MONTHS.map((_, mi) => {
              const count = heatData[`${year}-${mi}`] || 0;
              const intensity = getIntensity(count);
              return (
                <div key={mi} className={`heatmap-cell intensity-${intensity}`}>
                  {count > 0 && <span className="heatmap-count">{count}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
export default HeatmapChart;