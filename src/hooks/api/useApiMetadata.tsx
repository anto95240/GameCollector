// src/hooks/api/useApiMetadata.tsx
import { useCallback } from 'react'

import { supabase } from '@/lib/supabase'
import CacheInvalidationService from '@/services/cacheInvalidationService'

import cacheManager from './utils/cacheManager'

const METADATA_TTL = 15 * 60 * 1000

// Mapping type → nom de la fonction RPC
const RPC_MAP: Record<string, string> = {
  status:   'get_resolved_statuses',
  genre:    'get_resolved_genres',
  platform: 'get_resolved_platforms',
  tag:      'get_resolved_tags',
}

export const useApiMetadata = () => {

  // ── GET ALL METADATA ─────────────────────────────────────────────────
  const getAllMetadata = useCallback(async () => {
    const cacheKey = `metadata:all`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const [statuses, genres, platforms, tags] = await Promise.all([
      supabase.rpc('get_resolved_statuses'),
      supabase.rpc('get_resolved_genres'),
      supabase.rpc('get_resolved_platforms'),
      supabase.rpc('get_resolved_tags'),
    ])

    if (statuses.error) console.error("Statuses RPC error:", statuses.error)
    if (genres.error) console.error("Genres RPC error:", genres.error)
    if (platforms.error) console.error("Platforms RPC error:", platforms.error)
    if (tags.error) console.error("Tags RPC error:", tags.error)

    const data = {
      statuses: (statuses.data ?? []).map((x: any) => ({ ...x, _id: x.id })),
      genres:   (genres.data   ?? []).map((x: any) => ({ ...x, _id: x.id })),
      platforms: (platforms.data ?? []).map((x: any) => ({ ...x, _id: x.id })),
      tags:     (tags.data     ?? []).map((x: any) => ({ ...x, _id: x.id })),
    }
    cacheManager.set(cacheKey, data, METADATA_TTL)
    return data
  }, [])

  // ── GET BY TYPE ──────────────────────────────────────────────────────
  const getMetadataByType = useCallback(async (type: string) => {
    const cacheKey = `metadata:type:${type}`
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    // Normaliser : 'statuses' → 'status', 'genres' → 'genre', etc.
    let normalized = type;
    if (type === 'statuses') normalized = 'status';
    else if (type !== 'status' && type.endsWith('s')) normalized = type.slice(0, -1);

    const rpcName = RPC_MAP[normalized]
    if (!rpcName) throw new Error(`Type inconnu : ${type}`)

    const { data, error } = await supabase.rpc(rpcName)
    if (error) throw error

    const mappedData = data.map((x: any) => ({ ...x, _id: x.id }))
    cacheManager.set(cacheKey, mappedData, METADATA_TTL)
    return mappedData
  }, [])

  // ── CREATE (élément privé uniquement) ────────────────────────────────
  const createMetadata = async (type: string, itemData: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    const table     = type === 'status' ? 'statuses' : (type.endsWith('s') ? type : type + 's')
    const nameCol   = `${type}_name`

    const { data, error } = await supabase
      .from(table)
      .insert({ ...itemData, [nameCol]: itemData.name ?? itemData[nameCol], user_id: user.id })
      .select()
      .single()
    if (error) throw error

    CacheInvalidationService.invalidateMetadataCaches()
    return data
  }

  // ── UPDATE — Copy-on-Write via RPC ───────────────────────────────────
  // Si l'élément est global → crée une surcharge personnelle
  // Si l'élément est privé  → mise à jour directe
  const updateMetadata = async (type: string, id: string, itemData: Record<string, any>) => {
    const table = type === 'status' ? 'statuses' : (type.endsWith('s') ? type : type + 's')

    const { data, error } = await supabase.rpc('upsert_metadata_override', {
      p_table:   table,
      p_item_id: id,
      p_name:    itemData.name ?? itemData[`${type}_name`],
      p_color:   itemData.color ?? '#6B7280',
    })
    if (error) throw error

    CacheInvalidationService.invalidateMetadataCaches()
    return data
  }

  // ── DELETE — Masquage (global) ou suppression réelle (privé) ─────────
  const deleteMetadata = async (type: string, id: string) => {
    const table = type === 'status' ? 'statuses' : (type.endsWith('s') ? type : type + 's')

    const { data, error } = await supabase.rpc('delete_metadata_item', {
      p_table:   table,
      p_item_id: id,
    })
    if (error) throw error

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
