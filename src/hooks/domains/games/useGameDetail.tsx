import { useNavigate } from 'react-router'

import { useGameActions } from './useGameActions'
import { useGameData } from './useGameData'
import { useGameMetadata } from './useGameMetadata'
// Orchestrateur: Lie la donnée brute du jeu avec ses actions possibles et ses métadonnées
export const useGameDetail = (id: any, slug: any, gameName: any) => {
  const navigate = useNavigate()

  // Récupérer les données du jeu
  const { game, setGame, isLoading, metadata } = useGameData(id, slug, gameName)

  // Récupérer les actions du jeu
  const {
    isUpdating,
    handleToggleFavorite,
    handleDelete,
    handleToggleSoon,
    handleUpdateGameField,
  } = useGameActions(game, setGame, metadata)

  // Enrichir avec les métadonnées
  const { enrichedGame } = useGameMetadata(game, metadata)

  return {
    game: enrichedGame || game,
    isLoading,
    metadata,
    isUpdating,
    handleEdit: () => navigate('/game/add-edit-game', { state: { game } }),
    handleDelete,
    handleToggleFavorite,
    handleUpdateGameField,
    handleToggleSoon,
  }
}
