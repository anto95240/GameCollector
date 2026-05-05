import { useMemo } from "react";
import "./StatusFunnelChart.css";

const StatusFunnelChart = ({ games = [], metadata = {} }) => {
  const statusData = useMemo(() => {
    const counts = {};
    games.forEach(g => {
      const status = metadata.statuses?.find(s => s._id === (g.status_id?._id || g.status_id));
      const name = status?.status_name || "Inconnu";
      const color = status?.color || "#555";
      if (!counts[name]) counts[name] = { count: 0, color };
      counts[name].count += 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, d]) => ({ name, count: d.count, color: d.color, pct: Math.round((d.count / games.length) * 100) }));
  }, [games, metadata]);

  if (!statusData.length) return null;

  const maxCount = statusData[0]?.count || 1;

  return (
    <div className="funnel-wrapper">
      <div className="funnel-header">
        <span className="funnel-title">Statuts de la collection</span>
        <span className="funnel-total">{games.length} jeux</span>
      </div>
      <div className="funnel-bars">
        {statusData.map((s, i) => (
          <div key={i} className="funnel-row">
            <div className="funnel-label">
              <span className="funnel-dot" style={{ background: s.color }} />
              <span className="funnel-name">{s.name}</span>
            </div>
            <div className="funnel-track">
              <div
                className="funnel-fill"
                style={{
                  width: `${(s.count / maxCount) * 100}%`,
                  background: s.color,
                  boxShadow: `0 0 8px ${s.color}40`,
                }}
              />
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