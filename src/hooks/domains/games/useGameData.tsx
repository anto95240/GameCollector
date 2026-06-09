import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { MOCK_OPTIONS } from '@/config/constants'
import { useApiAuth } from '@/hooks/api/useApiAuth'
import { useApiGame } from '@/hooks/api/useApiGame'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { triggerAchievementCheck } from '@/services/achievementService'
import { createGameSlug, extractGamesList, formatGameForDetail } from '@/utils/formatters'
export const useGameData = (id: any, slug: any, gameName: any) => {
  const { state } = useLocation()
  const { getAllGames, getGameById } = useApiGame()
  const { getAllMetadata } = useApiMetadata()
  const { addGameToHistory } = useApiAuth()

  const [game, setGame] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [metadata, setMetadata] = useState({
    statuses: [],
    rating: MOCK_OPTIONS.rating,
  })

  const fetchGameData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Récupérer les métadata
      const meta = await getAllMetadata()
      setMetadata({
        statuses: meta.statuses || [],
        rating: MOCK_OPTIONS.rating,
      })

      // Déterminer la source du jeu (state passé via route ou API)
      let fetchedGame = state?.game

      if (!fetchedGame) {
        if (id && id !== 'undefined') {
          fetchedGame = await getGameById(id)
        } else {
          const gamesList = extractGamesList(await getAllGames())
          const target = createGameSlug(slug || gameName || '')
          fetchedGame = gamesList.find((g: any) => createGameSlug(g.name) === target)
        }
      }

      // Formatter et setter le jeu
      if (fetchedGame) {
        const formattedGame = formatGameForDetail(fetchedGame, meta)
        setGame(formattedGame)

        // Ajouter à l'historique si l'ID existe
        if (fetchedGame._id) {
          await addGameToHistory(fetchedGame._id)
          triggerAchievementCheck()
        }
      }
    } catch (e: any) {
      console.error('Erreur lors du fetch du jeu:', e)
    } finally {
      setIsLoading(false)
    }
  }, [id, slug, gameName, getAllGames, getGameById, getAllMetadata, addGameToHistory, state?.game])

  useEffect(() => {
    fetchGameData()
  }, [id, slug, gameName, state?.game])

  return {
    game,
    setGame,
    isLoading,
    metadata,
    refetch: fetchGameData,
  }
}
