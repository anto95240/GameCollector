import { useState } from 'react';

export const useDashboard = () => {
    const [stats] = useState({
        totalGames: 2,
        favoriteCount: 1,
        platformCount: 1,
        genreCount: 1
    });

    const [recentGames] = useState([
        "Jeux 1", "Jeux 2", "Jeux 3", "Jeux 4", "Jeux 5"
    ]);

    return {
        stats,
        recentGames
    };
};