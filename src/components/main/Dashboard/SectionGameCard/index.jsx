import { useRef, useEffect } from "react";
import "./SectionGameCard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "../../../../hooks/useDashboard";
import { useActiveOnScroll } from "../../../../hooks/useActiveOnScroll";
import GameCard from "../../../common/GameCard";

const SectionGameCard = ({t}) => {
    const { recentGames } = useDashboard();
    const scrollRef = useRef(null);
    const activeId = useActiveOnScroll(scrollRef, ".observer-item", recentGames);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
        }
    }, [recentGames]); 

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 200;
            
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

            <div className="games-carousel">
                <button 
                    className="carousel-arrow arrow-left" 
                    onClick={() => scroll("left")}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="game-cards-container no-scrollbar" ref={scrollRef}>
                    {recentGames.map((game, i) => (
                        <div 
                            key={game.id || i} 
                            className="console-entry-anim observer-item"
                            data-id={String(game.id || i)}
                        >
                            <GameCard 
                                game={game} 
                                variant="dashboard" 
                                isActive={activeId === String(game.id || i)}
                            />
                        </div>
                    ))}
                </div>

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