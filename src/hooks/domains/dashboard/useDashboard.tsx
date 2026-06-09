import { useEffect, useState } from 'react'

import { useApiGame } from '@/hooks/api/useApiGame'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { extractGamesList, formatGamesForCarousel } from '@/utils/formatters'

export const useDashboard = () => {
  const { getAllGames } = useApiGame()
  const { getAllMetadata } = useApiMetadata()

  const [stats, setStats] = useState({
    totalGames: 0,
    favoriteCount: 0,
    platformCount: 0,
    genreCount: 0,
  })

  const [recentGames, setRecentGames] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        const [gamesData] = await Promise.all([getAllGames(), getAllMetadata()])

        if (!isMounted) return

        const gamesList = extractGamesList(gamesData)

        // --- Calcul des Stats ---
        const total = gamesList.length
        const favCount = gamesList.filter((g: any) => g.isFavorite).length

        // Compter les plateformes et genres uniques utilisés par le joueur
        const uniquePlatforms = new Set(
          gamesList.map((g: any) => g.platform_id?._id || g.platform_id).filter(Boolean)
        )
        const uniqueGenres = new Set(
          gamesList.map((g: any) => g.genre_id?._id || g.genre_id).filter(Boolean)
        )

        setStats({
          totalGames: total,
          favoriteCount: favCount,
          platformCount: uniquePlatforms.size,
          genreCount: uniqueGenres.size,
        })

        // --- Récupération des jeux récents ---
        // Utiliser le formatter centralisé pour éviter la duplication
        const formattedRecent = formatGamesForCarousel(gamesList.slice(0, 5))

        setRecentGames(formattedRecent)
      } catch (error: any) {
        console.error('Erreur de chargement du dashboard', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
    return () => {
      isMounted = false
    }
  }, [])

  return {
    stats,
    recentGames,
    isLoading,
  }
}
