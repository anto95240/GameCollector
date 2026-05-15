import { useMemo } from "react";
import { applyFilterByCategory } from "./filterUtils";

/**
 * Hook pour filtrer la liste de jeux basé sur les filtres groupés
 * Applique la logique: OR au sein d'une catégorie, AND entre catégories
 */
export const useFilteredGamesList = (initialGames, searchTerm, groupedFilters) => {
  return useMemo(() => {
    if (!initialGames) return [];

    return initialGames.filter(game => {
      // Appliquer le filtre de recherche (AND)
      if (
        searchTerm &&
        !game.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Appliquer tous les filtres groupés (AND avec chaque catégorie)
      for (const [category, value] of Object.entries(groupedFilters)) {
        if (!category) continue;

        // Utiliser la fonction centralisée de filtrage
        if (!applyFilterByCategory(game, category, value)) {
          return false;
        }
      }

      return true;
    });
  }, [initialGames, searchTerm, groupedFilters]);
};
