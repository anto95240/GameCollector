/**
 * Utilitaires pour le FilterPanel
 */

export const getOptionCount = (games, categoryLabel, optionValue) => {
  if (!games) return 0;

  return games.filter((g) => {
    switch (categoryLabel) {
      case "Genre":
        return g.genre === optionValue;
      case "Plateforme":
        return g.platform === optionValue;
      case "Année":
        return String(g.year) === optionValue;
      case "Note":
        return g.rating === optionValue;
      case "Statut":
        return g.status === optionValue;
      case "Favoris":
        return optionValue === "Nos favoris" ? g.isFavorite : !g.isFavorite;
      case "Prochainement":
        return optionValue === "Prochainement" ? g.isSoon : !g.isSoon;
      default:
        return false;
    }
  }).length;
};

export const isFilterSelected = (selectedFilters, categoryLabel, optionValue) =>
  selectedFilters.includes(`${categoryLabel}: ${optionValue}`);

export const getActiveFilterValue = (selectedFilters, categoryLabel) => {
  const found = selectedFilters.find((filter) => filter.startsWith(`${categoryLabel}:`));
  return found ? found.split(": ")[1] : "";
};

export const getActiveSort = (selectedFilters) => {
  const raw = getActiveFilterValue(selectedFilters, "Trier par");
  const [field = "Nom", order = "asc"] = raw ? raw.split("|") : [];
  return { field, order };
};

export const parseRangeDraft = (selectedFilters, categoryLabel) => {
  const current = getActiveFilterValue(selectedFilters, categoryLabel);
  if (!current || !current.includes("-")) return { min: "", max: "" };
  const [min, max] = current.split("-");
  return { min: min || "", max: max || "" };
};

export const handleClearCategory = (selectedFilters, onRemoveFilter, categoryLabel) => {
  selectedFilters.forEach((filter) => {
    if (filter.startsWith(`${categoryLabel}:`)) {
      onRemoveFilter(filter);
    }
  });
};
