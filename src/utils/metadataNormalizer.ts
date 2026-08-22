// src/utils/metadataNormalizer.ts

/**
 * Dictionnaire de normalisation pour éviter les doublons de plateformes, genres, tags.
 * La clé (en minuscules) est une variation possible, la valeur est le nom officiel à utiliser en base.
 */
export const METADATA_DICTIONARY: Record<string, string> = {
  // Plateformes
  'playstation 5': 'PS5',
  'playstation 4': 'PS4',
  'playstation 3': 'PS3',
  'playstation 2': 'PS2',
  playstation: 'PS1',
  'nintendo switch': 'Switch',
  'pc (microsoft windows)': 'PC',
  pc: 'PC',
  mac: 'Mac',
  linux: 'Linux',
  'xbox series x': 'Xbox Series',
  'xbox series s': 'Xbox Series',
  'xbox series x/s': 'Xbox Series',
  'xbox one': 'Xbox One',
  'xbox 360': 'Xbox 360',
  xbox: 'Xbox',

  // Genres
  'action-adventure': 'Action-Aventure',
  'action rpg': 'Action-RPG',
  'role-playing (rpg)': 'RPG',
  'role-playing': 'RPG',
  shooter: 'Tir',
  'first-person shooter': 'FPS',
  'third-person shooter': 'TPS',
  puzzle: 'Réflexion',
  "hack and slash/beat 'em up": 'Hack & Slash',
  fighting: 'Combat',
  racing: 'Course',
  sports: 'Sport',
  strategy: 'Stratégie',

  // Tags (Exemples fréquents)
  singleplayer: 'Solo',
  multiplayer: 'Multijoueur',
  'co-op': 'Coopération',
  'open world': 'Monde Ouvert',
}

/**
 * Normalise un nom de métadonnée en utilisant le dictionnaire.
 * Si aucune correspondance n'est trouvée, retourne le nom original avec une majuscule initiale.
 * @param name Le nom original (ex: "PlayStation 5")
 * @returns Le nom normalisé (ex: "PS5")
 */
export const normalizeMetadataName = (name: string): string => {
  if (!name) return ''

  const lowerName = name.trim().toLowerCase()

  // Cherche dans le dictionnaire
  if (METADATA_DICTIONARY[lowerName]) {
    return METADATA_DICTIONARY[lowerName]
  }

  // Comportement par défaut : Première lettre en majuscule, le reste tel quel
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Vérifie si une métadonnée existe déjà dans une liste (en ignorant la casse et les espaces).
 * Utile pour chercher si "PS5" existe déjà dans le tableau des plateformes reçues de Supabase.
 */
export const findExistingMetadata = (
  normalizedName: string,
  existingList: Array<{
    _id?: string
    id?: string
    name?: string
    genre_name?: string
    platform_name?: string
    tag_name?: string
    label?: string
    value?: string
  }>
) => {
  const target = normalizedName.toLowerCase()
  return existingList.find((item) => {
    const itemName = (
      item.label ||
      item.name ||
      item.genre_name ||
      item.platform_name ||
      item.tag_name ||
      ''
    ).toLowerCase()
    return itemName === target
  })
}
