/**
 * Contexte pour partager l'état du cache avec les composants
 * Permet aux composants de savoir si les données affichées sont en cache
 */

import { createContext, useCallback,useContext, useState } from 'react';

const CacheIndicatorContext = createContext(null);

export const CacheIndicatorProvider = ({ children }) => {
  const [cachedKeys, setCachedKeys] = useState(new Set());

  const markCached = useCallback((key) => {
    setCachedKeys(prev => {
      const updated = new Set(prev);
      updated.add(key);
      return updated;
    });
  }, []);

  const markNotCached = useCallback((key) => {
    setCachedKeys(prev => {
      const updated = new Set(prev);
      updated.delete(key);
      return updated;
    });
  }, []);

  const isCached = useCallback((key) => {
    return cachedKeys.has(key);
  }, [cachedKeys]);

  const clearCachedIndicators = useCallback(() => {
    setCachedKeys(new Set());
  }, []);

  return (
    <CacheIndicatorContext.Provider
      value={{
        cachedKeys,
        markCached,
        markNotCached,
        isCached,
        clearCachedIndicators
      }}
    >
      {children}
    </CacheIndicatorContext.Provider>
  );
};

export const useCacheIndicator = () => {
  const context = useContext(CacheIndicatorContext);
  if (!context) {
    throw new Error('useCacheIndicator doit être utilisé dans un CacheIndicatorProvider');
  }
  return context;
};
