import { useCallback, useState } from 'react'

import cacheManager from './cacheManager'
export const useApiCache = (apiFunction, cacheKeyPrefix, ttl = 5 * 60 * 1000) => {
  const [isCached, setIsCached] = useState(false)
  const cachedFunction = useCallback(
    async (...args) => {
      // Génère une clé de cache basée sur la fonction et les paramètres
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`

      // Vérifie le cache en premier
      const cached = cacheManager.get(cacheKey)
      if (cached) {
        setIsCached(true)
        return cached
      }

      // Si pas en cache, exécute la fonction réelle
      setIsCached(false)
      try {
        const result = await apiFunction(...args)
        // Stocke dans le cache
        cacheManager.set(cacheKey, result, ttl)
        return result
      } catch (error) {
        throw error
      }
    },
    [apiFunction, cacheKeyPrefix, ttl]
  )

  const clearCache = useCallback(() => {
    cacheManager.invalidatePattern(`^${cacheKeyPrefix}`)
    setIsCached(false)
  }, [cacheKeyPrefix])

  const isCachedData = useCallback(
    (args) => {
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`
      return cacheManager.has(cacheKey)
    },
    [cacheKeyPrefix]
  )

  return {
    cachedFunction,
    clearCache,
    isCachedData,
    isCached,
  }
}

export default useApiCache
