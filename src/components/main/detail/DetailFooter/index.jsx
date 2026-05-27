import "./DetailFooter.css";

import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect,useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import GameCard from "@/components/common/GameCard";
import { useApiAuth } from "@/hooks/api/useApiAuth";
import { useActiveOnScroll } from "@/hooks/ui/useActiveOnScroll";
import { deduplicateGames, formatGamesForCarousel, isSameGame } from "@/utils/formatters";

const DetailFooter = () => {
  const scrollRef = useRef(null);
  const { t } = useTranslation();
  const { id, slug, gameName } = useParams();

  const { getGameHistory } = useApiAuth();

  const [suggestedGames, setSuggestedGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestedGames = async () => {
      setIsLoading(true);
      try {
        const historyGames = await getGameHistory();
        const currentIdentifier = id || slug || gameName;

        // Filtrer les jeux: exclure le jeu courant et dédupliquer
        const filteredGames = (historyGames || []).filter(g => 
          g && !isSameGame(g, currentIdentifier)
        );

        const uniqueGames = deduplicateGames(filteredGames);
        const topGames = uniqueGames.slice(0, 5);
        const formattedGames = formatGamesForCarousel(topGames);

        setSuggestedGames(formattedGames);
      } catch (error) {
        console.error("Erreur lors du chargement des suggestions", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedGames();
  }, [getGameHistory, id, slug, gameName]);

  const activeId = useActiveOnScroll(
    scrollRef,
    ".observer-item",
    suggestedGames,
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [suggestedGames]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 230;
      if (direction === "left")
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      else current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <footer className="footer-section">
      <h3 className="footer-title">
        {t("gameDetail.recentlySeen") || "Récemment regardé"}
      </h3>

      {isLoading ? (
        <p
          className="loading-text"
          style={{ textAlign: "center", padding: "20px 0" }}
        >
          Chargement...
        </p>
      ) : suggestedGames.length > 0 ? (
        <div className="detail-carousel mx-auto">
          {/* Flèche gauche */}
          <button
            className="list-arrow arrow-left"
            onClick={(e) => {
              e.stopPropagation();
              scroll("left");
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <div className="recent-scroll no-scrollbar" ref={scrollRef}>
            {suggestedGames.map((game, index) => {
              // --- CORRECTION 2 : ID garanti 100% unique pour l'animation HTML ---
              const uniqueDomId = `${game.id || 'game'}-${index}`;
              
              return (
                <div
                  key={uniqueDomId}
                  className="recent-card-wrapper mx-auto observer-item"
                  data-id={uniqueDomId}
                >
                  <GameCard
                    variant="dashboard"
                    game={game}
                    isActive={activeId === uniqueDomId}
                    t={t}
                  />
                </div>
              );
            })}
          </div>

          {/* Flèche droite */}
          <button
            className="list-arrow arrow-right"
            onClick={(e) => {
              e.stopPropagation();
              scroll("right");
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      ) : (
        <p className="noGame">
          Aucun autre jeu disponible.
        </p>
      )}
    </footer>
  );
};

export default DetailFooter;