/**
 * Utilitaires pour le filtrage par catégorie
 * Chaque fonction gère la logique de filtrage pour sa catégorie
 */

/**
 * Filtre par genre
 */
export const filterByGenre = (game, value) => {
  if (Array.isArray(value)) {
    return value.includes(game.genre);
  }
  return value ? game.genre === value : true;
};

/**
 * Filtre par plateforme
 */
export const filterByPlatform = (game, value) => {
  if (Array.isArray(value)) {
    return value.includes(game.platform);
  }
  return value ? game.platform === value : true;
};

/**
 * Filtre par année (inclut range)
 */
export const filterByYear = (game, value) => {
  if (typeof value === "object" && value.min !== undefined) {
    const y = Number(game.year) || 0;
    return y >= value.min && y <= value.max;
  }
  if (Array.isArray(value)) {
    return value.includes(String(game.year));
  }
  return value ? String(game.year) === String(value) : true;
};

/**
 * Filtre par note/rating (inclut range)
 */
export const filterByRating = (game, value) => {
  if (typeof value === "object" && value.min !== undefined) {
    const r = Number(game.rating) || 0;
    return r >= value.min && r <= value.max;
  }
  if (Array.isArray(value)) {
    return value.includes(String(game.rating));
  }
  return value ? Number(game.rating) === Number(value) : true;
};

/**
 * Filtre par statut
 */
export const filterByStatus = (game, value) => {
  if (Array.isArray(value)) {
    return value.includes(game.status);
  }
  return value ? game.status === value : true;
};

/**
 * Filtre par favori (bool)
 */
export const filterByFavorite = (game, value) => {
  if (Array.isArray(value)) {
    if (value.includes("Nos favoris") && !game.isFavorite) return false;
    if (value.includes("Non favoris") && game.isFavorite) return false;
    return true;
  }
  if (value === "Nos favoris") {
    return game.isFavorite;
  }
  if (value === "Non favoris") {
    return !game.isFavorite;
  }
  return true;
};

/**
 * Filtre par prochainement/à venir (bool)
 */
export const filterBySoon = (game, value) => {
  if (Array.isArray(value)) {
    if (value.includes("Prochainement") && !game.isSoon) return false;
    if (value.includes("Pas prochainement") && game.isSoon) return false;
    return true;
  }
  if (value === "Prochainement") {
    return game.isSoon;
  }
  if (value === "Pas prochainement") {
    return !game.isSoon;
  }
  return true;
};

/**
 * Determine le type de catégorie basé sur son nom
 */
export const getCategoryType = (categoryName) => {
  const lower = categoryName.toLowerCase();

  if (lower.includes("genre")) return "genre";
  if (lower.includes("platform") || lower.includes("plateforme")) return "platform";
  if (lower.includes("year") || lower.includes("année") || lower.includes("year_range") || lower.includes("année_range")) return "year";
  if (lower.includes("rating") || lower.includes("note") || lower.includes("rating_range") || lower.includes("note_range")) return "rating";
  if (lower.includes("status") || lower.includes("statut")) return "status";
  if (lower.includes("favorite") || lower.includes("favoris") || lower.includes("favorites")) return "favorite";
  if (lower.includes("soon") || lower.includes("prochainement")) return "soon";

  return null;
};

/**
 * Applique le filtre basé sur la catégorie
 */
export const applyFilterByCategory = (game, category, value) => {
  const type = getCategoryType(category);

  switch (type) {
    case "genre":
      return filterByGenre(game, value);
    case "platform":
      return filterByPlatform(game, value);
    case "year":
      return filterByYear(game, value);
    case "rating":
      return filterByRating(game, value);
    case "status":
      return filterByStatus(game, value);
    case "favorite":
      return filterByFavorite(game, value);
    case "soon":
      return filterBySoon(game, value);
    default:
      return true;
  }
};
