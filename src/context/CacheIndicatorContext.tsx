import { createContext, useCallback, useContext, useState } from 'react'

interface CacheIndicatorContextType {
  cachedKeys: Set<string>
  markCached: (key: string) => void
  markNotCached: (key: string) => void
  isCached: (key: string) => boolean
  clearCachedIndicators: () => void
}

const CacheIndicatorContext = createContext<CacheIndicatorContextType | null>(null)

export const CacheIndicatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set())

  const markCached = useCallback((key: string) => {
    setCachedKeys((prev) => {
      const updated = new Set(prev)
      updated.add(key)
      return updated
    })
  }, [])

  const markNotCached = useCallback((key: string) => {
    setCachedKeys((prev) => {
      const updated = new Set(prev)
      updated.delete(key)
      return updated
    })
  }, [])

  const isCached = useCallback(
    (key: string) => {
      return cachedKeys.has(key)
    },
    [cachedKeys]
  )

  const clearCachedIndicators = useCallback(() => {
    setCachedKeys(new Set())
  }, [])

  return (
    <CacheIndicatorContext.Provider
      value={{
        cachedKeys,
        markCached,
        markNotCached,
        isCached,
        clearCachedIndicators,
      }}
    >
      {children}
    </CacheIndicatorContext.Provider>
  )
}

export const useCacheIndicator = () => {
  const context = useContext(CacheIndicatorContext)
  if (!context) {
    throw new Error('useCacheIndicator doit être utilisé dans un CacheIndicatorProvider')
  }
  return context
}
