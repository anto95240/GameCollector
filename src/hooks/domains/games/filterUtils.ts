export const filterByGenre = (game: any, value: any) => {
  if (Array.isArray(value)) {
    return value.includes(game.genre)
  }
  return value ? game.genre === value : true
}
export const filterByPlatform = (game: any, value: any) => {
  if (Array.isArray(value)) {
    return value.includes(game.platform)
  }
  return value ? game.platform === value : true
}
export const filterByYear = (game: any, value: any) => {
  if (typeof value === 'object' && value.min !== undefined) {
    const y = Number(game.year) || 0
    return y >= value.min && y <= value.max
  }
  if (Array.isArray(value)) {
    return value.includes(String(game.year))
  }
  return value ? String(game.year) === String(value) : true
}
export const filterByRating = (game: any, value: any) => {
  if (typeof value === 'object' && value.min !== undefined) {
    const r = Number(game.rating) || 0
    return r >= value.min && r <= value.max
  }
  if (Array.isArray(value)) {
    return value.includes(String(game.rating))
  }
  return value ? Number(game.rating) === Number(value) : true
}
export const filterByStatus = (game: any, value: any) => {
  if (Array.isArray(value)) {
    return value.includes(game.status)
  }
  return value ? game.status === value : true
}
export const filterByFavorite = (game: any, value: any) => {
  if (Array.isArray(value)) {
    if (value.includes('Nos favoris') && !game.isFavorite) return false
    if (value.includes('Non favoris') && game.isFavorite) return false
    return true
  }
  if (value === 'Nos favoris') {
    return game.isFavorite
  }
  if (value === 'Non favoris') {
    return !game.isFavorite
  }
  return true
}
export const filterBySoon = (game: any, value: any) => {
  if (Array.isArray(value)) {
    if (value.includes('Prochainement') && !game.isSoon) return false
    if (value.includes('Pas prochainement') && game.isSoon) return false
    return true
  }
  if (value === 'Prochainement') {
    return game.isSoon
  }
  if (value === 'Pas prochainement') {
    return !game.isSoon
  }
  return true
}
export const getCategoryType = (categoryName: any) => {
  const lower = categoryName.toLowerCase()

  if (lower.includes('genre')) return 'genre'
  if (lower.includes('platform') || lower.includes('plateforme')) return 'platform'
  if (
    lower.includes('year') ||
    lower.includes('année') ||
    lower.includes('year_range') ||
    lower.includes('année_range')
  )
    return 'year'
  if (
    lower.includes('rating') ||
    lower.includes('note') ||
    lower.includes('rating_range') ||
    lower.includes('note_range')
  )
    return 'rating'
  if (lower.includes('status') || lower.includes('statut')) return 'status'
  if (lower.includes('favorite') || lower.includes('favoris') || lower.includes('favorites'))
    return 'favorite'
  if (lower.includes('soon') || lower.includes('prochainement')) return 'soon'

  return null
}
export const applyFilterByCategory = (game: any, category: any, value: any) => {
  const type = getCategoryType(category)

  switch (type) {
    case 'genre':
      return filterByGenre(game, value)
    case 'platform':
      return filterByPlatform(game, value)
    case 'year':
      return filterByYear(game, value)
    case 'rating':
      return filterByRating(game, value)
    case 'status':
      return filterByStatus(game, value)
    case 'favorite':
      return filterByFavorite(game, value)
    case 'soon':
      return filterBySoon(game, value)
    default:
      return true
  }
}
