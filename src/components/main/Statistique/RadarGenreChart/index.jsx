import { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip
} from "recharts";
import "./RadarGenreChart.css";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="radar-tooltip">
        <p className="radar-tooltip-label">{payload[0].payload.genre}</p>
        <p className="radar-tooltip-value">{payload[0].value} jeu{payload[0].value > 1 ? "x" : ""}</p>
      </div>
    );
  }
  return null;
};

const RadarGenreChart = ({ games = [], metadata = {} }) => {
  const data = useMemo(() => {
    const counts = {};
    games.forEach(g => {
      const genre = metadata.genres?.find(mg => mg._id === (g.genre_id?._id || g.genre_id));
      const name = genre?.genre_name || "Inconnu";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, count]) => ({ genre, count }));
  }, [games, metadata]);

  if (!data.length) return null;

  return (
    <div className="radar-genre-wrapper">
      <div className="radar-genre-content">
        <div className="radar-genre-header">
          <span className="radar-genre-title">Radar des genres</span>
        </div>
        <div className="radar-genre-container">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="genre"
                tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-family-text)" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, "auto"]}
                tick={{ fill: "var(--text-secondary)", fontSize: 9 }}
                stroke="var(--border-subtle)"
              />
              <Radar
                name="Jeux"
                dataKey="count"
                stroke="var(--text-primary)"
                fill="var(--text-primary)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default RadarGenreChart;