import { useCallback } from 'react'

import axios from '@/config/interceptor'
import CacheInvalidationService from '@/services/cacheInvalidationService'

import cacheManager from './utils/cacheManager'

const METADATA_TTL = 15 * 60 * 1000 // 15 minutes — métadonnées stables

export const useApiMetadata = () => {
  const getAllMetadata = useCallback(async () => {
    const cacheKey = `metadata:all`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const { data } = await axios.get('/api/metadata')
    cacheManager.set(cacheKey, data, METADATA_TTL)
    return data
  }, [])

  const getMetadataByType = useCallback(async (type: any) => {
    const cacheKey = `metadata:type:${type}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const { data } = await axios.get(`/api/metadata/${type}`)
    cacheManager.set(cacheKey, data, METADATA_TTL)
    return data
  }, [])

  const createMetadata = async (type: any, itemData: any) => {
    const { data } = await axios.post(`/api/metadata/${type}`, itemData)
    CacheInvalidationService.invalidateMetadataCaches()
    return data
  }

  const updateMetadata = async (type: any, id: any, itemData: any) => {
    const { data } = await axios.put(`/api/metadata/${type}/${id}`, itemData)
    CacheInvalidationService.invalidateMetadataCaches()
    return data
  }

  const deleteMetadata = async (type: any, id: any) => {
    const { data } = await axios.delete(`/api/metadata/${type}/${id}`)
    CacheInvalidationService.invalidateMetadataCaches()
    return data
  }

  return {
    getAllMetadata,
    getMetadataByType,
    createMetadata,
    updateMetadata,
    deleteMetadata,
  }
}
