import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import GameCard from "../../../common/GameCard";
import { useApiGame } from "../../../../hooks/api/useApiGame";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useActiveOnScroll } from "../../../../hooks/components/useActiveOnScroll";
import "./SectionGameCard.css";

const SectionGameCard = () => {
  const { t } = useTranslation();
  const { getAllGames } = useApiGame();

  const [recentGames, setRecentGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const scrollRef = useRef(null);
  const activeId = useActiveOnScroll(scrollRef, ".observer-item", recentGames);

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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const itemNode = scrollRef.current.querySelector(".observer-item");
      const scrollAmount = itemNode ? itemNode.offsetWidth + (window.innerWidth <= 768 ? 15 : 20) : 230;
      if (direction === "left") scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      else scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="section-game-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.recentlyAdded")}</h2>
      </div>

      {isLoading ? (
        <p className="loading-text">{t("dashboard.loading")}</p>
      ) : recentGames.length > 0 ? (
        <div className="games-carousel">
          <button className="carousel-arrow arrow-left" onClick={() => scroll("left")}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <div className="game-cards-container" ref={scrollRef}>
            {recentGames.map((game, index) => (
              <div 
                key={game._id || index} 
                className="console-entry-anim observer-item" 
                data-id={String(game._id)}
              >
                <GameCard
                  game={{ ...game, id: game._id }}
                  variant="dashboard"
                  t={t}
                  isActive={activeId === String(game._id)}
                />
              </div>
            ))}
          </div>

          <button className="carousel-arrow arrow-right" onClick={() => scroll("right")}>
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      ) : (
        <p className="no-game-txt">{t("dashboard.noGame")}</p>
      )}
    </div>
  );
};

export default SectionGameCard;