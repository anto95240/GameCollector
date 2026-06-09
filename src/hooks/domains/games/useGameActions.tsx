import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import { useApiGame } from '@/hooks/api/useApiGame'
import { triggerAchievementCheck } from '@/services/achievementService'
import { isWishlistStatusName } from '@/utils/formatters'
import { incrementStoredUserMetric } from '@/utils/userStorage'
export const useGameActions = (game: any, setGame: any, metadata: any) => {
  const navigate = useNavigate()
  const { deleteGame, updateGame } = useApiGame()
  const [isUpdating, setIsUpdating] = useState(false)
  const buildUpdateFormData = useCallback((updatedGame: any, overrides: Record<string, any> = {}) => {
    const formData = new FormData()

    // Champs standards
    formData.append('name', updatedGame.game_name || updatedGame.name || '')
    formData.append('description', updatedGame.description || '')
    formData.append('comment', updatedGame.comment || '')
    formData.append('genre_id', updatedGame.genre_id?._id || updatedGame.genre_id || '')
    formData.append('platform_id', updatedGame.platform_id?._id || updatedGame.platform_id || '')
    formData.append('status_id', updatedGame.status_id?._id || updatedGame.status_id || '')
    formData.append('year', updatedGame.year || '')
    formData.append('playing_time', updatedGame.playing_time || '')
    formData.append('developer', updatedGame.developer || '')
    formData.append('succes', updatedGame.succes || '')
    formData.append('isSoon', updatedGame.isSoon || false)
    formData.append('isFavorite', updatedGame.isFavorite || false)

    // Appliquer les overrides
    Object.keys(overrides).forEach((key: any) => {
      formData.set(key, overrides[key])
    })

    // Image (uniquement si elle existe)
    if (updatedGame.image) {
      formData.append('image', updatedGame.image)
    }

    // Tags
    if (updatedGame.tags_ids && Array.isArray(updatedGame.tags_ids)) {
      updatedGame.tags_ids.forEach((tag: any) => {
        formData.append('tags_ids', tag._id || tag)
      })
    }

    return formData
  }, [])

  const handleToggleFavorite = useCallback(async () => {
    if (!game) return

    const newState = !game.isFavorite
    setGame((prev: any) => ({ ...prev, isFavorite: newState }))

    try {
      const formData = buildUpdateFormData(game, { isFavorite: newState })
      await updateGame(game._id, formData)
      triggerAchievementCheck()
    } catch (e: any) {
      console.error('Erreur lors de la mise en favori', e)
      setGame((prev: any) => ({ ...prev, isFavorite: !newState }))
    }
  }, [game, setGame, buildUpdateFormData, updateGame])

  const handleDelete = useCallback(async () => {
    if (game && window.confirm('Supprimer ce jeu ?')) {
      try {
        await deleteGame(game._id)
        incrementStoredUserMetric('deletedGamesCount')
        triggerAchievementCheck()
        navigate('/list')
      } catch (e: any) {
        console.error('Erreur lors de la suppression', e)
      }
    }
  }, [game, deleteGame, navigate])

  const handleToggleSoon = useCallback(async () => {
    if (!game) return

    const newSoonState = !game.isSoon
    setGame((prev: any) => ({ ...prev, isSoon: newSoonState }))
    setIsUpdating(true)

    try {
      const formData = buildUpdateFormData(game, { isSoon: newSoonState })
      await updateGame(game._id, formData)
      triggerAchievementCheck()
    } catch (e: any) {
      console.error('Erreur lors du basculement wishlist', e)
      setGame((prev: any) => ({ ...prev, isSoon: !newSoonState }))
    } finally {
      setIsUpdating(false)
    }
  }, [game, setGame, buildUpdateFormData, updateGame])

  const handleUpdateGameField = useCallback(
    async (fieldName: any, fieldValue: any) => {
      if (!game) return

      setIsUpdating(true)
      const previousValue = game[fieldName]

      try {
        let overrides: Record<string, any> = {}

        // Logique spéciale pour le statut
        if (fieldName === 'status_id') {
          const statusName =
            metadata.statuses?.find((s: any) => s._id === fieldValue)?.status_name || 'Inconnu'
          const isWishlistStatus = isWishlistStatusName(statusName)

          overrides = {
            status_id: fieldValue,
            isSoon: isWishlistStatus,
          }

          setGame((prev: any) => ({
            ...prev,
            status_id: fieldValue,
            status: statusName,
            isSoon: isWishlistStatus,
          }))
        } else if (fieldName === 'note') {
          overrides = { note: Number(fieldValue) }
          setGame((prev: any) => ({
            ...prev,
            note: fieldValue,
          }))
        } else {
          overrides = { [fieldName]: fieldValue }
          setGame((prev: any) => ({
            ...prev,
            [fieldName]: fieldValue,
          }))
        }

        const formData = buildUpdateFormData(game, overrides)
        await updateGame(game._id, formData)
        triggerAchievementCheck()
      } catch (e: any) {
        console.error('Erreur lors de la mise à jour:', e)
        // Revert à la valeur précédente en cas d'erreur
        setGame((prev: any) => ({
          ...prev,
          [fieldName]: previousValue,
        }))
      } finally {
        setIsUpdating(false)
      }
    },
    [game, setGame, metadata.statuses, buildUpdateFormData, updateGame]
  )

  return {
    isUpdating,
    handleToggleFavorite,
    handleDelete,
    handleToggleSoon,
    handleUpdateGameField,
  }
}
