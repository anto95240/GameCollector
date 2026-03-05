import { useState, useEffect } from 'react';
import { useApiGame } from '../api/useApiGame';
import { useApiMetadata } from '../api/useApiMetadata';

export const useDashboard = () => {
    const { getAllGames } = useApiGame();
    const { getAllMetadata } = useApiMetadata();

    const [stats, setStats] = useState({
        totalGames: 0,
        favoriteCount: 0,
        platformCount: 0,
        genreCount: 0
    });

    const [recentGames, setRecentGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [gamesData, metaData] = await Promise.all([
                    getAllGames(),
                    getAllMetadata()
                ]);

                const gamesList = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
                
                // --- Calcul des Stats ---
                const total = gamesList.length;
                const favCount = gamesList.filter(g => g.isFavorite).length;

                // Compter les plateformes et genres uniques utilisés par le joueur
                const uniquePlatforms = new Set(gamesList.map(g => g.platform_id?._id || g.platform_id).filter(Boolean));
                const uniqueGenres = new Set(gamesList.map(g => g.genre_id?._id || g.genre_id).filter(Boolean));

                setStats({
                    totalGames: total,
                    favoriteCount: favCount,
                    platformCount: uniquePlatforms.size,
                    genreCount: uniqueGenres.size
                });

                // --- Récupération des jeux récents ---
                // On formate les jeux pour qu'ils aient un "id" direct
                const formattedRecent = gamesList.slice(0, 5).map(g => ({
                    ...g,
                    id: g._id,
                    image: g.image?.startsWith('http') ? g.image : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${g.image}`
                }));

                setRecentGames(formattedRecent);

            } catch (error) {
                console.error("Erreur de chargement du dashboard", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [getAllGames, getAllMetadata]);

    return {
        stats,
        recentGames,
        isLoading
    };
};