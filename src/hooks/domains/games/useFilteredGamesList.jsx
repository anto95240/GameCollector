import { useMemo } from 'react'

import { applyFilterByCategory } from './filterUtils'
export const useFilteredGamesList = (initialGames, searchTerm, groupedFilters) => {
  return useMemo(() => {
    if (!initialGames) return []

    return initialGames.filter((game) => {
      // Appliquer le filtre de recherche (AND)
      if (searchTerm && !game.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Appliquer tous les filtres groupés (AND avec chaque catégorie)
      for (const [category, value] of Object.entries(groupedFilters)) {
        if (!category) continue

        // Utiliser la fonction centralisée de filtrage
        if (!applyFilterByCategory(game, category, value)) {
          return false
        }
      }

      return true
    })
  }, [initialGames, searchTerm, groupedFilters])
}
