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
          imageUrl: game.image?.startsWith("http") ? game.image : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${game.image}`,
          image: game.image,
        }));

        setGames(mappedGames);
        
        // Mettre à jour le cache localStorage
        localStorage.setItem("games_list_cache", JSON.stringify(rawGames));
        
        // Déclencher la vérification des achievements après charger les jeux
        setTimeout(() => {
          window.dispatchEvent(new Event('checkAchievements'));
        }, 300);
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

    const syncFavoriteInCache = (favoriteValue) => {
      try {
        const cached = JSON.parse(localStorage.getItem("games_list_cache") || "[]");
        if (!Array.isArray(cached)) return;

        const updatedCache = cached.map((game) => {
          const gameId = game._id || game.id;
          if (gameId !== clickedGame.id) return game;
          return { ...game, isFavorite: favoriteValue };
        });

        localStorage.setItem("games_list_cache", JSON.stringify(updatedCache));
      } catch (error) {
        console.warn("[Achievements] Impossible de synchroniser le cache favori:", error);
      }
    };
    
    setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: newFavoriteState } : g));
    syncFavoriteInCache(newFavoriteState);
    
    try {
      // ✅ Pour un simple toggle favori, envoyer UNIQUEMENT isFavorite
      const formData = new FormData();
      formData.append("isFavorite", newFavoriteState);
      
      await updateGame(clickedGame.id, formData);

      // Le trophée "Coup de foudre" dépend des favoris dans le cache local.
      window.dispatchEvent(new Event('checkAchievements'));
    } catch (error) {
      console.error("Erreur lors de la mise en favori", error);
      // Revert si erreur
      setGames((prev) => prev.map((g) => g.id === clickedGame.id ? { ...g, isFavorite: !newFavoriteState } : g));
      syncFavoriteInCache(!newFavoriteState);
    }
  };

  const removeGame = async (id) => {
    try {
      await deleteGame(id);
      
      // Mettre à jour les stats
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.deletedGamesCount = (user.deletedGamesCount || 0) + 1;
      localStorage.setItem("user", JSON.stringify(user));
      
      setRefreshTrigger((prev) => prev + 1);
      
      // Déclencher la vérification des achievements après un court délai
      setTimeout(() => {
        window.dispatchEvent(new Event('checkAchievements'));
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la suppression du jeu", error);
      alert("Erreur lors de la suppression du jeu.");
    }
  };

  return { games, metadata, isLoading, toggleFavorite, removeGame };
};