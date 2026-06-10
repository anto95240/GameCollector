import './LazyImage.css';

import { useEffect, useRef, useState } from 'react';

export interface LazyImageProps {
  src?: string | null;
  srcWebp?: string | null;
  srcSet?: string;
  srcSetWebp?: string;
  sizes?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  srcWebp,
  srcSet,
  srcSetWebp,
  sizes,
  alt,
  width,
  height,
  className = '',
  onLoad,
  onError,
  style = {},
}: any) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [supportsWebP] = useState(() => {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return (
      canvas.toDataURL('image/webp') !==
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    )
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries: any) => {
        entries.forEach((entry: any) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '100px', threshold: 0.01 }
    )

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  // If already in browser cache, mark loaded immediately
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 1) {
      setIsLoaded(true)
    }
  }, [isIntersecting])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Empty placeholder while not intersecting
  const placeholderSrc =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3C/svg%3E'

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''} ${className}`}
      style={style}
    >
      {/* Skeleton shimmer while loading */}
      {!isLoaded && !hasError && <div className="lazy-image-skeleton" />}

      {/* Picture element with WebP / JPEG fallback */}
      <picture>
        {isIntersecting && supportsWebP && srcSetWebp && !hasError && (
          <source srcSet={srcSetWebp} sizes={sizes} type="image/webp" />
        )}
        {isIntersecting && supportsWebP && srcWebp && !hasError && (
          <source srcSet={srcWebp} type="image/webp" />
        )}
        {isIntersecting && srcSet && !hasError && (
          <source srcSet={srcSet} sizes={sizes} type="image/jpeg" />
        )}
        <img
          ref={imgRef}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className="lazy-image"
          src={isIntersecting ? (src || undefined) : placeholderSrc}
        />
      </picture>

      {/* Error state */}
      {hasError && (
        <div className="lazy-image-error">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="2" />
            <path
              d="M20 10V20M20 28H20.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

export default LazyImage
