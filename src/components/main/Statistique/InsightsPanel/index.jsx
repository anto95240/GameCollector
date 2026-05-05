import { useMemo, useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faGamepad, faStar, faLightbulb, faRocket } from "@fortawesome/free-solid-svg-icons";
import "./InsightsPanel.css";

const ScrollableText = ({ text, className }) => {
  // ... (Garde ton composant ScrollableText exactement comme il était)
  return <span className={className}>{text}</span>;
};

const InsightsPanel = ({ stats, metadata = {} }) => {
  const insights = useMemo(() => {
    if (!stats || !stats.overview) return [];
    const result = [];
    const { totalGames, topPlatform, topGenre } = stats.overview;

    if (totalGames > 0) {
      result.push({ icon: faTrophy, color: "green", label: "Taille de la collection", value: `${totalGames} Jeux` });
    }

    if (topGenre && topGenre !== 'N/A') {
      const genreMeta = metadata.genres?.find(g => g._id === topGenre);
      result.push({ icon: faGamepad, color: "cyan", label: "Genre favori", value: genreMeta ? genreMeta.genre_name : "Inconnu" });
    }

    if (topPlatform && topPlatform !== 'N/A') {
      const platMeta = metadata.platforms?.find(p => p._id === topPlatform);
      result.push({ icon: faRocket, color: "purple", label: "Plateforme préférée", value: platMeta ? platMeta.platform_name : "Inconnue" });
    }

    return result;
  }, [stats, metadata]);

  const colors = {
    cyan: "var(--text-primary)", purple: "#a78bfa", green: "var(--status-success)"
  };

  if (!insights.length) return null;

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <FontAwesomeIcon icon={faLightbulb} className="insights-icon" />
        <span>Insights</span>
      </div>
      <div className="insights-grid">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-card`} style={{ "--accent": colors[ins.color] }}>
            <div className="insight-icon-wrap">
              <FontAwesomeIcon icon={ins.icon} className="insight-icon" />
            </div>
            <div className="insight-body">
              <ScrollableText text={ins.label} className="insight-label" />
              <span className="insight-value">{ins.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default InsightsPanel;