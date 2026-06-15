import Fuse from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useApiGame } from '@/hooks/api/useApiGame'
// Hook UI: Gère la recherche intelligente (tolérance aux fautes) avec Fuse.js et fallback API
export const useFuzzySearch = (itemsList: any, searchKeys = ['title']) => {
  const { getFuzzyGames } = useApiGame()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const safeItemsList = useMemo(() => Array.isArray(itemsList) ? itemsList : [], [itemsList])
  const isDev = import.meta.env.DEV
  const backendDisabledRef = useRef(false)

  const _resolveLocalMatches = (candidateItems: any) => {
    const candidates = Array.isArray(candidateItems) ? candidateItems : []

    if (candidates.length === 0) {
      return []
    }

    const candidateKeys = new Set()

    for (const item of candidates) {
      candidateKeys.add(String(item?.id ?? item?._id ?? '').toLowerCase())
      candidateKeys.add(String(item?.name ?? item?.title ?? '').toLowerCase())
    }

    return safeItemsList.filter((item: any) => {
      const itemId = String(item?.id ?? item?._id ?? '').toLowerCase()
      const itemName = String(item?.name ?? item?.title ?? '').toLowerCase()
      return candidateKeys.has(itemId) || candidateKeys.has(itemName)
    })
  }

  // Initialisation de Fuse avec mémorisation pour les performances
  const fuse = useMemo(
    () =>
      new Fuse(safeItemsList, {
        keys: searchKeys,
        threshold: 0.3, // 0.3 = bon équilibre (tolère quelques fautes, mais pas trop)
        ignoreLocation: true, // Trouve le mot même s'il est à la fin du titre
        includeScore: true,
      }),
    [safeItemsList, searchKeys]
  )

  // Synchronisation de la liste complète si la recherche est vide
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    if (!query.trim()) {
      setResults(safeItemsList)
    }
  }

  useEffect(() => {
    let isActive = true
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return () => {
        isActive = false
      }
    }

    // Exécution de la recherche: Priorité backend, fallback Fuse.js local si échec
    const runSearch = async () => {
      if (backendDisabledRef.current) {
        const fallbackResults = fuse.search(trimmedQuery).map((result: any) => result.item)

        if (!isActive) return

        setResults(fallbackResults)
        return
      }

      try {
        const apiResponse = await getFuzzyGames(trimmedQuery)

        const normalizedResults = Array.isArray(apiResponse)
          ? apiResponse
          : apiResponse?.data || apiResponse?.games || []

        if (!isActive) return

        const nextResults = Array.isArray(normalizedResults) ? normalizedResults : []

        if (nextResults.length > 0) {
          setResults(nextResults)
          return
        }
      } catch (error: any) {
        backendDisabledRef.current = error?.response?.status === 404
      }

      const fallbackResults = fuse.search(trimmedQuery).map((result: any) => result.item)

      if (!isActive) return

      setResults(fallbackResults)
    }

    runSearch()

    return () => {
      isActive = false
    }
  }, [query, fuse, safeItemsList, searchKeys, isDev, getFuzzyGames])

  return { query, setQuery, results }
}
