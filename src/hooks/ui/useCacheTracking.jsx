import { useCallback,useEffect, useState } from 'react';

import cacheManager from '@/hooks/api/utils/cacheManager';

/**
 * Hook pour tracker l'état du cache
 * Retourne si les données actuelles sont en cache et réinitialise le flag après use
 * 
 * @param {string} cacheKeyPrefix - Préfixe de la clé de cache
 * @param {array} dependencies - Dépendances pour réinitialiser le flag
 * @returns {object} { isCached, cacheInfo }
 */
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

/**
 * Hook pour afficher un toast/notification quand des données en cache sont utilisées
 * 
 * @param {string} message - Message à afficher
 * @param {function} showToast - Fonction pour afficher le toast
 * @param {boolean} showCacheNotification - Flag pour activer les notifications
 */
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
