import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApiGame } from "../api/useApiGame";
import { useApiMetadata } from "../api/useApiMetadata";
import { useApiAuth } from "../api/useApiAuth";

export const useGameDetail = (id, slug, gameName) => {
  const navigate = useNavigate();
  const { getAllGames, getGameById, deleteGame, updateGame } = useApiGame();
  const { getAllMetadata } = useApiMetadata();
  const { addGameToHistory } = useApiAuth();

  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameData = useCallback(async () => {
    setIsLoading(true);
    try {
      const meta = await getAllMetadata();
      let fetchedGame = null;

      if (id && id !== "undefined") {
        fetchedGame = await getGameById(id);
      } else {
        const gamesData = await getAllGames();
        const gamesList = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
        const target = (slug || gameName || "").toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
        fetchedGame = gamesList.find(g => g.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") === target);
      }

      if (fetchedGame) {
        setGame({
          ...fetchedGame,
          genre: meta.genres?.find(g => g._id === (fetchedGame.genre_id?._id || fetchedGame.genre_id))?.genre_name || "Inconnu",
          platform: meta.platforms?.find(p => p._id === (fetchedGame.platform_id?._id || fetchedGame.platform_id))?.platform_name || "Inconnu",
          status: meta.statuses?.find(s => s._id === (fetchedGame.status_id?._id || fetchedGame.status_id))?.status_name || "Inconnu",
          tags: fetchedGame.tags_ids?.map(t => meta.tags?.find(mt => mt._id === (t._id || t))?.tag_name || "Tag") || [],
          image: fetchedGame.image?.startsWith("http") ? fetchedGame.image : `${import.meta.env.VITE_API_URL}${fetchedGame.image}`
        });
        if (fetchedGame._id) await addGameToHistory(fetchedGame._id);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [id, slug, gameName, getAllGames, getGameById, getAllMetadata, addGameToHistory]);

  useEffect(() => { fetchGameData(); }, [fetchGameData]);

  const handleToggleFavorite = async () => {
    if (!game) return;
    const newState = !game.isFavorite;
    setGame(prev => ({ ...prev, isFavorite: newState }));
    try {
      await updateGame(game._id, { ...game, isFavorite: newState, 
        genre_id: game.genre_id?._id || game.genre_id,
        platform_id: game.platform_id?._id || game.platform_id,
        status_id: game.status_id?._id || game.status_id
      });
    } catch (e) { setGame(prev => ({ ...prev, isFavorite: !newState })); }
  };

  const handleDelete = async () => {
    if (game && window.confirm("Supprimer ?")) {
      await deleteGame(game._id);
      navigate("/liste");
    }
  };

  return { game, isLoading, handleEdit: () => navigate("/game/add-edit-game", { state: { game } }), handleDelete, handleToggleFavorite };
};