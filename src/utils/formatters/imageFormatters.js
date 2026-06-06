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

/**
 * Génère les sources WebP correspondantes pour une URL d'image
 * Convertit .jpg/.jpeg/.png en .webp
 * @param {string} imageUrl - L'URL de l'image
 * @returns {string|null} L'URL WebP correspondante ou null
 */
export const generateWebpUrl = (imageUrl) => {
  if (!imageUrl) return null;
  return imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
};

/**
 * Génère un ensemble srcSet responsive avec les dimensions spécifiées
 * Crée des URLs pour différentes largeurs (mobile, tablet, desktop)
 * @param {string} baseUrl - L'URL de base de l'image
 * @param {Array<number>} [widths=[500, 800, 1200]] - Largeurs à générer
 * @returns {string} srcSet formaté pour utilisation dans <img srcset>
 * 
 * @example
 * generateResponsiveSrcSet('/images/game.jpg')
 * // Retourne: '/images/game-500w.jpg 500w, /images/game-800w.jpg 800w, /images/game-1200w.jpg 1200w'
 */
export const generateResponsiveSrcSet = (baseUrl, widths = [500, 800, 1200]) => {
  if (!baseUrl) return '';
  
  // If the image is a data URL, we cannot append query parameters
  if (baseUrl.startsWith('data:')) return '';

  return widths
    .map((width) => {
      // Use query parameters instead of changing the filename
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}w=${width} ${width}w`;
    })
    .join(', ');
};

/**
 * Génère un ensemble srcSet WebP responsive
 * @param {string} baseUrl - L'URL de base de l'image
 * @param {Array<number>} [widths=[500, 800, 1200]] - Largeurs à générer
 * @returns {string} srcSet WebP formaté
 */
export const generateResponsiveWebpSrcSet = (baseUrl, widths = [500, 800, 1200]) => {
  if (!baseUrl) return '';
  
  const srcSet = generateResponsiveSrcSet(baseUrl, widths);
  return srcSet.replace(/(\.[^.]+)(\s\d+w)/g, '.webp$2');
};

/**
 * Crée un objet de propriétés pour le composant LazyImage
 * Combine formatImageUrl, WebP generation, et srcSet responsive
 * @param {string} imagePath - Le chemin de l'image (relatif ou absolu)
 * @param {Object} [options={}] - Options additionnelles
 * @param {Array<number>} [options.widths=[500, 800, 1200]] - Largeurs responsive
 * @param {boolean} [options.autoWebp=true] - Générer automatiquement WebP
 * @param {string} [options.apiUrl] - URL du backend personnalisée
 * @returns {Object} Props optimisées pour LazyImage
 * 
 * @example
 * const props = getOptimizedImageProps('/games/game1.jpg', { widths: [400, 600, 1000] });
 * // Retourne: { src: 'http://localhost:5001/games/game1.jpg', srcWebp: '...webp', srcSet: '...' }
 * <LazyImage {...props} alt="Game" />
 */
export const getOptimizedImageProps = (
  imagePath,
  {
    widths = [500, 800, 1200],
    autoWebp = true,
    apiUrl = API_URL,
  } = {}
) => {
  if (!imagePath) return {};

  const formattedUrl = formatImageUrl(imagePath, apiUrl);
  const srcSet = generateResponsiveSrcSet(formattedUrl, widths);
  
  const props = {
    src: formattedUrl,
    srcSet,
  };

  if (autoWebp) {
    props.srcWebp = generateWebpUrl(formattedUrl);
    props.srcSetWebp = generateResponsiveWebpSrcSet(formattedUrl, widths);
  }

  return props;
};
