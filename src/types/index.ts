// ─── Entités métier ───────────────────────────────────────────────────────────

export interface Game {
  _id: string
  id: string
  name: string
  description?: string
  cover?: string
  note?: number | string
  comment?: string
  genre?: string
  genre_id?: string | { _id: string; genre_name?: string }
  platform?: string
  platform_id?: string | { _id: string; platform_name?: string }
  status?: string
  status_id?: string | { _id: string; status_name?: string }
  year?: string | number
  playing_time?: string | number
  developer?: string
  succes?: string | number
  isSoon?: boolean
  isFavorite?: boolean
  tags?: string[]
  image?: string
  [key: string]: unknown
}

export interface User {
  _id: string
  username: string
  email: string
  [key: string]: unknown
}

// ─── Formulaire jeu ───────────────────────────────────────────────────────────

export interface GameFormData {
  name: string
  description: string
  rating: string | number
  comment: string
  genre: string
  platform: string
  status: string
  year: string | number
  playTime: string | number
  developer: string
  achievements: string | number
  isSoon: boolean
  isFavorite: boolean
  image: File | null
  tags: string[]
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

export interface FilterCategory {
  id: string
  label: string
  options: string[]
  type?: 'range' | 'sort' | 'checkbox'
  min?: number
  max?: number
}

export interface SavedFilter {
  id: string
  name: string
  description?: string
  filters: string[]
  source: 'local' | 'server'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// ─── Métadonnées ──────────────────────────────────────────────────────────────

export interface Genre {
  _id: string
  genre_name: string
  color?: string
}

export interface Platform {
  _id: string
  platform_name: string
  brand?: string
  color?: string
}

export interface Status {
  _id: string
  status_name: string
  color?: string
}

export interface Tag {
  _id: string
  tag_name: string
  order?: number
  color?: string
}

// ─── Trophées ─────────────────────────────────────────────────────────────────

export type TrophyRarity = 'bronze' | 'argent' | 'or' | 'platine'

export interface Achievement {
  _id?: string
  id_name: string
  title: string
  description?: string
  icon?: string
  rarity: TrophyRarity
  isHidden?: boolean
  tags?: string[]
  createdAt?: string
}

