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
        let imageUrl = null;
        if (fetchedGame.image) {
          imageUrl = fetchedGame.image.startsWith("http") 
            ? fetchedGame.image 
            : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${fetchedGame.image}`;
        }
        
        setGame({
          ...fetchedGame,
          genre: meta.genres?.find(g => g._id === (fetchedGame.genre_id?._id || fetchedGame.genre_id))?.genre_name || "Inconnu",
          platform: meta.platforms?.find(p => p._id === (fetchedGame.platform_id?._id || fetchedGame.platform_id))?.platform_name || "Inconnu",
          status: meta.statuses?.find(s => s._id === (fetchedGame.status_id?._id || fetchedGame.status_id))?.status_name || "Inconnu",
          tags: fetchedGame.tags_ids?.map(t => meta.tags?.find(mt => mt._id === (t._id || t))?.tag_name || "Tag") || [],
          imageUrl: imageUrl
        });
        if (fetchedGame._id) await addGameToHistory(fetchedGame._id);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [id, slug, gameName, getAllGames, getGameById, getAllMetadata, addGameToHistory]);

  useEffect(() => { 
    fetchGameData(); 
  }, [id, slug, gameName]);

  const handleToggleFavorite = async () => {
    if (!game) return;
    const newState = !game.isFavorite;
    setGame(prev => ({ ...prev, isFavorite: newState }));
    try {
      const formData = new FormData();
      formData.append("isFavorite", newState);
      formData.append("name", game.game_name || game.name || "");
      formData.append("description", game.description || "");
      formData.append("note", game.note || "");
      formData.append("comment", game.comment || "");
      formData.append("genre_id", game.genre_id?._id || game.genre_id || "");
      formData.append("platform_id", game.platform_id?._id || game.platform_id || "");
      formData.append("status_id", game.status_id?._id || game.status_id || "");
      formData.append("year", game.year || "");
      formData.append("playing_time", game.playing_time || "");
      formData.append("developer", game.developer || "");
      formData.append("succes", game.succes || "");
      formData.append("isSoon", game.isSoon || false);
      
      if (game.image) {
        formData.append("image", game.image);
      }
      
      if (game.tags_ids && Array.isArray(game.tags_ids)) {
        game.tags_ids.forEach(tag => {
          formData.append("tags_ids", tag._id || tag);
        });
      }
      
      await updateGame(game._id, formData);
    } catch (e) { 
      console.error("Erreur lors de la mise en favori", e);
      setGame(prev => ({ ...prev, isFavorite: !newState })); 
    }
  };

  const handleDelete = async () => {
    if (game && window.confirm("Supprimer ?")) {
      await deleteGame(game._id);
      navigate("/list");
    }
  };

  return { game, isLoading, handleEdit: () => navigate("/game/add-edit-game", { state: { game } }), handleDelete, handleToggleFavorite };
};