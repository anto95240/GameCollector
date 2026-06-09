import axios from '@/config/interceptor'
import CacheInvalidationService from '@/services/cacheInvalidationService'

import cacheManager from './utils/cacheManager'

const ACHIEVEMENTS_TTL = 5 * 60 * 1000 // 5 minutes

const getAllAchievements = async () => {
  const cacheKey = `achievement:all`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  const { data } = await axios.get('/api/achievements')
  cacheManager.set(cacheKey, data, ACHIEVEMENTS_TTL)
  return data
}

const getUserAchievements = async () => {
  const cacheKey = `achievement:user:me`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  try {
    const { data } = await axios.get('/api/achievements/me')
    cacheManager.set(cacheKey, data, ACHIEVEMENTS_TTL)
    return data
  } catch (error: any) {
    console.warn('[Achievement API] Impossible de récupérer achievements:', error.message)
    return []
  }
}

const getAchievementStats = async () => {
  const cacheKey = `achievement:stats`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  try {
    const { data } = await axios.get('/api/achievements/stats')
    cacheManager.set(cacheKey, data, ACHIEVEMENTS_TTL)
    return data
  } catch (error: any) {
    console.warn('[Achievement API] Impossible de récupérer les statistiques:', error.message)
    return {}
  }
}

const unlockAchievement = async (idName: any) => {
  const { data } = await axios.post(`/api/achievements/${idName}/unlock`)
  // Invalider les caches achievements après un déverrouillage
  CacheInvalidationService.invalidateAchievementCaches()
  return data
}

const achievementsApi = {
  getAllAchievements,
  getUserAchievements,
  unlockAchievement,
  getAchievementStats,
}

export const useApiAchievements = () => {
  return achievementsApi
}
