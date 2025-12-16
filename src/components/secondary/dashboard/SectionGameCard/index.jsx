import { useRef } from "react";
import "./sectionGameCard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../../hooks/useDashboard";
// import GameCard from "../GameCard";
import GameCard from "../../../common/GameCard";


const SectionGameCard = ({t}) => {
    const { recentGames } = useDashboard();
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 200; // Distance du scroll en pixels
            
            if (direction === "left") {
                current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
        }
    };
    
    return (
        <div className="recent-games-section">
            <h2 className="section-title">{t('dashboard.recentlyAdded')}</h2>

            <div className="games-carousel relative w-full">
                {/* Flèche gauche mobile */}
                <button 
                    className="carousel-arrow arrow-left" 
                    onClick={() => scroll("left")}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="game-cards-container flex no-scrollbar" ref={scrollRef}>
                    {recentGames.map((game, i) => (
                        <div 
                           key={i} 
                           className="console-entry-anim w-full"
                        >
                            <GameCard game={game} variant="dashboard" />
                        </div>
                    ))}
                </div>

                {/* Flèche droite mobile */}
                <button 
                    className="carousel-arrow arrow-right" 
                    onClick={() => scroll("right")}
                >
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        </div>
    );
};

export default SectionGameCard;