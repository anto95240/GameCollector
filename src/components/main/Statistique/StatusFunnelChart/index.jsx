import "./StatusFunnelChart.css";

import { useMemo } from "react";

const StatusFunnelChart = ({ stats, metadata = {} }) => {
  const statusData = useMemo(() => {
    if (!stats || !stats.funnel) return [];
    
    return stats.funnel.map(s => {
      const meta = metadata.statuses?.find(m => m._id === s.name);
      return {
        name: meta ? meta.status_name : "Inconnu",
        count: s.value,
        color: meta ? meta.color : "#555",
        pct: Math.round((s.value / stats.overview.totalGames) * 100) || 0
      };
    }).sort((a, b) => b.count - a.count);
  }, [stats, metadata]);

  if (!statusData.length) return null;
  const maxCount = statusData[0]?.count || 1;

  return (
    <div className="funnel-wrapper">
      <div className="funnel-header">
        <span className="funnel-title">Statuts de la collection</span>
        <span className="funnel-total">{stats.overview.totalGames} jeux</span>
      </div>
      <div className="funnel-bars">
        {statusData.map((s, i) => (
          <div key={i} className="funnel-row">
            <div className="funnel-label">
              <span className="funnel-dot" style={{ background: s.color }} />
              <span className="funnel-name">{s.name}</span>
            </div>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${(s.count / maxCount) * 100}%`, background: s.color }} />
            </div>
            <div className="funnel-stats">
              <span className="funnel-count">{s.count}</span>
              <span className="funnel-pct">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default StatusFunnelChart;