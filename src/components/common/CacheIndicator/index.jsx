import './CacheIndicator.css';

import React from 'react';

/**
 * Composant indicateur de cache
 * Affiche un badge quand les données sont en cache
 */
export const CacheIndicator = ({ isCached, size = 'md', showLabel = false }) => {
  if (!isCached) return null;

  return (
    <div className={`cache-indicator cache-indicator--${size}`} title="Données en cache">
      <svg
        className="cache-indicator__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {showLabel && <span className="cache-indicator__label">Mise en cache</span>}
    </div>
  );
};

/**
 * Badge de cache pour les listes
 */
export const CacheBadge = ({ className = '' }) => (
  <span className={`cache-badge ${className}`} title="Données en cache">
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  </span>
);

/**
 * Label inline pour indiquer les données en cache
 */
export const CacheLabel = ({ className = '' }) => (
  <span className={`cache-label ${className}`} title="Données en cache">
    Mis en cache
  </span>
);

export default CacheIndicator;
