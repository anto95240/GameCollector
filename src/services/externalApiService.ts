// src/services/externalApiService.ts

export interface ExternalGameSearchResult {
  id: string
  name: string
  coverUrl?: string
  boxArtUrl?: string
  releaseYear?: number
}

// Dictionnaire de traduction des tags Steam
const TAG_TRANSLATIONS: Record<string, string> = {
  'Story Rich': 'Histoire riche',
  'Great Soundtrack': 'Excellente bande-son',
  'First-Person': 'Première personne',
  'Third Person': 'Troisième personne',
  'Sci-fi': 'Science-fiction',
  'Turn-Based': 'Tour par tour',
  'Local Multiplayer': 'Multijoueur local',
  'Local Co-Op': 'Coopération locale',
  'Online Co-Op': 'Coopération en ligne',
  'Family Friendly': 'Familial',
  Management: 'Gestion',
  Building: 'Construction',
  'Base Building': 'Construction de base',
  'Character Customization': 'Personnalisation',
  'Football (Soccer)': 'Football',
  'Life Sim': 'Simulation de vie',
  'Farming Sim': 'Simulation agricole',
  Cute: 'Mignon',
  Funny: 'Drôle',
  Difficult: 'Difficile',
  Stealth: 'Infiltration',
  'Card Game': 'Jeu de cartes',
  'Board Game': 'Jeu de plateau',
  Action: 'Action',
  Adventure: 'Aventure',
  Sports: 'Sport',
  Racing: 'Course',
  Fighting: 'Combat',
  Puzzle: 'Réflexion',
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

const STEAM_PROXY = '/api/steam'

// Dictionnaire statique étendu
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
 * Traduit une requête de recherche avec des règles Regex pour gérer les numéros (ex: GT 7, FF 15, RE 4)
 * et un dictionnaire statique
 */
const translateSearchQuery = (query: string): string => {
  let q = query.trim().toUpperCase()

  // Règles Regex pour les séries avec numéros
  // ex: GT 7, GT7 -> Gran Turismo 7
  q = q.replace(/^GT\s*(\d+)$/, 'Gran Turismo $1')
  // ex: GTA V, GTA 5, GTA5 -> Grand Theft Auto V
  q = q.replace(/^GTA\s*([A-Z0-9]+)$/, 'Grand Theft Auto $1')
  // ex: FF 15, FF15, FF VII -> Final Fantasy 15
  q = q.replace(/^FF\s*(\d+|[IVX]+)$/, 'Final Fantasy $1')
  // ex: RE 4, RE4, RE VIII -> Resident Evil 4
  q = q.replace(/^RE\s*(\d+|[IVX]+)$/, 'Resident Evil $1')
  // ex: RDR 2, RDR2 -> Red Dead Redemption 2
  q = q.replace(/^RDR\s*(\d+)$/, 'Red Dead Redemption $1')
  // ex: DS 3, DS3 -> Dark Souls 3 (Attention: DS peut être Nintendo DS ou Dead Space, mais Dark Souls est le plus commun)
  q = q.replace(/^DS\s*([123])$/, 'Dark Souls $1')
  // ex: DQ 11, DQ11 -> Dragon Quest 11
  q = q.replace(/^DQ\s*(\d+|[IVX]+)$/, 'Dragon Quest $1')

  // Si c'est dans le dictionnaire statique
  if (ABBREVIATIONS[q]) {
    return ABBREVIATIONS[q]
  }

  // Sinon, retourner la requête modifiée par regex ou originale
  // On repasse en minuscule/capitalisé normal si on l'a modifiée via regex
  if (q !== query.trim().toUpperCase()) return q

  return query
}

/**
 * Recherche des jeux sur Steam via le proxy local (Vite/Vercel)
 */
export const searchExternalGames = async (query: string): Promise<ExternalGameSearchResult[]> => {
  if (!query) return []

  const searchQuery = translateSearchQuery(query)

  try {
    const steamUrl = `${STEAM_PROXY}/api/storesearch/?term=${encodeURIComponent(searchQuery)}&l=french&cc=FR`
    const response = await fetch(steamUrl)
    const steamData = await response.json()

    const excludedKeywords = [
      'dlc',
      'soundtrack',
      'artbook',
      'season pass',
      'expansion',
      'edition',
      'édition',
      'deluxe',
      'ultimate',
      'premium',
      'goty',
      'game of the year',
      'bundle',
      'pack',
      'bonus',
      'upgrade',
      'gold',
      'silver',
      'collector',
      'definitive',
    ]
    const hasColon = query.includes(':')
    const hasDash = query.includes('-')

    return steamData.items
      .filter((item: any) => {
        const lowerName = item.name.toLowerCase()
        if (excludedKeywords.some((keyword) => lowerName.includes(keyword))) return false

        // Filtre agressif: si l'utilisateur ne cherche pas avec un ':' ou '-', on exclut les résultats qui en ont un
        // (La plupart des DLCs Steam s'appellent "Jeu de base : Nom du DLC" ou "Jeu de base - Nom du DLC")
        if (!hasColon && item.name.includes(': ')) return false
        if (!hasDash && item.name.includes(' - ')) return false

        return true
      })
      .map((item: any) => {
        // Extraire l'année du nom ou d'ailleurs n'est pas fourni directement dans `storesearch`,
        // mais on peut le faire plus tard avec `appdetails`
        return {
          id: item.id.toString(),
          name: item.name,
          coverUrl: item.tiny_image || item.small_capsule_image, // Miniature
          boxArtUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900_2x.jpg`,
          releaseYear: item.released,
        }
      })
  } catch (error) {
    console.error('Erreur lors de la recherche Steam:', error)
    return []
  }
}

/**
 * Récupère les détails complets d'un jeu sur Steam via le proxy local
 */
export const getExternalGameDetails = async (
  appId: string
): Promise<ExternalGameDetails | null> => {
  if (!appId) return null

  try {
    const steamUrl = `${STEAM_PROXY}/api/appdetails?appids=${appId}&l=french`
    const response = await fetch(steamUrl)
    const steamData = await response.json()

    const gameInfo = steamData[appId]?.data
    if (!gameInfo) {
      if (steamData[appId]?.success === false) {
        alert(
          'Attention : Steam a refusé la récupération des détails complets (succès: false). Cela arrive souvent si Steam limite votre adresse IP (Trop de requêtes rapides).'
        )
      } else {
        alert("Attention : Aucune donnée détaillée n'a été renvoyée par Steam.")
      }
      return null
    }

    // Parse date for year
    let releaseYear: number | undefined
    const isComingSoon = gameInfo.release_date?.coming_soon || false
    if (gameInfo.release_date?.date) {
      const parsedDate = new Date(gameInfo.release_date.date)
      if (!isNaN(parsedDate.getTime())) {
        releaseYear = parsedDate.getFullYear()
      } else {
        // Fallback for string like "10 Dec, 2020" or similar
        const yearMatch = gameInfo.release_date.date.match(/\d{4}/)
        if (yearMatch) {
          releaseYear = parseInt(yearMatch[0], 10)
        }
      }
    }

    const developers = gameInfo.developers || []

    // Steam genres
    const genres = gameInfo.genres?.map((g: any) => g.description) || []
    const preferredGenres = ['RPG', 'Simulation', 'Adventure', 'Aventure']
    const finalGenres = genres.sort((a: string, b: string) => {
      const aPref = preferredGenres.some((p) => a.toLowerCase().includes(p.toLowerCase())) ? 1 : 0
      const bPref = preferredGenres.some((p) => b.toLowerCase().includes(p.toLowerCase())) ? 1 : 0
      return bPref - aPref
    })

    // Steam platforms (Windows, Mac, Linux)
    const platforms = []
    if (gameInfo.platforms) {
      if (gameInfo.platforms.windows) platforms.push('PC')
      if (gameInfo.platforms.mac) platforms.push('Mac')
      if (gameInfo.platforms.linux) platforms.push('Linux')
    }

    let tags: string[] = []
    try {
      const spyResponse = await fetch(`/api/steamspy/api.php?request=appdetails&appid=${appId}`)
      const spyData = await spyResponse.json()
      if (spyData && spyData.tags) {
        tags = Object.keys(spyData.tags)
          .slice(0, 10)
          .map((tag) => TAG_TRANSLATIONS[tag] || tag)
      }

      // Si SteamSpy ne renvoie pas de tags (ex: jeu pas encore sorti), on fabrique des tags de secours
      if (!tags || tags.length === 0) {
        const fallbackTags = new Set<string>()

        // 1. Ajouter les genres comme tags
        if (gameInfo.genres) {
          gameInfo.genres.forEach((g: any) => fallbackTags.add(g.description))
        }

        // 2. Ajouter les catégories clés comme tags
        const categoryToTag: Record<number, string> = {
          2: 'Singleplayer',
          1: 'Multiplayer',
          9: 'Co-op',
          38: 'Online Co-Op',
          24: 'Local Co-Op',
          36: 'Online Multiplayer',
          37: 'Local Multiplayer',
        }
        if (gameInfo.categories) {
          gameInfo.categories.forEach((c: any) => {
            if (categoryToTag[c.id]) fallbackTags.add(categoryToTag[c.id])
          })
        }

        tags = Array.from(fallbackTags)
          .slice(0, 10)
          .map((tag) => TAG_TRANSLATIONS[tag] || tag)
      }
    } catch (e) {
      // Ignorer
    }

    return {
      id: appId,
      name: gameInfo.name,
      coverUrl: gameInfo.header_image || gameInfo.capsule_image,
      boxArtUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
      releaseYear,
      isComingSoon,
      developers,
      genres: finalGenres,
      platforms,
      tags,
      description: gameInfo.short_description || gameInfo.about_the_game || '',
    }
  } catch (error: any) {
    console.error('Erreur lors de la récupération des détails Steam:', error)
    alert(`Erreur technique lors de la communication avec Steam: ${error.message}`)
    return null
  }
}
