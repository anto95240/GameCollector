import { useGameData } from "./useGameData";
import { useGameActions } from "./useGameActions";
import { useGameMetadata } from "./useGameMetadata";
import { useNavigate } from "react-router";

/**
 * Hook principal pour gérer les détails d'un jeu
 * Combine useGameData, useGameActions et useGameMetadata
 * Responsabilité: Orchestration des trois hooks spécialisés
 */
export const useGameDetail = (id, slug, gameName) => {
  const navigate = useNavigate();

  // Récupérer les données du jeu
  const { game, setGame, isLoading, metadata } = useGameData(id, slug, gameName);

  // Récupérer les actions du jeu
  const {
    isUpdating,
    handleToggleFavorite,
    handleDelete,
    handleToggleSoon,
    handleUpdateGameField
  } = useGameActions(game, setGame, metadata);

  // Enrichir avec les métadonnées
  const { enrichedGame } = useGameMetadata(game, metadata);

  return {
    game: enrichedGame || game,
    isLoading,
    metadata,
    isUpdating,
    handleEdit: () => navigate("/game/add-edit-game", { state: { game } }),
    handleDelete,
    handleToggleFavorite,
    handleUpdateGameField,
    handleToggleSoon
  };
};