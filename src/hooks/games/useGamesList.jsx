import { useState, useEffect } from "react";
import { useApiGame } from "../api/useApiGame";
import { useApiMetadata } from "../api/useApiMetadata";

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

        const mappedGames = rawGames.map((game) => ({
          ...game,
          id: game._id,
          // Mapping strict des données MongoDB[cite: 3, 5]
          isSoon: game.isSoon === true || String(game.isSoon) === "true", 
          isFavorite: game.isFavorite === true || String(game.isFavorite) === "true",
          genre: metaData.genres?.find((g) => g._id === (game.genre_id?._id || game.genre_id))?.genre_name || "Inconnu",
          platform: metaData.platforms?.find((p) => p._id === (game.platform_id?._id || game.platform_id))?.platform_name || "Inconnu",
          status: metaData.statuses?.find((s) => s._id === (game.status_id?._id || game.status_id))?.status_name || "Inconnu",
          rating: game.note ? `${Math.floor(game.note)} étoiles` : "Non noté",
          imageUrl: game.image?.startsWith("http") ? game.image : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${game.image}`,
        }));
        
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
    try {
      await deleteGame(id);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  return { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame };
};