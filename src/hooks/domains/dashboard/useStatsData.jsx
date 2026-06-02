import { useEffect,useState } from "react";

import { useApiGame } from "@/hooks/api/useApiGame";
import { useApiMetadata } from "@/hooks/api/useApiMetadata";

export const useStatsData = () => {
  const { getAdvancedStats } = useApiGame();
  const { getAllMetadata } = useApiMetadata();
  
  const [stats, setStats] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // On récupère les stats calculées ET les métadonnées (pour les couleurs/noms)
        const [statsData, metaData] = await Promise.all([
          getAdvancedStats(),
          getAllMetadata()
        ]);
        
        if (!isMounted) return;

        setStats(statsData);
        setMetadata(metaData);
      } catch (err) {
        if (!isMounted) return;
        console.error("Erreur stats", err);
        setError("Impossible de charger les statistiques.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchStats();
    
    return () => { isMounted = false; };
  }, [getAdvancedStats, getAllMetadata]);

  return { stats, metadata, isLoading, error };
};