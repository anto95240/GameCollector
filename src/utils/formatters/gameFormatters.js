import { createSlug } from "../helpers/slugGenerator";
import { formatImageUrl } from "./imageFormatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
export const isWishlistStatusName = (statusName = "") => {
  const lower = statusName.toLowerCase();
  return lower.includes("wishlist") ||
    lower.includes("à venir") ||
    lower.includes("prochainement");
};
export const extractGamesList = (data) =>
  Array.isArray(data) ? data : data?.games || [];
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
export const formatGamesForCarousel = (games, apiUrl = API_URL) => {
  return games.map((game) => ({
    ...game,
    id: game._id,
    imageUrl: formatImageUrl(game.image, apiUrl),
  }));
};
export const createGameSlug = createSlug;
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
export const deduplicateGames = (games) => {
  const seen = new Set();
  return games.filter((game) => {
    const id = String(game._id || game.id || "");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
export const normalizeGameBooleans = (game) => {
  return {
    ...game,
    isFavorite: game.isFavorite === true || String(game.isFavorite) === "true",
    isSoon: game.isSoon === true || String(game.isSoon) === "true",
  };
};
export const normalizeGameData = (game, apiUrl = API_URL) => {
  const withBooleans = normalizeGameBooleans(game);
  return {
    ...withBooleans,
    id: game.id || game._id,
    imageUrl: game.imageUrl || formatImageUrl(game.image, apiUrl),
    rating: game.rating ?? (game.note || 0),
  };
};
export const normalizeGamesArray = (games, apiUrl = API_URL) =>
  games.map((game) => normalizeGameData(game, apiUrl));
