import { useState, useEffect } from "react";
import { useApiGame } from "@/hooks/api/useApiGame";
import { useApiMetadata } from "@/hooks/api/useApiMetadata";
import { formatGameForDisplay } from "@/utils/gameFormatters";

export const useGamesList = (searchTerm) => {
  const { getAllGames, deleteGame, updateGame } = useApiGame();
  const { getAllMetadata } = useApiMetadata();
  const [games, setGames] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchGamesAndMeta = async () => {
      setIsLoading(true);
      try {
        // RÉCUPÉRATION DIRECTE DEPUIS L'API SANS LOCALSTORAGE[cite: 6]
        const [gamesData, metaData] = await Promise.all([
          getAllGames(searchTerm),
          getAllMetadata(),
        ]);
        
        if (!isMounted) return;
        setMetadata(metaData);
        
        const rawGames = Array.isArray(gamesData) ? gamesData : gamesData.games || [];

        // Utiliser le formatter centralisé pour éviter la duplication
        const mappedGames = rawGames.map((game) => formatGameForDisplay(game, metaData));
        
        setGames(mappedGames);
      } catch (error) {
        console.error("Erreur lors de la récupération des jeux:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGamesAndMeta();
    return () => { isMounted = false; };
  }, [searchTerm, refreshTrigger, getAllGames, getAllMetadata]);

  const toggleFavorite = async (clickedGame) => {
    const newFavoriteState = !clickedGame.isFavorite;
    setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: newFavoriteState } : g));
    try {
      const formData = new FormData();
      formData.append("isFavorite", newFavoriteState);
      await updateGame(clickedGame.id, formData);
    } catch (error) {
      setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: !newFavoriteState } : g));
    }
  };

  const toggleSoon = async (clickedGame) => {
    const newSoonState = !clickedGame.isSoon;
    setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isSoon: newSoonState } : g));
    try {
      const formData = new FormData();
      formData.append("isSoon", newSoonState);
      await updateGame(clickedGame.id, formData);
    } catch (error) {
      setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isSoon: !newSoonState } : g));
    }
  };

  const removeGame = async (id) => {
    setGames((prev) => prev.filter((g) => g.id !== id));

    try {
      await deleteGame(id);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame };
};