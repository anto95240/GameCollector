import { createSlug } from '../helpers/slugGenerator'
import { formatImageUrl } from './imageFormatters'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
export const isWishlistStatusName = (statusName: string = '') => {
  const lower = statusName.toLowerCase()
  return lower.includes('wishlist') || lower.includes('à venir') || lower.includes('prochainement')
}
export const extractGamesList = (data: any) => (Array.isArray(data) ? data : data?.games || [])
export const mapGameWithMetadata = (game: any, metadata: any) => {
  if (!game || !metadata) return game

  return {
    ...game,
    genre:
      metadata.genres?.find((g: any) => g._id === (game.genre_id?._id || game.genre_id))?.genre_name ||
      'Inconnu',
    platform:
      metadata.platforms?.find((p: any) => p._id === (game.platform_id?._id || game.platform_id))
        ?.platform_name || 'Inconnu',
    status:
      metadata.statuses?.find((s: any) => s._id === (game.status_id?._id || game.status_id))
        ?.status_name || 'Inconnu',
    tags:
      game.tags_ids?.map(
        (t: any) => metadata.tags?.find((mt: any) => mt._id === (t._id || t))?.tag_name || 'Tag'
      ) || [],
  }
}
export const formatGameForDisplay = (game: any, metadata: any, apiUrl = API_URL) => {
  const mappedGame = mapGameWithMetadata(game, metadata)

  return {
    ...mappedGame,
    id: game._id,
    isSoon: game.isSoon === true || String(game.isSoon) === 'true',
    isFavorite: game.isFavorite === true || String(game.isFavorite) === 'true',
    rating: game.note ? `${Math.floor(game.note)} étoiles` : 'Non noté',
    imageUrl: formatImageUrl(game.image, apiUrl),
  }
}
export const formatGameForDetail = (game: any, metadata: any, apiUrl = API_URL) => {
  const baseGame = formatGameForDisplay(game, metadata, apiUrl)

  // baseGame already has imageUrl from formatGameForDisplay — no need to recompute
  return {
    ...baseGame,
    genre_id: game.genre_id,
    platform_id: game.platform_id,
    status_id: game.status_id,
    tags_ids: game.tags_ids,
  }
}
export const formatGamesForCarousel = (games: any[], apiUrl = API_URL) => {
  return games.map((game: any) => ({
    ...game,
    id: game._id,
    imageUrl: formatImageUrl(game.image, apiUrl),
  }))
}
export const createGameSlug = createSlug
export const isSameGame = (game1: any, game2: any) => {
  if (!game1 || !game2) return false

  const id1 = typeof game1 === 'string' ? game1 : game1._id || game1.id
  const id2 = typeof game2 === 'string' ? game2 : game2._id || game2.id

  if (String(id1) === String(id2)) return true

  const name1 = typeof game1 === 'string' ? '' : game1.name || ''
  const name2 = typeof game2 === 'string' ? '' : game2.name || ''

  if (name1 && name2) {
    return createSlug(name1) === createSlug(name2)
  }

  return false
}
export const deduplicateGames = (games: any[]) => {
  const seen = new Set()
  return games.filter((game: any) => {
    const id = String(game._id || game.id || '')
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}
export const normalizeGameBooleans = (game: any) => {
  return {
    ...game,
    isFavorite: game.isFavorite === true || String(game.isFavorite) === 'true',
    isSoon: game.isSoon === true || String(game.isSoon) === 'true',
  }
}
export const normalizeGameData = (game: any, apiUrl = API_URL) => {
  const withBooleans = normalizeGameBooleans(game)
  return {
    ...withBooleans,
    id: game.id || game._id,
    imageUrl: game.imageUrl || formatImageUrl(game.image, apiUrl),
    rating: game.rating ?? (game.note || 0),
  }
}
export const normalizeGamesArray = (games: any[], apiUrl = API_URL) =>
  games.map((game: any) => normalizeGameData(game, apiUrl))
