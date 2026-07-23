// src/hooks/api/useApiGame.tsx
import { useCallback } from 'react'

import { supabase } from '@/lib/supabase'
import CacheInvalidationService from '@/services/cacheInvalidationService'
import { isWishlistStatusName } from '@/utils/formatters'

import cacheManager from './utils/cacheManager'

export const useApiGame = () => {
  // ── GET ALL GAMES ────────────────────────────────────────────────────
  const getAllGames = useCallback(async (search = '') => {
    const cacheKey = `game:all:${search}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    let query = supabase
      .from('games')
      .select(
        `
        *,
        status:statuses(id, status_name, color),
        genre:genres(id, genre_name, color),
        platform:platforms(id, platform_name, brand),
        tags:game_tags(tag:tags(id, tag_name, color))
      `
      )
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
      .select(
        `
        *,
        status:statuses(id, status_name, color),
        genre:genres(id, genre_name, color),
        platform:platforms(id, platform_name, brand),
        tags:game_tags(tag:tags(id, tag_name, color))
      `
      )
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

    const { data, error } = await supabase.from('games').select(`
        *,
        status:statuses(status_name),
        genre:genres(genre_name),
        platform:platforms(platform_name),
        tags:game_tags(tag:tags(tag_name))
      `)
    if (error) throw error

    // Calcul des stats côté client (même logique qu'avant)
    // Fonction helper locale pour transformer un Record<string, number> en [{name, value}]
    const toNameValue = (record: Record<string, number>) =>
      Object.entries(record).map(([name, value]) => ({ name, value }))

    // Groupement par ID pour les graphiques existants
    const byPlatformId = groupBy(data, (g) => g.platform_id)
    const byGenreId = groupBy(data, (g) => g.genre_id)
    const byStatusId = groupBy(data, (g) => g.status_id)

    // Calcul des stats par année
    const byYear = groupBy(data, (g) => (g.year ? g.year.toString() : 'Inconnu'))
    const years = Object.entries(byYear)
      .map(([year, count]) => ({ year, count }))
      .filter((y) => y.year !== 'Inconnu')
      .sort((a, b) => Number(a.year) - Number(b.year))

    // Formatage pour radar (genres)
    const radar = Object.entries(byGenreId).map(([subject, count]) => ({
      subject,
      A: count,
      fullMark: data.length > 0 ? data.length : 100,
    }))

    // Calculs dérivés pour les widgets
    const favoritesList = data.filter((g: any) => g.is_favorite)
    const completedList = data.filter((g: any) => g.status?.status_name === 'Terminé')
    const inProgressList = data.filter((g: any) => g.status?.status_name === 'En cours')
    const wishlistList = data.filter((g: any) => isWishlistStatusName(g.status?.status_name))
    const gamesWithRating = data.filter(
      (g: any) => g.note !== null && g.note !== undefined && g.note > 0
    )
    const avgRating =
      gamesWithRating.length > 0
        ? Math.round(
            (gamesWithRating.reduce((a: number, g: any) => a + g.note, 0) /
              gamesWithRating.length) *
              10
          ) / 10
        : 0

    // Top platform & genre par nombre de jeux
    const topPlatformEntry = Object.entries(byPlatformId).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]
    const topGenreEntry = Object.entries(byGenreId).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]

    const stats = {
      rawGames: data,
      // ── Valeurs principales ──
      total: data.length,
      totalGames: data.length,
      favorites: favoritesList.length,
      favoriteCount: favoritesList.length,
      platformCount: Object.keys(byPlatformId).length,
      genreCount: Object.keys(byGenreId).length,
      statusCount: Object.keys(byStatusId).length,
      totalPlayingTime: data.reduce((acc: number, g: any) => acc + (g.playing_time || 0), 0),
      avgRating,
      completedCount: completedList.length,
      inProgressCount: inProgressList.length,
      wishlistCount: wishlistList.length,
      // ── Sous-objet pour InsightsPanel / StatusFunnelChart ──
      overview: {
        totalGames: data.length,
        topPlatform: topPlatformEntry ? topPlatformEntry[0] : 'N/A',
        topGenre: topGenreEntry ? topGenreEntry[0] : 'N/A',
      },
      // ── Groupements ──
      byStatus: groupBy(data, (g: any) => g.status?.status_name),
      byGenre: groupBy(data, (g: any) => g.genre?.genre_name),
      byPlatform: groupBy(data, (g: any) => g.platform?.platform_name),
      platforms: toNameValue(byPlatformId),
      funnel: toNameValue(byStatusId),
      radar,
      years,
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    // Si FormData, extraire les champs
    let payload: Record<string, any> = {}
    let imageFile: File | null = null

    if (gameData instanceof FormData) {
      const keys = Array.from(gameData.keys())
      const uniqueKeys = [...new Set(keys)]

      uniqueKeys.forEach((key) => {
        if (key === 'image') {
          const file = gameData.get('image')
          if (file instanceof File && file.size > 0) imageFile = file
        } else if (key === 'tags_ids') {
          payload[key] = gameData.getAll('tags_ids')
        } else {
          const val = gameData.get(key)
          if (val === 'true') payload[key] = true
          else if (val === 'false') payload[key] = false
          else if (val === 'null') payload[key] = null
          else payload[key] = val
        }
      })
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
      const { error: insError } = await supabase
        .from('game_tags')
        .insert(tags_ids.map((tagId: string) => ({ game_id: data.id, tag_id: tagId })))
      if (insError) {
        console.error('Error inserting tags:', insError)
        throw new Error('Erreur association tags: ' + insError.message)
      }
    }

    CacheInvalidationService.invalidateGameCaches()
    return data
  }

  // ── UPDATE GAME ──────────────────────────────────────────────────────
  const updateGame = async (id: string, gameData: FormData | Record<string, any>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    let payload: Record<string, any> = {}
    let imageFile: File | null = null

    if (gameData instanceof FormData) {
      const keys = Array.from(gameData.keys())
      const uniqueKeys = [...new Set(keys)]

      uniqueKeys.forEach((key) => {
        if (key === 'image') {
          const file = gameData.get('image')
          if (file instanceof File && file.size > 0) imageFile = file
        } else if (key === 'tags_ids') {
          payload[key] = gameData.getAll('tags_ids')
        } else {
          const val = gameData.get(key)
          if (val === 'true') payload[key] = true
          else if (val === 'false') payload[key] = false
          else if (val === 'null') payload[key] = null
          else payload[key] = val
        }
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
      const { error: delError } = await supabase.from('game_tags').delete().eq('game_id', id)
      if (delError) console.error('Error deleting tags:', delError)

      const tagsArray = Array.isArray(tags_ids) ? tags_ids : [tags_ids]
      if (tagsArray.length > 0) {
        const { error: insError } = await supabase
          .from('game_tags')
          .insert(tagsArray.map((tagId: string) => ({ game_id: id, tag_id: tagId })))
        if (insError) {
          console.error('Error inserting tags:', insError)
          throw new Error('Erreur association tags: ' + insError.message)
        }
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
  const ext = file.name.split('.').pop()
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
