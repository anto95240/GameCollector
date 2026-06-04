import React, { useState, useEffect, useRef } from 'react';
import './LazyImage.css';

/**
 * LazyImage Component
 * Optimized image component with lazy-loading, WebP support, and blur placeholder
 * 
 * Features:
 * - IntersectionObserver-based lazy loading
 * - WebP format with fallback support
 * - Responsive srcSet support
 * - Blur placeholder while loading
 * - Optional custom dimensions
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.src - Primary image source (JPEG/PNG fallback)
 * @param {string} [props.srcWebp] - WebP format source (optional, auto-generated if not provided)
 * @param {string} [props.srcSet] - Responsive image set (e.g., "image-500w.jpg 500w, image-800w.jpg 800w")
 * @param {string} [props.srcSetWebp] - Responsive WebP set
 * @param {string} props.alt - Alternative text for accessibility
 * @param {number} [props.width] - Image width in pixels
 * @param {number} [props.height] - Image height in pixels
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.placeholder] - Placeholder type: 'blur' (default), 'skeleton', or 'none'
 * @param {number} [props.placeholderQuality=10] - Blur quality (1-30)
 * @param {Function} [props.onLoad] - Callback when image loads
 * @param {Function} [props.onError] - Callback on load error
 * @param {Object} [props.style] - Inline styles
 * 
 * @example
 * // Basic usage
 * <LazyImage 
 *   src="/games/game1.jpg"
 *   alt="Game Title"
 *   width={400}
 *   height={300}
 * />
 * 
 * @example
 * // With responsive srcSet
 * <LazyImage 
 *   src="/games/game1-800w.jpg"
 *   srcSet="/games/game1-500w.jpg 500w, /games/game1-800w.jpg 800w, /games/game1-1200w.jpg 1200w"
 *   alt="Game Title"
 *   width={400}
 *   height={300}
 * />
 * 
 * @example
 * // With explicit WebP sources
 * <LazyImage 
 *   src="/games/game1.jpg"
 *   srcWebp="/games/game1.webp"
 *   srcSet="/games/game1-500w.jpg 500w, /games/game1-800w.jpg 800w"
 *   srcSetWebp="/games/game1-500w.webp 500w, /games/game1-800w.webp 800w"
 *   alt="Game Title"
 *   width={400}
 *   height={300}
 * />
 */
const LazyImage = ({
  src,
  srcWebp,
  srcSet,
  srcSetWebp,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  placeholderQuality = 10,
  onLoad,
  onError,
  style = {},
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState(true);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Detect WebP support
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    setSupportsWebP(canvas.toDataURL('image/webp') !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }, []);

  // Setup IntersectionObserver for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Load image
  const loadImage = () => {
    if (imgRef.current) {
      // Set WebP source if supported
      if (supportsWebP && srcSetWebp) {
        imgRef.current.srcset = srcSetWebp;
      } else if (srcSet) {
        imgRef.current.srcset = srcSet;
      }

      // Set primary source
      if (supportsWebP && srcWebp) {
        imgRef.current.src = srcWebp;
      } else {
        imgRef.current.src = src;
      }

      // Auto-generate WebP source from jpeg/png if not provided
      if (supportsWebP && !srcWebp && src) {
        const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        if (webpSrc !== src) {
          imgRef.current.src = webpSrc;
          // Fallback to original if WebP fails
          imgRef.current.onerror = () => {
            imgRef.current.src = src;
            handleLoad();
          };
        }
      }
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate blur placeholder
  const generateBlurPlaceholder = () => {
    if (!width || !height || placeholder === 'none') return null;

    const canvas = document.createElement('canvas');
    canvas.width = placeholderQuality;
    canvas.height = Math.round((height / width) * placeholderQuality);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create a subtle gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(100, 100, 130, 0.1)');
      gradient.addColorStop(1, 'rgba(80, 80, 110, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL('image/jpeg', 0.5);
  };

  const blurPlaceholder = placeholder === 'blur' ? generateBlurPlaceholder() : null;

  const containerStyle = {
    ...style,
    ...(width && height ? { aspectRatio: `${width} / ${height}` } : {}),
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: isLoaded ? 'opacity 0.3s ease-in-out' : 'none',
    opacity: isLoaded ? 1 : 0.7,
  };

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${placeholder} ${isLoaded ? 'loaded' : ''} ${hasError ? 'error' : ''} ${className}`}
      style={containerStyle}
    >
      {/* Blur placeholder */}
      {blurPlaceholder && !isLoaded && (
        <div
          className="lazy-image-placeholder"
          style={{
            backgroundImage: `url(${blurPlaceholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            filter: 'blur(20px) scale(1.1)',
            zIndex: 1,
          }}
        />
      )}

      {/* Skeleton loader placeholder */}
      {placeholder === 'skeleton' && !isLoaded && (
        <div className="lazy-image-skeleton" />
      )}

      {/* Picture element for WebP/fallback support */}
      <picture>
        {supportsWebP && srcSetWebp && (
          <source
            srcSet={srcSetWebp}
            type="image/webp"
          />
        )}
        {supportsWebP && srcWebp && (
          <source
            srcSet={srcWebp}
            type="image/webp"
          />
        )}
        {srcSet && (
          <source
            srcSet={srcSet}
            type="image/jpeg"
          />
        )}
        <img
          ref={imgRef}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          style={imgStyle}
          className="lazy-image"
          // Initial low-quality placeholder src to prevent broken image icon
          src={blurPlaceholder || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3C/svg%3E'}
        />
      </picture>

      {/* Error fallback message */}
      {hasError && (
        <div className="lazy-image-error">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
  );
};

export default LazyImage;
