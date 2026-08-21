// src/hooks/api/useApiFilters.tsx
import { useCallback, useState } from 'react'

import { supabase } from '@/lib/supabase'

import cacheManager from './utils/cacheManager'
import { extractFilterValues } from './utils/filterExtractors'
import { mapApiFilterToLocal } from './utils/filterMappers'

const FILTERS_TTL = 3 * 60 * 1000

export const useApiFilters = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const invalidateCache = () => {
    cacheManager.invalidatePattern(/^filters:/)
  }

  const getUserFilters = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const cacheKey = `filters:${user.id}:all`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const mapped = (data ?? []).map(mapApiFilterToLocal)
      cacheManager.set(cacheKey, mapped, FILTERS_TTL)
      return mapped
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const saveUserFilter = useCallback(
    async ({ name, selectedFilters, description, isActive = false }: any) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      setLoading(true)
      try {
        const payloadValues = extractFilterValues(selectedFilters)
        const { data, error } = await supabase
          .from('saved_filters')
          .insert({
            user_id: user.id,
            name,
            description: description || payloadValues.description,
            genre: payloadValues.genre,
            platform: payloadValues.platform,
            min_rating: payloadValues.minRating,
            max_rating: payloadValues.maxRating,
            release_year: payloadValues.releaseYear,
            is_active: isActive,
          })
          .select()
          .single()
        if (error) throw error

        invalidateCache()
        window.dispatchEvent(new CustomEvent('checkAchievements'))
        return mapApiFilterToLocal(data)
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteUserFilter = useCallback(async (filterId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('saved_filters').delete().eq('id', filterId)
      if (error) throw error
      invalidateCache()
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const setActiveUserFilter = useCallback(async (filterId: string) => {
    setLoading(true)
    try {
      // RPC atomique : désactive les autres, active celui-ci
      const { data, error } = await supabase.rpc('set_active_filter', {
        p_filter_id: filterId,
      })
      if (error) throw error
      invalidateCache()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getActiveUserFilter = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const cacheKey = `filters:${user.id}:active`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error

      const mapped = data ? mapApiFilterToLocal(data) : null
      if (mapped) cacheManager.set(cacheKey, mapped, FILTERS_TTL)
      return mapped
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getUserFilters,
    saveUserFilter,
    deleteUserFilter,
    setActiveUserFilter,
    getActiveUserFilter,
  }
}

export default useApiFilters
