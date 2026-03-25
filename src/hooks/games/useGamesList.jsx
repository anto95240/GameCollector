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
          genre: metaData.genres?.find((g) => g._id === (game.genre_id?._id || game.genre_id))?.genre_name || "Inconnu",
          platform: metaData.platforms?.find((p) => p._id === (game.platform_id?._id || game.platform_id))?.platform_name || "Inconnu",
          status: metaData.statuses?.find((s) => s._id === (game.status_id?._id || game.status_id))?.status_name || "Inconnu",
          rating: game.note ? `${Math.floor(game.note)} étoiles` : "Non noté",
          image: game.image?.startsWith("http") ? game.image : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${game.image}`,
        }));

        setGames(mappedGames);
      } catch (error) {
        console.error("Erreur de chargement des jeux", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGamesAndMeta();

    return () => {
      isMounted = false;
    };
  }, [searchTerm, refreshTrigger]); 

  const toggleFavorite = async (clickedGame) => {
    const newFavoriteState = !clickedGame.isFavorite;
    
    setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: newFavoriteState } : g));
    
    try {
      const payload = { 
        ...clickedGame, 
        isFavorite: newFavoriteState,
        status_id: clickedGame.status_id?._id || clickedGame.status_id,
        genre_id: clickedGame.genre_id?._id || clickedGame.genre_id,
        platform_id: clickedGame.platform_id?._id || clickedGame.platform_id,
        tags_ids: clickedGame.tags_ids?.map((t) => t?._id || t) || []
      };
      
      await updateGame(clickedGame.id, payload);
    } catch (error) {
      console.error("Erreur lors de la mise en favori", error);
      setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: !newFavoriteState } : g));
    }
  };

  const removeGame = async (id) => {
    try {
      await deleteGame(id);
      setRefreshTrigger((prev) => prev + 1); 
    } catch (error) {
      console.error("Erreur lors de la suppression du jeu", error);
      alert("Erreur lors de la suppression du jeu.");
    }
  };

  return { games, metadata, isLoading, toggleFavorite, removeGame };
};