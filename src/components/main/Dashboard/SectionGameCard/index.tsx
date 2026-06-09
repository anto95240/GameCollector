import "./SectionGameCard.css";

import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef,useState } from "react";
import { useTranslation } from "react-i18next";

import GameCard from "@/components/common/GameCard";
import SkeletonList from "@/components/common/Skeleton/SkeletonList";
import { useApiGame } from "@/hooks/api/useApiGame";
import { useActiveOnScroll } from "@/hooks/ui/useActiveOnScroll";
import { extractGamesList, formatGamesForCarousel } from "@/utils/formatters";

const SectionGameCard = () => {
  const { t } = useTranslation();
  const { getAllGames } = useApiGame();

  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const scrollRef = useRef(null);
  const activeId = useActiveOnScroll(scrollRef, ".observer-item", recentGames);

  useEffect(() => {
    const fetchRecentGames = async () => {
      setIsLoading(true);
      try {
        const data = await getAllGames();
        setRecentGames(formatGamesForCarousel(extractGamesList(data).slice(0, 5)));
      } catch (error) {
        console.error("Erreur lors du chargement des jeux récents", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentGames();
  }, [getAllGames]);

  const scroll = useCallback((direction: string) => {
    if (scrollRef.current) {
      const itemNode = (scrollRef.current as any).querySelector(".observer-item");
      const scrollAmount = itemNode ? itemNode.offsetWidth + (window.innerWidth <= 768 ? 15 : 20) : 230;
      if (direction === "left") (scrollRef.current as any).scrollBy({ left: -scrollAmount, behavior: "smooth" });
      else (scrollRef.current as any).scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }, []);

  const handleScrollLeft = useCallback(() => {
    scroll("left");
  }, [scroll]);

  const handleScrollRight = useCallback(() => {
    scroll("right");
  }, [scroll]);

  return (
    <div className="section-game-card">
      <div className="section-header">
        <h2 className="section-title">{t("dashboard.recentlyAdded")}</h2>
      </div>

      {isLoading ? (
        <div className="games-carousel">
          <SkeletonList count={5} />
        </div>
      ) : recentGames.length > 0 ? (
        <div className="games-carousel">
          <button className="carousel-arrow arrow-left" onClick={handleScrollLeft}>
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
                  game={game}
                  variant="dashboard"
                  t={t}
                  isActive={activeId === String(game._id)}
                />
              </div>
            ))}
          </div>

          <button className="carousel-arrow arrow-right" onClick={handleScrollRight}>
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