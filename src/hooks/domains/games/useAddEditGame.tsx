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
  const { getAllMetadata } = useApiMetadata()

  const gameToEdit = location.state?.game
  const isEditMode = !!gameToEdit

  const initialSection = SECTIONS?.length > 0 ? SECTIONS[0].id : 'desc'
  const { activeSection, scrollToSection } = useScrollSpy(initialSection, '.form-section')

  const initialTags = useMemo(
    () => (isEditMode ? gameToEdit?.tags_ids?.map((tag: any) => tag._id || tag) : []),
    [isEditMode, gameToEdit?.tags_ids]
  )

  const tagsMgr = useTagsManager(initialTags)
  const { optionsData } = useGameMetadata(getAllMetadata, t)

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

  const handleAddNewMetadata = (type: string) => {
    alert("Fonctionnalité d'ajout rapide de " + type + ' à implémenter.')
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
        createdOrUpdatedGame = await updateGame(gameToEdit._id, submitData)
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
  }
}
