import { createSlug } from "../helpers/slugGenerator";
import { formatImageUrl } from "./imageFormatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * Détermine si un nom de statut correspond à la wishlist/prochainement.
 * Source unique de vérité — évite 3 clauses répétées dans plusieurs hooks.
 * @param {string} statusName - Nom du statut (ex: "Wishlist", "À venir")
 * @returns {boolean}
 */
export const isWishlistStatusName = (statusName = "") => {
  const lower = statusName.toLowerCase();
  return lower.includes("wishlist") ||
    lower.includes("à venir") ||
    lower.includes("prochainement");
};

/**
 * Extrait la liste de jeux depuis une réponse API normalisée
 * (l'API peut retourner un tableau direct ou un objet { games: [...] })
 * @param {Array|Object} data - Réponse brute de l'API
 * @returns {Array} Tableau de jeux (jamais undefined)
 */
export const extractGamesList = (data) =>
  Array.isArray(data) ? data : data?.games || [];

/**
 * Mappe les métadonnées d'un jeu avec les données API
 * @param {Object} game - Données brutes du jeu
 * @param {Object} metadata - Métadonnées (genres, platforms, statuses, tags)
 * @returns {Object} Jeu avec métadonnées formatées
 */
export const mapGameWithMetadata = (game, metadata) => {
  if (!game || !metadata) return game;

  return {
    ...game,
    genre: metadata.genres?.find((g) => g._id === (game.genre_id?._id || game.genre_id))?.genre_name || "Inconnu",
    platform: metadata.platforms?.find((p) => p._id === (game.platform_id?._id || game.platform_id))?.platform_name || "Inconnu",
    status: metadata.statuses?.find((s) => s._id === (game.status_id?._id || game.status_id))?.status_name || "Inconnu",
    tags: game.tags_ids?.map((t) => metadata.tags?.find((mt) => mt._id === (t._id || t))?.tag_name || "Tag") || [],
  };
};

/**
 * Formate un jeu pour l'affichage en liste
 * @param {Object} game - Données brutes du jeu
 * @param {Object} metadata - Métadonnées
 * @param {string} [apiUrl] - URL du backend
 * @returns {Object} Jeu formaté prêt pour l'affichage
 */
export const formatGameForDisplay = (game, metadata, apiUrl = API_URL) => {
  const mappedGame = mapGameWithMetadata(game, metadata);
  
  return {
    ...mappedGame,
    id: game._id,
    isSoon: game.isSoon === true || String(game.isSoon) === "true",
    isFavorite: game.isFavorite === true || String(game.isFavorite) === "true",
    rating: game.note ? `${Math.floor(game.note)} étoiles` : "Non noté",
    imageUrl: formatImageUrl(game.image, apiUrl),
  };
};

/**
 * Formate un jeu pour la page de détail
 * @param {Object} game - Données brutes du jeu
 * @param {Object} metadata - Métadonnées
 * @param {string} [apiUrl] - URL du backend
 * @returns {Object} Jeu détaillé formaté
 */
export const formatGameForDetail = (game, metadata, apiUrl = API_URL) => {
  const baseGame = formatGameForDisplay(game, metadata, apiUrl);
  
  // baseGame already has imageUrl from formatGameForDisplay — no need to recompute
  return {
    ...baseGame,
    genre_id: game.genre_id,
    platform_id: game.platform_id,
    status_id: game.status_id,
    tags_ids: game.tags_ids,
  };
};

/**
 * Formate une liste de jeux pour le carrousel
 * @param {Array} games - Liste de jeux bruts
 * @param {string} [apiUrl] - URL du backend
 * @returns {Array} Jeux formatés pour affichage carrousel
 */
export const formatGamesForCarousel = (games, apiUrl = API_URL) => {
  return games.map((game) => ({
    ...game,
    id: game._id,
    imageUrl: formatImageUrl(game.image, apiUrl),
  }));
};

/**
 * Construit un slug unique pour un jeu (alias pour la rétrocompatibilité)
 */
export const createGameSlug = createSlug;

/**
 * Compare si deux jeux sont les mêmes (par ID ou slug)
 * @param {Object|string} game1 - Premier jeu ou ID/slug
 * @param {Object|string} game2 - Deuxième jeu ou ID/slug
 * @returns {boolean} true si cest le même jeu
 */
export const isSameGame = (game1, game2) => {
  if (!game1 || !game2) return false;
  
  const id1 = typeof game1 === "string" ? game1 : game1._id || game1.id;
  const id2 = typeof game2 === "string" ? game2 : game2._id || game2.id;
  
  if (String(id1) === String(id2)) return true;
  
  const name1 = typeof game1 === "string" ? "" : game1.name || "";
  const name2 = typeof game2 === "string" ? "" : game2.name || "";
  
  if (name1 && name2) {
    return createSlug(name1) === createSlug(name2);
  }
  
  return false;
};

/**
 * Déduplique une liste de jeux basée sur l'ID
 * @param {Array} games - Liste de jeux
 * @returns {Array} Jeux dédupliqués
 */
export const deduplicateGames = (games) => {
  const seen = new Set();
  return games.filter((game) => {
    const id = String(game._id || game.id || "");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/**
 * Normalise les booléens d'un jeu (isFavorite, isSoon)
 * @param {Object} game - Jeu à normaliser
 * @returns {Object} Jeu avec booléens normalisés
 */
export const normalizeGameBooleans = (game) => {
  return {
    ...game,
    isFavorite: game.isFavorite === true || String(game.isFavorite) === "true",
    isSoon: game.isSoon === true || String(game.isSoon) === "true",
  };
};

/**
 * Normalise un jeu brut de l'API pour garantir les champs essentiels
 * (id, booléens, imageUrl) sans avoir besoin de métadonnées.
 * Utile pour les contextes où les métadonnées ne sont pas disponibles.
 * @param {Object} game - Données brutes du jeu
 * @param {string} [apiUrl] - URL du backend
 * @returns {Object} Jeu normalisé
 */
export const normalizeGameData = (game, apiUrl = API_URL) => {
  const withBooleans = normalizeGameBooleans(game);
  return {
    ...withBooleans,
    id: game.id || game._id,
    imageUrl: game.imageUrl || formatImageUrl(game.image, apiUrl),
    rating: game.rating ?? (game.note || 0),
  };
};

/**
 * Normalise un tableau de jeux bruts
 * @param {Array} games - Liste de jeux bruts
 * @param {string} [apiUrl] - URL du backend
 * @returns {Array} Jeux normalisés
 */
export const normalizeGamesArray = (games, apiUrl = API_URL) =>
  games.map((game) => normalizeGameData(game, apiUrl));
