// src/hooks/api/useApiGame.tsx
import { useCallback } from 'react'

import { supabase } from '@/lib/supabase'
import CacheInvalidationService from '@/services/cacheInvalidationService'

import cacheManager from './utils/cacheManager'

export const useApiGame = () => {

  // ── GET ALL GAMES ────────────────────────────────────────────────────
  const getAllGames = useCallback(async (search = '') => {
    const cacheKey = `game:all:${search}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    let query = supabase
      .from('games')
      .select(`
        *,
        status:statuses(id, status_name, color),
        genre:genres(id, genre_name, color),
        platform:platforms(id, platform_name, brand),
        tags:game_tags(tag:tags(id, tag_name, color))
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    cacheManager.set(cacheKey, data)
    return data
  }, [])

  // ── GET GAME BY ID ───────────────────────────────────────────────────
  const getGameById = useCallback(async (id: string) => {
    const cacheKey = `game:detail:${id}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        status:statuses(id, status_name, color),
        genre:genres(id, genre_name, color),
        platform:platforms(id, platform_name, brand),
        tags:game_tags(tag:tags(id, tag_name, color))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    cacheManager.set(cacheKey, data)
    return data
  }, [])

  // ── STATS AVANCÉES ───────────────────────────────────────────────────
  const getAdvancedStats = useCallback(async () => {
    const cacheKey = `game:stats:advanced`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        status:statuses(status_name),
        genre:genres(genre_name),
        platform:platforms(platform_name)
      `)
    if (error) throw error

    // Calcul des stats côté client (même logique qu'avant)
    const stats = {
      total: data.length,
      favorites: data.filter(g => g.is_favorite).length,
      totalPlayingTime: data.reduce((acc, g) => acc + (g.playing_time || 0), 0),
      byStatus: groupBy(data, g => g.status?.status_name),
      byGenre: groupBy(data, g => g.genre?.genre_name),
      byPlatform: groupBy(data, g => g.platform?.platform_name),
    }

    cacheManager.set(cacheKey, stats, 10 * 60 * 1000)
    return stats
  }, [])

  // ── FUZZY SEARCH (via RPC PostgreSQL) ────────────────────────────────
  const getFuzzyGames = useCallback(async (search = '') => {
    const cacheKey = `game:fuzzy:${search}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase.rpc('search_games_fuzzy', {
      p_search: search,
    })
    if (error) throw error

    const result = { status: 'success', results: data.length, data }
    cacheManager.set(cacheKey, result)
    return result
  }, [])

  // ── CREATE GAME ──────────────────────────────────────────────────────
  const createGame = async (gameData: FormData | Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    // Si FormData, extraire les champs
    let payload: Record<string, any> = {}
    let imageFile: File | null = null

    if (gameData instanceof FormData) {
      gameData.forEach((value, key) => {
        if (key === 'image' && value instanceof File) imageFile = value
        else payload[key] = value
      })
      if (payload.tags_ids && typeof payload.tags_ids === 'string') {
        try { payload.tags_ids = JSON.parse(payload.tags_ids) } catch { payload.tags_ids = [payload.tags_ids] }
      }
    } else {
      payload = { ...gameData }
      imageFile = null
    }

    // Upload image
    if (imageFile) {
      payload.image = await uploadImage(imageFile, user.id)
    } else if (!payload.image) {
      payload.image = 'https://placehold.co/400x600?text=No+Cover'
    }

    const { tags_ids, ...gamePayload } = payload

    const { data, error } = await supabase
      .from('games')
      .insert({ ...gamePayload, user_id: user.id })
      .select()
      .single()
    if (error) throw error

    // Insérer les tags
    if (Array.isArray(tags_ids) && tags_ids.length > 0) {
      await supabase.from('game_tags').insert(
        tags_ids.map((tagId: string) => ({ game_id: data.id, tag_id: tagId }))
      )
    }

    CacheInvalidationService.invalidateGameCaches()
    return data
  }

  // ── UPDATE GAME ──────────────────────────────────────────────────────
  const updateGame = async (id: string, gameData: FormData | Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    let payload: Record<string, any> = {}
    let imageFile: File | null = null

    if (gameData instanceof FormData) {
      gameData.forEach((value, key) => {
        if (key === 'image' && value instanceof File && value.size > 0) imageFile = value
        else payload[key] = value
      })
    } else {
      payload = { ...gameData }
    }

    if (imageFile) {
      payload.image = await uploadImage(imageFile, user.id)
    }

    const { tags_ids, ...gamePayload } = payload

    const { data, error } = await supabase
      .from('games')
      .update({ ...gamePayload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Reconstruire les tags
    if (tags_ids !== undefined) {
      await supabase.from('game_tags').delete().eq('game_id', id)
      const tagsArray = Array.isArray(tags_ids) ? tags_ids : [tags_ids]
      if (tagsArray.length > 0) {
        await supabase.from('game_tags').insert(
          tagsArray.map((tagId: string) => ({ game_id: id, tag_id: tagId }))
        )
      }
    }

    CacheInvalidationService.invalidateGameCaches()
    return data
  }

  // ── DELETE GAME ──────────────────────────────────────────────────────
  const deleteGame = async (id: string) => {
    const { data: game } = await supabase.from('games').select('image').eq('id', id).single()

    const { error } = await supabase.from('games').delete().eq('id', id)
    if (error) throw error

    // Supprimer l'image du storage si elle vient de Supabase
    if (game?.image?.includes('supabase')) {
      const path = game.image.split('/storage/v1/object/public/game-images/')[1]
      if (path) await supabase.storage.from('game-images').remove([path])
    }

    CacheInvalidationService.invalidateGameCaches()
    return { message: 'Jeu supprimé avec succès' }
  }

  return {
    getAllGames,
    getGameById,
    getAdvancedStats,
    getFuzzyGames,
    createGame,
    updateGame,
    deleteGame,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
async function uploadImage(file: File, userId: string): Promise<string> {
  const ext      = file.name.split('.').pop()
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('game-images').upload(filePath, file)
  if (error) throw error
  const { data } = supabase.storage.from('game-images').getPublicUrl(filePath)
  return data.publicUrl
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string | undefined) {
  return arr.reduce((acc: Record<string, number>, item) => {
    const key = keyFn(item) ?? 'Inconnu'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}
