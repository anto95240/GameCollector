
export interface OptimizedImageProps {
  src: string | null;
  srcSet: string;
  srcWebp?: string | null;
  srcSetWebp?: string;
}

export const formatImageUrl = (imageUrl: string | null | undefined, _apiUrl?: string): string | null => {
  if (!imageUrl) return null
  return imageUrl
}
export const generateWebpUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null
  return imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')
}
export const generateResponsiveSrcSet = (baseUrl: string | null | undefined, widths: number[] = [500, 800, 1200]): string => {
  if (!baseUrl) return ''

  // If the image is a data URL, we cannot append query parameters
  if (baseUrl.startsWith('data:')) return ''

  return widths
    .map((width: any) => {
      // Use query parameters instead of changing the filename
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}w=${width} ${width}w`
    })
    .join(', ')
}
export const generateResponsiveWebpSrcSet = (baseUrl: string | null | undefined, widths: number[] = [500, 800, 1200]): string => {
  if (!baseUrl) return ''

  const srcSet = generateResponsiveSrcSet(baseUrl, widths)
  return srcSet.replace(/(\.[^.]+)(\s\d+w)/g, '.webp$2')
}
export const getOptimizedImageProps = (
  imagePath: string | null | undefined,
  { widths = [500, 800, 1200], autoWebp = true, apiUrl }: { widths?: number[], autoWebp?: boolean, apiUrl?: string } = {}
): OptimizedImageProps => {
  if (!imagePath) return { src: null, srcSet: '' }

  const formattedUrl = formatImageUrl(imagePath, apiUrl)
  const srcSet = generateResponsiveSrcSet(formattedUrl, widths)

  const props: OptimizedImageProps = {
    src: formattedUrl,
    srcSet,
  }

  if (autoWebp) {
    props.srcWebp = generateWebpUrl(formattedUrl)
    props.srcSetWebp = generateResponsiveWebpSrcSet(formattedUrl, widths)
  }

  return props
}
