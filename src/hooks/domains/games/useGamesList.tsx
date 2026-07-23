import { useEffect, useState } from 'react'

import { useApiGame } from '@/hooks/api/useApiGame'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { extractGamesList, formatGameForDisplay } from '@/utils/formatters'

export const useGamesList = (searchTerm: string) => {
  const { getAllGames, deleteGame, updateGame } = useApiGame()
  const { getAllMetadata } = useApiMetadata()
  const [games, setGames] = useState<any[]>([])
  const [metadata, setMetadata] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let isMounted = true
    const fetchGamesAndMeta = async () => {
      setIsLoading(true)
      try {
        // RÉCUPÉRATION DIRECTE DEPUIS L'API SANS LOCALSTORAGE[cite: 6]
        const [gamesData, metaData] = await Promise.all([
          getAllGames(searchTerm),
          getAllMetadata(),
          new Promise((resolve) => setTimeout(resolve, 800)), // Artificial delay to show Skeletons
        ])

        if (!isMounted) return
        setMetadata(metaData)

        const rawGames = extractGamesList(gamesData)

        // Utiliser le formatter centralisé pour éviter la duplication
        const mappedGames = rawGames.map((game: any) => formatGameForDisplay(game, metaData))

        setGames(mappedGames)
      } catch (error: any) {
        console.error('Erreur lors de la récupération des jeux:', error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchGamesAndMeta()
    return () => {
      isMounted = false
    }
  }, [searchTerm, refreshTrigger, getAllGames, getAllMetadata])

  const toggleFavorite = async (clickedGame: any) => {
    const newFavoriteState = !clickedGame.isFavorite
    setGames((prev) =>
      prev.map((g) => (g.id === clickedGame.id ? { ...g, isFavorite: newFavoriteState } : g))
    )
    try {
      const formData = new FormData()
      formData.append('is_favorite', String(newFavoriteState))
      await updateGame(clickedGame.id, formData)
    } catch (error) {
      setGames((prev) =>
        prev.map((g) => (g.id === clickedGame.id ? { ...g, isFavorite: !newFavoriteState } : g))
      )
    }
  }

  const toggleSoon = async (clickedGame: any) => {
    const newSoonState = !clickedGame.isSoon
    setGames((prev) =>
      prev.map((g) => (g.id === clickedGame.id ? { ...g, isSoon: newSoonState } : g))
    )
    try {
      const formData = new FormData()
      formData.append('is_soon', String(newSoonState))
      await updateGame(clickedGame.id, formData)
    } catch (error) {
      setGames((prev) =>
        prev.map((g) => (g.id === clickedGame.id ? { ...g, isSoon: !newSoonState } : g))
      )
    }
  }

  const removeGame = async (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id))

    try {
      await deleteGame(id)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setRefreshTrigger((prev) => prev + 1)
    }
  }

  return { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame }
}
