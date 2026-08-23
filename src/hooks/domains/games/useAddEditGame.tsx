import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { SECTIONS } from '@/config/constants'
import { useApiGame } from '@/hooks/api/useApiGame'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { useFormValidation } from '@/hooks/ui/useFormValidation'
import { useScrollSpy } from '@/hooks/ui/useScrollSpy'
import { triggerAchievementCheck } from '@/services/achievementService'
import { incrementStoredUserMetric } from '@/utils/userStorage'
import { validateGameForm } from '@/utils/validators/gameValidators'

import { useTagsManager } from './useTagsManager'
import { buildGamePayload, formatPreviewImage, getInitialFormData } from './utils/gameFormHelpers'
import { useGameMetadata } from './utils/useGameMetadata'

export const useAddEditGame = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { createGame, updateGame } = useApiGame()
  const { getAllMetadata, createMetadata } = useApiMetadata()

  const gameToEdit = location.state?.game
  const isEditMode = !!gameToEdit

  const initialSection = SECTIONS?.length > 0 ? SECTIONS[0].id : 'desc'
  const { activeSection, scrollToSection } = useScrollSpy(initialSection, '.form-section')

  const initialTags = useMemo(
    () => (isEditMode ? gameToEdit?.tags_ids?.map((tag: any) => tag._id || tag) : []),
    [isEditMode, gameToEdit?.tags_ids]
  )

  const tagsMgr = useTagsManager(initialTags)
  const { optionsData, refreshMetadata } = useGameMetadata(getAllMetadata, t)

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [previewImg, setPreviewImg] = useState<string | ArrayBuffer | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState(() => getInitialFormData(null))
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { errors, touched, handleBlur, validateAll } = useFormValidation(validateGameForm, {
    ...formData,
    image: formData.image || previewImg,
  })

  // Synchroniser les tags avec le formulaire via un état dérivé
  const [prevSelectedTags, setPrevSelectedTags] = useState(tagsMgr.selectedTags)
  if (tagsMgr.selectedTags !== prevSelectedTags) {
    setPrevSelectedTags(tagsMgr.selectedTags)
    setFormData((prev: any) => ({ ...prev, tags: tagsMgr.selectedTags }))
  }

  // Charger les tags disponibles et initialiser le formulaire en mode édition
  const setAvailableTags = tagsMgr.setAvailableTags
  useEffect(() => {
    const initForm = async () => {
      try {
        const metas = await getAllMetadata()
        if (metas?.tags) {
          setAvailableTags(metas.tags)
        }
        if (isEditMode && gameToEdit) {
          const initialData = getInitialFormData(gameToEdit)
          setFormData({ ...initialData, tags: initialTags })
          setPreviewImg(formatPreviewImage(gameToEdit.image))
        }
      } catch (_e) {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    initForm()
  }, [isEditMode, gameToEdit, getAllMetadata, initialTags, setAvailableTags])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleFileChange = (e: any) => {
    const file = e.target.files[0]
    setFormData((prev: any) => ({ ...prev, image: file }))
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreviewImg(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreviewImg(null)
    }
  }

  const handleTagKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      tagsMgr.addTag(tagsMgr.tagInput)
    }
  }

  const handleAddNewMetadata = async (type: string) => {
    let title = 'Nouvel élément'
    if (type === 'genre') title = 'Nouveau genre'
    if (type === 'platform') title = 'Nouvelle plateforme'
    if (type === 'status') title = 'Nouveau statut'

    const newName = window.prompt(title + ' :')
    if (!newName || !newName.trim()) return

    try {
      setIsAnimating(true)
      const newItem = await createMetadata(type, { name: newName.trim() })

      // Rafraîchir les métadonnées pour mettre à jour les select
      await refreshMetadata()

      // Auto-sélectionner le nouvel élément
      setFormData((prev: any) => ({ ...prev, [type]: newItem.id || newItem._id }))
    } catch (e: any) {
      console.error(`Erreur lors de l'ajout rapide de ${type}:`, e)
      alert(`Erreur lors de l'ajout: ${e.message || e}`)
    } finally {
      setIsAnimating(false)
    }
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()

    if (!validateAll({ ...formData, image: formData.image || previewImg })) {
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-500, .has-error') as HTMLElement
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (firstError.focus) firstError.focus()
        }
      }, 100)
      return
    }

    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsAnimating(true)

    try {
      const submitData = buildGamePayload(
        formData,
        tagsMgr.selectedTags,
        formData.image // Envoyer uniquement si c'est un File (nouvelle image)
      )

      let createdOrUpdatedGame
      if (isEditMode) {
        const gameIdToUpdate = gameToEdit._id || gameToEdit.id
        createdOrUpdatedGame = await updateGame(gameIdToUpdate, submitData)
      } else {
        createdOrUpdatedGame = await createGame(submitData)
      }

      // Enregistrer les métriques utilisateur
      const hour = new Date().getHours()
      if (hour >= 2 && hour < 5) {
        incrementStoredUserMetric('lateNightActionsCount')
      }

      // Déclencher la vérification des achievements
      setTimeout(() => {
        triggerAchievementCheck()
      }, 500)

      const gameId = createdOrUpdatedGame?._id || gameToEdit?._id

      setTimeout(() => {
        if (gameId) {
          navigate(`/game/${gameId}`, { state: { game: createdOrUpdatedGame } })
        } else {
          console.warn("Impossible de récupérer l'ID du jeu")
          navigate('/list')
        }
      }, 2500)
    } catch (e: any) {
      console.error('Erreur lors de la sauvegarde:', e.response?.data || e.message)
      alert('Erreur lors de la sauvegarde.')
      setIsAnimating(false)
    }
  }

  const handleExternalGameSelected = async (gameDetails: any) => {
    setIsAnimating(true)
    try {
      const updates: any = {
        name: gameDetails.name || formData.name,
        year: gameDetails.releaseYear || formData.year,
        description: gameDetails.description || formData.description,
      }

      if (gameDetails.developers && gameDetails.developers.length > 0) {
        updates.developer = gameDetails.developers.join(', ')
      }

      const fetchImageWithProxy = async (url: string) => {
        let proxyUrl = url
        if (proxyUrl.includes('shared.akamai.steamstatic.com')) {
          proxyUrl = proxyUrl.replace(
            'https://shared.akamai.steamstatic.com',
            '/api/steam-image-shared'
          )
        } else if (proxyUrl.includes('cdn.akamai.steamstatic.com')) {
          proxyUrl = proxyUrl.replace('https://cdn.akamai.steamstatic.com', '/api/steam-image-cdn')
        } else if (proxyUrl.includes('store.akamai.steamstatic.com')) {
          proxyUrl = proxyUrl.replace(
            'https://store.akamai.steamstatic.com',
            '/api/steam-image-store'
          )
        }
        return fetch(proxyUrl + (proxyUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now())
      }

      if (gameDetails.boxArtUrl || gameDetails.coverUrl) {
        try {
          let imageUrlToFetch = gameDetails.boxArtUrl || gameDetails.coverUrl
          let response = await fetchImageWithProxy(imageUrlToFetch)

          // Si la jaquette n'existe pas (404), retomber sur l'image de couverture large
          if (!response.ok && gameDetails.boxArtUrl && gameDetails.coverUrl) {
            imageUrlToFetch = gameDetails.coverUrl
            response = await fetchImageWithProxy(imageUrlToFetch)
          }

          if (!response.ok) throw new Error('Erreur réseau miniature')
          const blob = await response.blob()

          if (!blob.type.startsWith('image/')) {
            throw new Error(
              `Le fichier téléchargé n'est pas une image (type: ${blob.type}). Le proxy Vite nécessite un redémarrage.`
            )
          }

          const file = new File([blob], 'cover.jpg', { type: blob.type })
          updates.image = file
          setPreviewImg(URL.createObjectURL(file))
        } catch (imgError) {
          console.error("Impossible de télécharger l'image:", imgError)
        }
      }

      // Assignation automatique du statut "Wishlist" si le jeu n'est pas encore sorti
      if (gameDetails.isComingSoon && optionsData.status) {
        try {
          const targetStatusName = 'Wishlist'
          const existingStatus = (optionsData.status as any[]).find(
            (s) =>
              (s.label || s.name || s.status_name || '').toLowerCase() ===
              targetStatusName.toLowerCase()
          )
          if (existingStatus) {
            updates.status = existingStatus.value || existingStatus.id || existingStatus._id
          } else {
            const newStatus = await createMetadata('status', { name: targetStatusName })
            await refreshMetadata()
            updates.status = newStatus.id || newStatus._id
          }
        } catch (e) {
          console.error('Erreur statut auto', e)
        }
      }

      // Création auto Genre
      if (gameDetails.genres && gameDetails.genres.length > 0 && optionsData.genre) {
        try {
          const primaryGenre = gameDetails.genres[0]
          const existingGenre = (optionsData.genre as any[]).find(
            (g) =>
              (g.label || g.name || g.genre_name || '').toLowerCase() === primaryGenre.toLowerCase()
          )
          if (existingGenre) {
            updates.genre = existingGenre.value || existingGenre.id || existingGenre._id
          } else {
            const newGenre = await createMetadata('genre', {
              name: primaryGenre.charAt(0).toUpperCase() + primaryGenre.slice(1),
            })
            await refreshMetadata()
            updates.genre = newGenre.id || newGenre._id
          }
        } catch (e) {
          console.error('Erreur genre auto', e)
        }
      }

      // Création auto Plateforme
      if (gameDetails.platforms && gameDetails.platforms.length > 0 && optionsData.platform) {
        try {
          const primaryPlatform = gameDetails.platforms[0]
          const existingPlatform = (optionsData.platform as any[]).find(
            (p) =>
              (p.label || p.name || p.platform_name || '').toLowerCase() ===
              primaryPlatform.toLowerCase()
          )
          if (existingPlatform) {
            updates.platform = existingPlatform.value || existingPlatform.id || existingPlatform._id
          } else {
            const newPlatform = await createMetadata('platform', {
              name: primaryPlatform.charAt(0).toUpperCase() + primaryPlatform.slice(1),
            })
            await refreshMetadata()
            updates.platform = newPlatform.id || newPlatform._id
          }
        } catch (e) {
          console.error('Erreur plateforme auto', e)
        }
      }

      // Ajout auto des Tags (séquentiellement)
      if (gameDetails.tags && gameDetails.tags.length > 0) {
        const collectedTagIds = []
        for (const tag of gameDetails.tags) {
          const tagId = await tagsMgr.addTag(tag)
          if (tagId) collectedTagIds.push(tagId)
        }
        if (collectedTagIds.length > 0) {
          // On s'assure d'écraser la liste des tags dans les données du formulaire
          updates.tags = collectedTagIds
        }
      }

      setFormData((prev: any) => ({ ...prev, ...updates }))
    } catch (error) {
      console.error('Erreur traitement jeu importé', error)
    } finally {
      setIsAnimating(false)
    }
  }

  return {
    t,
    navigate,
    isEditMode,
    gameToEdit,
    activeSection,
    showMobileMenu,
    setShowMobileMenu,
    scrollToSection,
    formData,
    setFormData,
    handleChange,
    handleFileChange,
    handleSubmit,
    confirmSubmit,
    showConfirmModal,
    setShowConfirmModal,
    tagInput: tagsMgr.tagInput,
    setTagInput: tagsMgr.setTagInput,
    suggestedTags: tagsMgr.suggestedTags,
    handleTagKeyDown,
    addTag: tagsMgr.addTag,
    handleRemoveTag: tagsMgr.removeTag,
    previewImg,
    isAnimating,
    isLoading,
    optionsData,
    availableTags: tagsMgr.availableTags,
    handleAddNewMetadata,
    errors,
    touched,
    handleBlur,
    handleExternalGameSelected,
  }
}
