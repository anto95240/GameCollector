// src/services/externalApiService.ts
// Migration vers IGDB (Phase 1) — Proxy via Supabase Edge Function

import { supabase } from '@/lib/supabase'

export interface ExternalGameSearchResult {
  id: string
  name: string
  coverUrl?: string
  boxArtUrl?: string
  releaseYear?: number
}

export interface ExternalGameDetails {
  id: string
  name: string
  coverUrl?: string
  boxArtUrl?: string
  releaseYear?: number
  isComingSoon?: boolean
  developers: string[]
  genres: string[]
  platforms: string[]
  tags: string[]
  description?: string
}

// =========================================================
// Dictionnaire d'abréviations (conservé pour compatibilité UX)
// =========================================================
const ABBREVIATIONS: Record<string, string> = {
  DDV: 'Disney Dreamlight Valley',
  LOL: 'League of Legends',
  WOW: 'World of Warcraft',
  CSGO: 'Counter-Strike: Global Offensive',
  CS2: 'Counter-Strike 2',
  'CS 2': 'Counter-Strike 2',
  TES: 'The Elder Scrolls',
  ESO: 'The Elder Scrolls Online',
  GOW: 'God of War',
  MGS: 'Metal Gear Solid',
  AC: "Assassin's Creed",
  COD: 'Call of Duty',
  NMS: "No Man's Sky",
  BG3: "Baldur's Gate 3",
  CP2077: 'Cyberpunk 2077',
  TW3: 'The Witcher 3: Wild Hunt',
  NFS: 'Need for Speed',
  DBZ: 'Dragon Ball Z',
  LOTR: 'Lord of the Rings',
  BOTW: 'The Legend of Zelda: Breath of the Wild',
  TOTK: 'The Legend of Zelda: Tears of the Kingdom',
  TLOU: 'The Last of Us',
  TLOU2: 'The Last of Us Part II',
  HZD: 'Horizon Zero Dawn',
  HFW: 'Horizon Forbidden West',
  GOTS: 'Ghost of Tsushima',
  R6: "Tom Clancy's Rainbow Six Siege",
  R6S: "Tom Clancy's Rainbow Six Siege",
  PUBG: 'PUBG: BATTLEGROUNDS',
  POE: 'Path of Exile',
  FO4: 'Fallout 4',
  FNV: 'Fallout: New Vegas',
  ER: 'Elden Ring',
  HK: 'Hollow Knight',
  RDR: 'Red Dead Redemption',
  SM64: 'Super Mario 64',
  SSB: 'Super Smash Bros',
  SSBU: 'Super Smash Bros Ultimate',
}

/**
 * Traduit une requête avec règles regex + dictionnaire d'abréviations
 */
const translateSearchQuery = (query: string): string => {
  let q = query.trim().toUpperCase()
  q = q.replace(/^GT\s*(\d+)$/, 'Gran Turismo $1')
  q = q.replace(/^GTA\s*([A-Z0-9]+)$/, 'Grand Theft Auto $1')
  q = q.replace(/^FF\s*(\d+|[IVX]+)$/, 'Final Fantasy $1')
  q = q.replace(/^RE\s*(\d+|[IVX]+)$/, 'Resident Evil $1')
  q = q.replace(/^RDR\s*(\d+)$/, 'Red Dead Redemption $1')
  q = q.replace(/^DS\s*([123])$/, 'Dark Souls $1')
  q = q.replace(/^DQ\s*(\d+|[IVX]+)$/, 'Dragon Quest $1')
  if (ABBREVIATIONS[q]) return ABBREVIATIONS[q]
  if (q !== query.trim().toUpperCase()) return q
  return query
}

// =========================================================
// Appel générique à la Edge Function igdb-proxy
// =========================================================
async function callIgdbProxy(body: Record<string, any>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('igdb-proxy', {
    body,
  })

  if (error) {
    console.error('[IGDB] Erreur Edge Function:', error.message || error)
    throw new Error(error.message || 'Erreur lors de la communication avec le proxy IGDB')
  }

  return data
}

const searchCache = new Map<string, ExternalGameSearchResult[]>()

/**
 * Recherche des jeux sur IGDB via la Edge Function Supabase
 * Remplace l'ancienne implémentation Steam
 */
export const searchExternalGames = async (query: string): Promise<ExternalGameSearchResult[]> => {
  if (!query?.trim()) return []

  const searchQuery = translateSearchQuery(query)

  if (searchCache.has(searchQuery)) {
    return searchCache.get(searchQuery) as ExternalGameSearchResult[]
  }

  try {
    const results = await callIgdbProxy({ action: 'search', query: searchQuery })

    if (!Array.isArray(results)) {
      console.error('[IGDB] Réponse inattendue de search:', results)
      return []
    }

    const searchResults = results as ExternalGameSearchResult[]
    searchCache.set(searchQuery, searchResults)
    return searchResults
  } catch (error) {
    console.error('[IGDB] Erreur lors de la recherche:', error)
    return []
  }
}

const detailsCache = new Map<string, ExternalGameDetails>()

/**
 * Récupère les détails complets d'un jeu sur IGDB via la Edge Function
 * Remplace l'ancienne implémentation Steam
 * @param igdbId - L'ID numérique IGDB du jeu (provenant de searchExternalGames)
 */
export const getExternalGameDetails = async (
  igdbId: string
): Promise<ExternalGameDetails | null> => {
  if (!igdbId) return null

  if (detailsCache.has(igdbId)) {
    return detailsCache.get(igdbId) as ExternalGameDetails
  }

  try {
    const result = await callIgdbProxy({ action: 'details', igdbId: Number(igdbId) })

    if (!result || typeof result !== 'object') {
      console.error('[IGDB] Réponse inattendue de details:', result)
      return null
    }

    const details = result as ExternalGameDetails
    detailsCache.set(igdbId, details)
    return details
  } catch (error: any) {
    console.error('[IGDB] Erreur lors de la récupération des détails:', error)
    return null
  }
}
