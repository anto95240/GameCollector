import { useCallback, useState } from 'react'

import cacheManager from '@/hooks/api/utils/cacheManager'
export const useCacheTracking = (cacheKeyPrefix: any, dependencies = []) => {
  const [isCached, setIsCached] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<any>(null)

  const markCacheHit = useCallback((cacheKey: any) => {
    setIsCached(true)
    setCacheInfo({
      key: cacheKey,
      timestamp: Date.now(),
      hitTime: new Date().toLocaleTimeString('fr-FR'),
    })
  }, [])

  const resetCacheFlag = useCallback(() => {
    setIsCached(false)
    setCacheInfo(null)
  }, [])

  const checkIsCached = useCallback(
    (args: any) => {
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`
      return cacheManager.has(cacheKey)
    },
    [cacheKeyPrefix]
  )

  const [prevDeps, setPrevDeps] = useState(dependencies)
  if (JSON.stringify(prevDeps) !== JSON.stringify(dependencies)) {
    setPrevDeps(dependencies)
    resetCacheFlag()
  }

  return {
    isCached,
    cacheInfo,
    markCacheHit,
    resetCacheFlag,
    checkIsCached,
  }
}
export const useCacheNotification = (message: any, showToast: any, showCacheNotification = false) => {
  const notifyCache = useCallback(() => {
    if (showCacheNotification && showToast) {
      showToast({
        type: 'info',
        message: message || '📦 Données chargées depuis le cache',
        duration: 2000,
      })
    }
  }, [message, showToast, showCacheNotification])

  return { notifyCache }
}

export default useCacheTracking
