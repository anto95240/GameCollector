import { useMemo } from "react";
import "./HeatmapChart.css";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const HeatmapChart = ({ games = [] }) => {
  const { heatData, maxCount, years } = useMemo(() => {
    const counts = {};
    const yearSet = new Set();

    games.forEach(g => {
      const d = new Date(g.createdAt);
      if (isNaN(d)) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      yearSet.add(y);
      const key = `${y}-${m}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a).slice(0, 4);
    const maxC = Math.max(...Object.values(counts), 1);

    return { heatData: counts, maxCount: maxC, years: sortedYears };
  }, [games]);

  const getIntensity = (count) => {
    if (!count) return 0;
    return Math.ceil((count / maxCount) * 4);
  };

  if (!years.length) return null;

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header">
        <span className="heatmap-title">Activité — Jeux ajoutés par mois</span>
        <div className="heatmap-legend">
          <span className="legend-label">Peu</span>
          {[1, 2, 3, 4].map(l => (
            <div key={l} className={`legend-cell intensity-${l}`} />
          ))}
          <span className="legend-label">Beaucoup</span>
        </div>
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
                <div
                  key={mi}
                  className={`heatmap-cell intensity-${intensity}`}
                  title={count ? `${MONTHS[mi]} ${year} : ${count} jeu${count > 1 ? "x" : ""}` : `${MONTHS[mi]} ${year} : aucun`}
                >
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