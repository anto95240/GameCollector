import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faMedal } from "@fortawesome/free-solid-svg-icons";
import "./TopGamesWidget.css";

const MEDALS = ["🥇", "🥈", "🥉"];

const TopGamesWidget = ({ games = [], metadata = {} }) => {
  const topGames = useMemo(() => {
    return games
      .filter(g => g.note != null && g.note > 0)
      .sort((a, b) => b.note - a.note)
      .slice(0, 5)
      .map(g => ({
        ...g,
        platformName: metadata.platforms?.find(p => p._id === (g.platform_id?._id || g.platform_id))?.platform_name || "",
        genreName: metadata.genres?.find(mg => mg._id === (g.genre_id?._id || g.genre_id))?.genre_name || "",
        imageUrl: g.image
          ? g.image.startsWith("http") ? g.image : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${g.image}`
          : null,
      }));
  }, [games, metadata]);

  const recentGames = useMemo(() => {
    return [...games]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map(g => ({
        ...g,
        imageUrl: g.image
          ? g.image.startsWith("http") ? g.image : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${g.image}`
          : null,
      }));
  }, [games]);

  return (
    <div className="top-games-wrapper">
      {/* Top rated */}
      <div className="top-games-section">
        <div className="top-games-section-header">
          <FontAwesomeIcon icon={faMedal} />
          <span>Top 5 meilleures notes</span>
        </div>
        <div className="top-games-list">
          {topGames.length === 0 && <p className="top-games-empty">Notez vos jeux pour les voir apparaître ici</p>}
          {topGames.map((g, i) => (
            <div key={g._id} className="top-game-row">
              <span className="top-game-rank">{MEDALS[i] || `#${i + 1}`}</span>
              <div
                className="top-game-cover"
                style={g.imageUrl ? { backgroundImage: `url("${g.imageUrl}")` } : {}}
              />
              <div className="top-game-info">
                <span className="top-game-name">{g.name}</span>
                <span className="top-game-meta">{g.platformName} {g.platformName && g.genreName ? "·" : ""} {g.genreName}</span>
              </div>
              <div className="top-game-rating">
                {Array.from({ length: 5 }).map((_, si) => (
                  <FontAwesomeIcon
                    key={si}
                    icon={faStar}
                    className={si < g.note ? "star-filled" : "star-empty"}
                  />
                ))}
                <span className="rating-num">{g.note}/5</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent additions */}
      <div className="top-games-section">
        <div className="top-games-section-header">
          <span>⚡</span>
          <span>Derniers ajouts</span>
        </div>
        <div className="recent-games-list">
          {recentGames.map(g => (
            <div key={g._id} className="recent-game-item">
              <div
                className="recent-game-cover"
                style={g.imageUrl ? { backgroundImage: `url("${g.imageUrl}")` } : {}}
              />
              <div className="recent-game-info">
                <span className="recent-game-name">{g.name}</span>
                <span className="recent-game-date">
                  {new Date(g.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {g.isFavorite && <span className="recent-fav">❤️</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopGamesWidget;