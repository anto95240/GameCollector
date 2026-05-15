import { useState } from "react";
import { useFilterGrouping } from "./useFilterGrouping";
import { useFilteredGamesList } from "./useFilteredGamesList";

/**
 * Hook principal pour gérer le filtrage des jeux
 * Orchestrage de 3 sous-hooks spécialisés
 * 
 * Responsabilités:
 * - useFilterGrouping: Grouper les filtres par catégorie
 * - useFilteredGamesList: Appliquer les filtres à la liste
 * - État: search, pagination, sélection des filtres
 */
export const useGameFiltering = (initialGames) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [page, setPage] = useState(1);

  // Grouper les filtres par catégorie
  const groupedFilters = useFilterGrouping(selectedFilters);

  // Appliquer les filtres et le search term
  const filteredGames = useFilteredGamesList(initialGames, searchTerm, groupedFilters);

  /**
   * Sélectionner un filtre
   * Gère les filtres simple (remplacement) et multi-select (merge)
   */
  const handleSelectFilter = (category, option, mergeMulti = false) => {
    const cat = String(category).trim();
    const normalized = cat.toLowerCase();

    // Déterminer si c'est un filtre "single-value" (tri, range, etc)
    const isSingleValueFilter =
      normalized.includes("trier") ||
      normalized.includes("sort") ||
      normalized.includes("range") ||
      normalized.includes("plage") ||
      normalized.includes("intervalle") ||
      option.includes("-") ||
      option.includes("|");

    if (isSingleValueFilter) {
      // Filtre single: remplacer l'existant
      const prefix = `${cat}: `;
      const nextFilters = selectedFilters.filter(s => !s.startsWith(prefix));
      setSelectedFilters([...nextFilters, `${cat}: ${option}`]);
      setPage(1);
      return;
    }

    if (mergeMulti) {
      // Multi-select: merger les sélections
      const prefix = `${cat}: `;
      const existing = selectedFilters.find(s => s.startsWith(prefix));

      if (existing) {
        const existingValue = existing.split(": ")[1] || "";
        const set = new Set(existingValue.split("|").filter(Boolean));
        if (Array.isArray(option)) {
          option.forEach(o => set.add(o));
        } else {
          set.add(option);
        }
        const newTag = `${cat}: ${Array.from(set).join("|")}`;
        setSelectedFilters(prev =>
          prev.map(p => (p.startsWith(prefix) ? newTag : p))
        );
        setPage(1);
        return;
      }

      // Ajouter un nouveau tag multi
      const val = Array.isArray(option) ? option.join("|") : option;
      setSelectedFilters(prev => [...prev, `${cat}: ${val}`]);
      setPage(1);
      return;
    }

    // Ajouter filtre simple
    const newTag = `${cat}: ${option}`;
    if (!selectedFilters.includes(newTag)) {
      setSelectedFilters(prev => [...prev, newTag]);
      setPage(1);
    }
  };

  const removeFilter = (tag) => {
    setSelectedFilters(prev => prev.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
    setPage(1);
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedFilters,
    handleSelectFilter,
    removeFilter,
    clearAllFilters,
    page,
    setPage,
    setSelectedFilters,
    filteredGames
  };
};