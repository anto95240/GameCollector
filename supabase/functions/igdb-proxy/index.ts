// supabase/functions/igdb-proxy/index.ts
// Deno Edge Function - Proxy pour l'API IGDB (Twitch)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getTwitchToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.value
  }
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error(
      'TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET doivent etre configures dans les secrets Supabase'
    )
  }
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Erreur Twitch OAuth: ${response.status} - ${errText}`)
  }
  const data = await response.json()
  cachedToken = { value: data.access_token, expiresAt: now + data.expires_in * 1000 }
  return cachedToken.value
}

async function igdbRequest(endpoint: string, body: string): Promise<any[]> {
  const token = await getTwitchToken()
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')!
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Erreur IGDB ${endpoint}: ${response.status} - ${errText}`)
  }
  return response.json()
}

function buildCoverUrl(imageId: string | undefined, size = 't_cover_big'): string | undefined {
  if (!imageId) return undefined
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`
}

async function searchGames(query: string) {
  if (!query?.trim()) return []
  const esc = query.replace(/"/g, '\\"')
  const results = await igdbRequest(
    'games',
    `search "${esc}"; fields name, cover.image_id, first_release_date, category, parent_game, version_parent; limit 35;`
  )

  // Filtrage strict : que les jeux de base (category 0)
  // On exclut les DLC/extensions (parent_game) et les éditions alternatives (version_parent)
  const filtered = results.filter((game: any) => {
    const cat = game.category === undefined ? 0 : game.category
    return cat === 0 && !game.parent_game && !game.version_parent
  })

  return filtered.slice(0, 15).map((game: any) => ({
    id: String(game.id),
    name: game.name,
    coverUrl: buildCoverUrl(game.cover?.image_id, 't_thumb'),
    boxArtUrl: buildCoverUrl(game.cover?.image_id, 't_cover_big'),
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getFullYear()
      : undefined,
  }))
}

async function getGameDetails(igdbId: number) {
  const results = await igdbRequest(
    'games',
    `fields name, cover.image_id, first_release_date, status, involved_companies.company.name, involved_companies.developer, genres.name, platforms.name, themes.name, summary, storyline; where id = ${igdbId}; limit 1;`
  )
  if (!results || results.length === 0) return null
  const game: any = results[0]
  const now = Date.now() / 1000
  const developers: string[] = (game.involved_companies || [])
    .filter((ic: any) => ic.developer)
    .map((ic: any) => ic.company?.name)
    .filter(Boolean)
  const genres: string[] = (game.genres || []).map((g: any) => g.name).filter(Boolean)
  const platforms: string[] = (game.platforms || [])
    .map((p: any) => p.name)
    .filter(Boolean)
    .slice(0, 5)
  const tags: string[] = (game.themes || []).map((th: any) => th.name).filter(Boolean)
  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : undefined
  const isComingSoon = game.first_release_date ? game.first_release_date > now : false
  return {
    id: String(game.id),
    name: game.name,
    coverUrl: buildCoverUrl(game.cover?.image_id, 't_thumb'),
    boxArtUrl: buildCoverUrl(game.cover?.image_id, 't_cover_big'),
    releaseYear,
    isComingSoon,
    developers,
    genres,
    platforms,
    tags,
    description: game.summary || game.storyline || '',
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Methode non autorisee' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  try {
    const body = await req.json()
    const { action, query, igdbId } = body
    let result: any
    if (action === 'search') {
      if (!query)
        return new Response(JSON.stringify({ error: 'query requis' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      result = await searchGames(String(query))
    } else if (action === 'details') {
      if (!igdbId)
        return new Response(JSON.stringify({ error: 'igdbId requis' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      result = await getGameDetails(Number(igdbId))
    } else {
      return new Response(JSON.stringify({ error: `Action inconnue: ${action}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err: any) {
    console.error('[igdb-proxy] Erreur:', err.message)
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
