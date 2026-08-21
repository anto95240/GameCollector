// src/hooks/api/useApiAchievements.tsx
import { supabase } from '@/lib/supabase'
import CacheInvalidationService from '@/services/cacheInvalidationService'

import cacheManager from './utils/cacheManager'

const ACHIEVEMENTS_TTL = 5 * 60 * 1000

const getAllAchievements = async () => {
  const cacheKey = `achievement:all`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase.from('achievements').select('*').order('rarity')
  if (error) throw error

  cacheManager.set(cacheKey, data, ACHIEVEMENTS_TTL)
  return data
}

const getUserAchievements = async () => {
  const cacheKey = `achievement:user:me`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(id_name, title, description, icon, rarity)')
      .order('unlocked_at', { ascending: false })
    if (error) throw error

    // Aplatir pour garder la même structure qu'avant
    const mapped = (data ?? []).map((ua) => ({
      id_name: ua.achievement?.id_name,
      title: ua.achievement?.title,
      description: ua.achievement?.description,
      icon: ua.achievement?.icon,
      rarity: ua.achievement?.rarity,
      unlockedAt: ua.unlocked_at,
    }))
    cacheManager.set(cacheKey, mapped, ACHIEVEMENTS_TTL)
    return mapped
  } catch (error: any) {
    console.warn('[Achievement] Impossible de récupérer:', error.message)
    return []
  }
}

// Stats calculées côté client depuis les jeux
const getAchievementStats = async () => {
  const cacheKey = `achievement:stats`
  const cached = cacheManager.get(cacheKey)
  if (cached) return cached

  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('*, status:statuses(status_name)')
    if (error) throw error

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: history } = await supabase
      .from('recently_viewed')
      .select('game_id')
      .eq('user_id', user?.id ?? '')

    const { data: filters } = await supabase
      .from('saved_filters')
      .select('id')
      .eq('user_id', user?.id ?? '')

    const normalizeText = (v: any) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const stats = {
      totalGames: games.length,
      favoritesCount: games.filter((g) => g.is_favorite).length,
      marioGames: games.filter((g) => g.name?.toLowerCase().includes('mario')).length,
      totalPlayTime: games.reduce((acc, g) => acc + (Number(g.playing_time) || 0), 0),
      reviewedGamesCount: games.filter(
        (g) => g.note !== null && String(g.comment || '').trim().length > 0
      ).length,
      completedGamesCount: games.filter((g) =>
        normalizeText(g.status?.status_name).includes('termin')
      ).length,
      soonGamesCount: games.filter((g) => g.is_soon).length,
      uniquePlatformsCount: new Set(games.map((g) => g.platform_id).filter(Boolean)).size,
      uniqueGenresCount: new Set(games.map((g) => g.genre_id).filter(Boolean)).size,
      retroGamesCount: games.filter((g) => Number(g.year) > 0 && Number(g.year) < 2000).length,
      archivisteCount: games.filter(
        (g) =>
          g.description &&
          g.note !== null &&
          g.comment &&
          g.year &&
          g.playing_time &&
          g.developer &&
          g.succes
      ).length,
      historyCount: history?.length ?? 0,
      savedFiltersCount: filters?.length ?? 0,
    }

    cacheManager.set(cacheKey, stats, ACHIEVEMENTS_TTL)
    return stats
  } catch (error: any) {
    console.warn('[Achievement Stats]', error.message)
    return {}
  }
}

const unlockAchievement = async (idName: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  // Trouver l'achievement par id_name
  const { data: achievement, error: findError } = await supabase
    .from('achievements')
    .select('id')
    .eq('id_name', idName)
    .single()
  if (findError) throw findError

  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: user.id, achievement_id: achievement.id })

  // Ignorer les doublons (déjà débloqué)
  if (error && error.code !== '23505') throw error

  CacheInvalidationService.invalidateAchievementCaches()
  return { success: true, message: `Achievement '${idName}' unlocked` }
}

const achievementsApi = {
  getAllAchievements,
  getUserAchievements,
  unlockAchievement,
  getAchievementStats,
}

export const useApiAchievements = () => achievementsApi
