import { useCallback,useEffect, useState } from 'react';

import cacheManager from '@/hooks/api/utils/cacheManager';
export const useCacheTracking = (cacheKeyPrefix, dependencies = []) => {
  const [isCached, setIsCached] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);

  const markCacheHit = useCallback((cacheKey) => {
    setIsCached(true);
    setCacheInfo({
      key: cacheKey,
      timestamp: Date.now(),
      hitTime: new Date().toLocaleTimeString('fr-FR')
    });
  }, []);

  const resetCacheFlag = useCallback(() => {
    setIsCached(false);
    setCacheInfo(null);
  }, []);

  const checkIsCached = useCallback((args) => {
    const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`;
    return cacheManager.has(cacheKey);
  }, [cacheKeyPrefix]);

  useEffect(() => {
    // Réinitialise le flag quand les dépendances changent
    resetCacheFlag();
  }, dependencies);

  return {
    isCached,
    cacheInfo,
    markCacheHit,
    resetCacheFlag,
    checkIsCached
  };
};
export const useCacheNotification = (message, showToast, showCacheNotification = false) => {
  const notifyCache = useCallback(() => {
    if (showCacheNotification && showToast) {
      showToast({
        type: 'info',
        message: message || '📦 Données chargées depuis le cache',
        duration: 2000
      });
    }
  }, [message, showToast, showCacheNotification]);

  return { notifyCache };
};

export default useCacheTracking;
