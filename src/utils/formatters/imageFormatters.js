const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * Formate l'URL d'une image
 * Ajoute l'URL du backend si nécessaire
 * @param {string} imageUrl - L'URL ou chemin de l'image
 * @param {string} [apiUrl] - URL du backend (optionnel)
 * @returns {string|null} L'URL complète ou null
 */
export const formatImageUrl = (imageUrl, apiUrl = API_URL) => {
  if (!imageUrl) return null;
  // Si c'est déjà une URL complète ou une data URL, retourner tel quel
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  // Sinon, ajouter l'URL du backend
  return `${apiUrl}${imageUrl}`;
};
