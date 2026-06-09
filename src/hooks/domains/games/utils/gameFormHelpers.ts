import { formatImageUrl } from '@/utils/formatters/imageFormatters'

interface GameToEdit {
  name?: string
  description?: string
  note?: string | number
  comment?: string
  genre_id?: { _id: string } | string
  platform_id?: { _id: string } | string
  status_id?: { _id: string } | string
  year?: string | number
  playing_time?: string | number
  developer?: string
  succes?: string | number
  isSoon?: boolean
  isFavorite?: boolean
  [key: string]: unknown
}

interface GameFormData {
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

export const getInitialFormData = (gameToEdit: GameToEdit | null = null): GameFormData => {
  if (!gameToEdit) {
    return {
      name: '',
      description: '',
      rating: '',
      comment: '',
      genre: '',
      platform: '',
      year: '',
      playTime: '',
      developer: '',
      achievements: '',
      status: '',
      isSoon: false,
      isFavorite: false,
      image: null,
      tags: [],
    }
  }

  return {
    name: gameToEdit.name || '',
    description: gameToEdit.description || '',
    rating: gameToEdit.note || '',
    comment: gameToEdit.comment || '',
    genre: (
      typeof gameToEdit.genre_id === 'object'
        ? (gameToEdit.genre_id?._id ?? '')
        : (gameToEdit.genre_id as string) ?? ''
    ),
    platform: (
      typeof gameToEdit.platform_id === 'object'
        ? (gameToEdit.platform_id?._id ?? '')
        : (gameToEdit.platform_id as string) ?? ''
    ),
    status: (
      typeof gameToEdit.status_id === 'object'
        ? (gameToEdit.status_id?._id ?? '')
        : (gameToEdit.status_id as string) ?? ''
    ),
    year: gameToEdit.year || '',
    playTime: gameToEdit.playing_time || '',
    developer: gameToEdit.developer || '',
    achievements: gameToEdit.succes || '',
    isSoon: gameToEdit.isSoon || false,
    isFavorite: gameToEdit.isFavorite || false,
    image: null,
    tags: [],
  }
}

export const buildGamePayload = (
  formData: GameFormData,
  selectedTags: string[],
  image: File | null = null,
  existingImage: string | null = null
): FormData => {
  const submitData = new FormData()

  // Mapper les champs correctement
  if (formData.name) submitData.append('name', formData.name)
  if (formData.description) submitData.append('description', formData.description)
  if (formData.rating) submitData.append('note', String(Number(formData.rating)))
  if (formData.comment) submitData.append('comment', formData.comment)
  if (formData.genre) submitData.append('genre_id', formData.genre)
  if (formData.platform) submitData.append('platform_id', formData.platform)
  if (formData.status) submitData.append('status_id', formData.status)
  if (formData.year) submitData.append('year', String(Number(formData.year)))
  if (formData.playTime) submitData.append('playing_time', String(Number(formData.playTime)))
  if (formData.developer) submitData.append('developer', formData.developer)
  if (formData.achievements) submitData.append('succes', String(formData.achievements))
  if (formData.isSoon !== undefined) submitData.append('isSoon', String(formData.isSoon))
  if (formData.isFavorite !== undefined) submitData.append('isFavorite', String(formData.isFavorite))

  // Gestion de l'image - IMPORTANT: Envoyer UNIQUEMENT les fichiers File, jamais les strings
  if (image instanceof File) {
    submitData.append('image', image)
  }
  // SINON (mode édition sans changement d'image), NE PAS envoyer le champ image
  // Le backend gardera l'ancienne image

  // Ajouter les tags
  selectedTags?.forEach((id: any) => submitData.append('tags_ids', id))

  return submitData
}

export const formatPreviewImage = (imageUrl: string, apiUrl: string): string | null => {
  return formatImageUrl(imageUrl, apiUrl)
}
