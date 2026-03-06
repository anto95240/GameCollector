import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import GameCard from "../../../common/GameCard";
import { useActiveOnScroll } from "../../../../hooks/components/useActiveOnScroll";
import { useApiAuth } from "../../../../hooks/api/useApiAuth";
import "./DetailFooter.css";

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

        const viewedGames = historyGames.filter((g) => {
          if (!g) return false;
          const gameSlug = g.name
            .toLowerCase()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "");
          return (
            String(g._id) !== String(currentIdentifier) &&
            gameSlug !== currentIdentifier
          );
        });

        const formattedGames = viewedGames.slice(0, 5).map((g) => ({
          ...g,
          id: g._id,
          image: g.image?.startsWith("http")
            ? g.image
            : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${g.image}`,
        }));

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
            {suggestedGames.map((game) => (
              <div
                key={game.id}
                className="recent-card-wrapper mx-auto observer-item"
                data-id={String(game.id)}
              >
                <GameCard
                  variant="dashboard"
                  game={game}
                  isActive={activeId === String(game.id)}
                  t={t}
                />
              </div>
            ))}
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
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            padding: "20px 0",
          }}
        >
          Aucun autre jeu disponible.
        </p>
      )}
    </footer>
  );
};

export default DetailFooter;
