import GameCard from "../../../common/GameCard";
import "./DetailFooter.css";
import { useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import { useActiveOnScroll } from "../../../../hooks/useActiveOnScroll";

const MOCK_RECENT_GAMES = [
  {
    id: 101,
    name: "Elden Ring",
    image:
      "https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/phvVT0qZfcRms5qDAk0SI3CM.png",
    rating: 5,
    status: "Terminé",
  },
  {
    id: 102,
    name: "Cyberpunk 2077",
    image:
      "https://image.api.playstation.com/vulcan/ap/rnd/202311/2812/2855217417534444583b276707835109b02221295e869766.png",
    rating: 4,
    status: "En cours",
  },
  {
    id: 103,
    name: "Hades",
    image:
      "https://image.api.playstation.com/vulcan/ap/rnd/202104/0517/968c34749652f14300000000000000000000000000000000.png",
    rating: 5,
    status: "Terminé",
  },
  {
    id: 104,
    name: "Zelda BOTW",
    image:
      "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000000025/7137262b5a64d921e193653f8aa0b722925abc5680380ca0e18a77969113f010",
    rating: 5,
    status: "Terminé",
  },
];

const DetailFooter = () => {
  const scrollRef = useRef(null);
  const activeId = useActiveOnScroll(
    scrollRef,
    ".observer-item",
    MOCK_RECENT_GAMES,
  );

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <footer className="footer-section">
      <h3 className="footer-title">Récemment consultés</h3>

      <div className="detail-carousel relative w-full">
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
          {MOCK_RECENT_GAMES.map((gameMock) => (
            <div
              key={gameMock.id}
              className="recent-card-wrapper observer-item"
              data-id={String(gameMock.id)}
            >
              <GameCard
                variant="dashboard"
                game={gameMock}
                isActive={activeId === String(gameMock.id)}
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
    </footer>
  );
};

export default DetailFooter;
