export const getOptionCount = (games: any, categoryLabel: any, optionValue: any) => {
  if (!games) return 0

  return games.filter((g: any) => {
    switch (categoryLabel) {
      case 'Genre':
        return g.genre === optionValue
      case 'Plateforme':
        return g.platform === optionValue
      case 'Année':
        return String(g.year) === optionValue
      case 'Note':
        return g.rating === optionValue
      case 'Statut':
        return g.status === optionValue
      case 'Favoris':
        return optionValue === 'Nos favoris' ? g.isFavorite : !g.isFavorite
      case 'Prochainement':
        return optionValue === 'Prochainement' ? g.isSoon : !g.isSoon
      default:
        return false
    }
  }).length
}

export const isFilterSelected = (selectedFilters: any, categoryLabel: any, optionValue: any) =>
  selectedFilters.includes(`${categoryLabel}: ${optionValue}`)

export const getActiveFilterValue = (selectedFilters: any, categoryLabel: any) => {
  const found = selectedFilters.find((filter: any) => filter.startsWith(`${categoryLabel}:`))
  return found ? found.split(': ')[1] : ''
}

export const getActiveSort = (selectedFilters: any) => {
  const raw = getActiveFilterValue(selectedFilters, 'Trier par')
  const [field = 'Nom', order = 'asc'] = raw ? raw.split('|') : []
  return { field, order }
}

export const parseRangeDraft = (selectedFilters: any, categoryLabel: any) => {
  const current = getActiveFilterValue(selectedFilters, categoryLabel)
  if (!current || !current.includes('-')) return { min: '', max: '' }
  const [min, max] = current.split('-')
  return { min: min || '', max: max || '' }
}

export const handleClearCategory = (selectedFilters: any, onRemoveFilter: any, categoryLabel: any) => {
  selectedFilters.forEach((filter: any) => {
    if (filter.startsWith(`${categoryLabel}:`)) {
      onRemoveFilter(filter)
    }
  })
}
