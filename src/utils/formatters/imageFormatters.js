const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
export const formatImageUrl = (imageUrl, apiUrl = API_URL) => {
  if (!imageUrl) return null
  // Si c'est déjà une URL complète ou une data URL, retourner tel quel
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
    return imageUrl
  }
  // Sinon, ajouter l'URL du backend
  return `${apiUrl}${imageUrl}`
}
export const generateWebpUrl = (imageUrl) => {
  if (!imageUrl) return null
  return imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')
}
export const generateResponsiveSrcSet = (baseUrl, widths = [500, 800, 1200]) => {
  if (!baseUrl) return ''

  // If the image is a data URL, we cannot append query parameters
  if (baseUrl.startsWith('data:')) return ''

  return widths
    .map((width) => {
      // Use query parameters instead of changing the filename
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}w=${width} ${width}w`
    })
    .join(', ')
}
export const generateResponsiveWebpSrcSet = (baseUrl, widths = [500, 800, 1200]) => {
  if (!baseUrl) return ''

  const srcSet = generateResponsiveSrcSet(baseUrl, widths)
  return srcSet.replace(/(\.[^.]+)(\s\d+w)/g, '.webp$2')
}
export const getOptimizedImageProps = (
  imagePath,
  { widths = [500, 800, 1200], autoWebp = true, apiUrl = API_URL } = {}
) => {
  if (!imagePath) return {}

  const formattedUrl = formatImageUrl(imagePath, apiUrl)
  const srcSet = generateResponsiveSrcSet(formattedUrl, widths)

  const props = {
    src: formattedUrl,
    srcSet,
  }

  if (autoWebp) {
    props.srcWebp = generateWebpUrl(formattedUrl)
    props.srcSetWebp = generateResponsiveWebpSrcSet(formattedUrl, widths)
  }

  return props
}
