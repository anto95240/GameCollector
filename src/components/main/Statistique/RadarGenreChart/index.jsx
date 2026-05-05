import { useMemo } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import "./RadarGenreChart.css";

const RadarGenreChart = ({ stats, metadata = {} }) => {
  const data = useMemo(() => {
    if (!stats || !stats.radar) return [];
    
    return stats.radar.map(r => {
      const meta = metadata.genres?.find(m => m._id === r.subject);
      return {
        genre: meta ? meta.genre_name : "Inconnu",
        count: r.A
      };
    });
  }, [stats, metadata]);

  if (!data.length) return null;

  return (
    <div className="radar-genre-wrapper">
      <div className="radar-genre-content">
        <div className="radar-genre-header">
          <span className="radar-genre-title">Radar des genres</span>
        </div>
        <div className="radar-genre-container">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="genre" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
              <Radar name="Jeux" dataKey="count" stroke="var(--text-primary)" fill="var(--text-primary)" fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default RadarGenreChart;