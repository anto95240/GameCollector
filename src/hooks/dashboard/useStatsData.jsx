import { useState, useEffect } from "react";
import { useApiGame } from "../api/useApiGame";
import { useApiMetadata } from "../api/useApiMetadata";

export const useStatsData = () => {
  const { getAllGames } = useApiGame();
  const { getAllMetadata } = useApiMetadata();
  const [games, setGames] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        const [gamesData, metaData] = await Promise.all([
          getAllGames(),
          getAllMetadata()
        ]);
        
        if (!isMounted) return;

        const rawGames = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
        setMetadata(metaData);
        setGames(rawGames);
      } catch (error) {
        console.error("Erreur stats", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchStats();
    
    return () => { isMounted = false; };
  }, [getAllGames, getAllMetadata]);

  return { games, metadata, isLoading };
};