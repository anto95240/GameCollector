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
                
                // On prend uniquement les 5 premiers pour le Dashboard.
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
                <h2 className="section-title">{t('dashboard.recentlyAdded') || "Récemment ajoutés"}</h2>
            </div>
            
            {isLoading ? (
                <p className="loading-text" style={{ padding: '20px 0' }}>Chargement des jeux...</p>
            ) : recentGames.length > 0 ? (
                <div className="game-cards-container">
                    {recentGames.map((game, index) => (
                        <GameCard 
                            key={game._id || index} 
                            game={{
                                ...game,
                                id: game._id
                            }} 
                            variant="dashboard" 
                            t={t}
                        />
                    ))}
                </div>
            ) : (
                <p style={{ padding: '20px 0', color: 'var(--text-secondary)' }}>
                    Aucun jeu trouvé. Commencez par en ajouter un !
                </p>
            )}
        </div>
    );
};

export default SectionGameCard;