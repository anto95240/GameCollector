import { useMemo, useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFire, faTrophy, faClock, faGamepad, faChartLine,
  faHeart, faStar, faCalendarAlt, faLightbulb, faRocket
} from "@fortawesome/free-solid-svg-icons";
import "./InsightsPanel.css";

// Composant pour gérer le défilement de chaque texte individuellement
const ScrollableText = ({ text, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cw = containerRef.current.clientWidth;
        const sw = textRef.current.scrollWidth;

        if (sw > cw) {
          setIsOverflowing(true);
          textRef.current.style.setProperty('--scroll-amount', `-${sw - cw}px`);
        } else {
          setIsOverflowing(false);
          textRef.current.style.removeProperty('--scroll-amount');
        }
      }
    };

    const observer = new ResizeObserver(() => checkOverflow());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Petit délai pour s'assurer que le rendu (polices, etc.) est terminé
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [text]);

  return (
    <div ref={containerRef} className="scrollable-container">
      <span ref={textRef} className={`${className} ${isOverflowing ? "scrolling" : ""}`}>
        {text}
      </span>
    </div>
  );
};

const InsightsPanel = ({ games = [], metadata = {} }) => {
  const insights = useMemo(() => {
    if (!games.length) return [];
    const result = [];

    // Favorite genre
    const genreCounts = {};
    games.forEach(g => {
      const name = metadata.genres?.find(mg => (mg._id === (g.genre_id?._id || g.genre_id)))?.genre_name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    if (topGenre) {
      const pct = Math.round((topGenre[1] / games.length) * 100);
      result.push({ icon: faGamepad, color: "cyan", label: "Genre favori", value: topGenre[0], sub: `${pct}% de ta collection`, pulse: pct > 40 });
    }

    // Favorite platform
    const platCounts = {};
    games.forEach(g => {
      const name = metadata.platforms?.find(p => p._id === (g.platform_id?._id || g.platform_id))?.platform_name;
      if (name) platCounts[name] = (platCounts[name] || 0) + 1;
    });
    const topPlat = Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0];
    if (topPlat) {
      result.push({ icon: faRocket, color: "purple", label: "Plateforme principale", value: topPlat[0], sub: `${topPlat[1]} jeux` });
    }

    // Total playtime
    const totalTime = games.reduce((acc, g) => acc + (Number(g.playing_time) || 0), 0);
    if (totalTime > 0) {
      const days = Math.floor(totalTime / 24);
      result.push({ icon: faClock, color: "orange", label: "Temps de jeu total", value: `${totalTime}h`, sub: days > 0 ? `~ ${days} jour${days > 1 ? "s" : ""}` : "Continuez ainsi !" });
    }

    // Average rating
    const rated = games.filter(g => g.note != null && g.note > 0);
    if (rated.length) {
      const avg = (rated.reduce((a, g) => a + g.note, 0) / rated.length).toFixed(1);
      result.push({ icon: faStar, color: "yellow", label: "Note moyenne", value: `${avg}/5`, sub: `${rated.length} jeu${rated.length > 1 ? "x" : ""} noté${rated.length > 1 ? "s" : ""}` });
    }

    // Completion rate
    const completed = games.filter(g => {
      const s = metadata.statuses?.find(st => st._id === (g.status_id?._id || g.status_id))?.status_name || "";
      return s.toLowerCase().includes("termin");
    });
    if (games.length > 0) {
      const rate = Math.round((completed.length / games.length) * 100);
      result.push({ icon: faTrophy, color: rate > 50 ? "green" : "red", label: "Taux de complétion", value: `${rate}%`, sub: `${completed.length} / ${games.length} jeux terminés`, pulse: rate > 60 });
    }

    // Favorite year
    const yearCounts = {};
    games.forEach(g => { if (g.year) yearCounts[g.year] = (yearCounts[g.year] || 0) + 1; });
    const topYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];
    if (topYear) {
      result.push({ icon: faCalendarAlt, color: "blue", label: "Année préférée", value: topYear[0], sub: `${topYear[1]} jeux de cette année` });
    }

    // Favorites count
    const favCount = games.filter(g => g.isFavorite).length;
    if (favCount > 0) {
      result.push({ icon: faHeart, color: "pink", label: "Coups de cœur", value: favCount, sub: `${Math.round((favCount / games.length) * 100)}% de ta collection` });
    }

    // Wishlist
    const wishlist = games.filter(g => g.isSoon).length;
    if (wishlist > 0) {
      result.push({ icon: faFire, color: "orange", label: "Wishlist", value: wishlist, sub: "Jeux attendus", pulse: wishlist > 5 });
    }

    // Collection growth trend
    const now = new Date();
    const thisYear = now.getFullYear();
    const addedThisYear = games.filter(g => new Date(g.createdAt).getFullYear() === thisYear).length;
    if (addedThisYear > 0) {
      result.push({ icon: faChartLine, color: "green", label: `Collection ${thisYear}`, value: `+${addedThisYear}`, sub: "Jeux ajoutés cette année" });
    }

    return result.slice(0, 8);
  }, [games, metadata]);

  const colors = {
    cyan: "var(--text-primary)",
    purple: "#a78bfa",
    orange: "var(--status-warning)",
    yellow: "var(--color-star-note)",
    green: "var(--status-success)",
    red: "var(--status-danger)",
    blue: "var(--status-info)",
    pink: "#f472b6",
  };

  if (!insights.length) return null;

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <FontAwesomeIcon icon={faLightbulb} className="insights-icon" />
        <span>Insights</span>
        <div className="insights-badge">{insights.length}</div>
      </div>

      <div className="insights-grid">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-card ${ins.pulse ? "pulse" : ""}`} style={{ "--accent": colors[ins.color] || "var(--text-primary)" }}>
            <div className="insight-icon-wrap">
              <FontAwesomeIcon icon={ins.icon} className="insight-icon" />
            </div>
            <div className="insight-body">
              <ScrollableText text={ins.label} className="insight-label" />
              <span className="insight-value">{ins.value}</span>
              <ScrollableText text={ins.sub} className="insight-sub" />
            </div>
            <div className="insight-glow" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;