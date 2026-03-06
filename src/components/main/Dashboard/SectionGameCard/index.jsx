import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import GameCard from "../../../common/GameCard";
import { useApiGame } from "../../../../hooks/api/useApiGame";
import "./SectionGameCard.css";

const SectionGameCard = () => {
  const { t } = useTranslation();
  const { getAllGames } = useApiGame();

  const [recentGames, setRecentGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentGames = async () => {
      setIsLoading(true);
      try {
        const data = await getAllGames();
        const gamesList = Array.isArray(data) ? data : data.games || [];

        setRecentGames(gamesList.slice(0, 5));
      } catch (error) {
        console.error("Erreur lors du chargement des jeux récents", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentGames();
  }, [getAllGames]);

  return (
    <div className="section-game-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.recentlyAdded")}</h2>
      </div>

      {isLoading ? (
        <p className="loading-text">{t("dashboard.loading")}</p>
      ) : recentGames.length > 0 ? (
        <div className="game-cards-container">
          {recentGames.map((game, index) => (
            <GameCard
              key={game._id || index}
              game={{
                ...game,
                id: game._id,
              }}
              variant="dashboard"
              t={t}
            />
          ))}
        </div>
      ) : (
        <p className="no-game-txt">{t("dashboard.noGame")}</p>
      )}
    </div>
  );
};

export default SectionGameCard;
