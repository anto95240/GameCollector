import './CategoryForm.css'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/context'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { triggerAchievementCheck } from '@/services/achievementService'
import { incrementStoredUserMetric } from '@/utils/userStorage'
import { getFirstValidationError, validateCategory } from '@/utils/validators'

const nameKeyMap = {
  genre: 'genre_name',
  platform: 'platform_name',
  tag: 'tag_name',
  status: 'status_name',
}

const CategoryForm = ({ categoryType, isOpen, onClose, isEdit, initialData, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    order: '',
    color: '#ffffff',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const { showSuccess, showError, showCreated, showUpdated } = useToast()

  const { createMetadata, updateMetadata } = useApiMetadata()

  useEffect(() => {
    if (isEdit && initialData) {
      // Lecture dynamique du nom pour l'édition
      const itemName =
        initialData.name ||
        initialData.label ||
        initialData.genre_name ||
        initialData.platform_name ||
        initialData.tag_name ||
        initialData.status_name ||
        (typeof initialData === 'string' ? initialData : '')

      setFormData({
        name: itemName,
        brand: initialData.brand || '',
        order: initialData.order || '',
        color: initialData.color || '#ffffff',
      })
    } else {
      setFormData({ name: '', brand: '', order: '', color: '#ffffff' })
    }
  }, [isEdit, initialData, categoryType])

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const getFormTitle = () => {
    const action = isEdit ? t('categories.editTitle') : t('categories.addTitle')
    const suffix =
      {
        genre: t('categories.titleGenre'),
        platform: t('categories.titlePlatform'),
        tag: t('categories.titleTag'),
        status: t('categories.titleStatus'),
      }[categoryType as keyof typeof nameKeyMap] || ''
    return `${action} ${suffix}`
  }

  const getCategoryLabel = (categoryType: keyof typeof nameKeyMap) => {
    const labels = {
      genre: t('categories.titleGenre') || 'Genre',
      platform: t('categories.titlePlatform') || 'Plateforme',
      tag: t('categories.titleTag') || 'Tag',
      status: t('categories.titleStatus') || 'Statut',
    }
    return labels[categoryType] || 'Catégorie'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation du formulaire
    const validationErrors = validateCategory(formData.name)
    const firstError = getFirstValidationError(validationErrors)
    if (firstError) {
      showError(firstError)
      return
    }

    setIsSubmitting(true)
    try {
      // Construction du payload avec les clés exactes attendues par Mongoose
      const payload: any = { color: formData.color }

      switch (categoryType) {
        case 'genre':
          payload.genre_name = formData.name
          break
        case 'platform':
          payload.platform_name = formData.name
          payload.brand = formData.brand
          break
        case 'tag':
          payload.tag_name = formData.name
          payload.order = Number(formData.order) || 0
          break
        case 'status':
          payload.status_name = formData.name
          break
        default:
          payload.name = formData.name
      }

      if (isEdit) {
        const id = initialData._id || initialData.id
        const nameField = nameKeyMap[categoryType as keyof typeof nameKeyMap]
        await updateMetadata(categoryType, id, payload)

        incrementStoredUserMetric('updatedCategoriesCount')

        const categoryLabel = getCategoryLabel(categoryType as keyof typeof nameKeyMap)
        showUpdated(`${categoryLabel}: "${formData.name}"`)
      } else {
        await createMetadata(categoryType, payload)

        incrementStoredUserMetric('customCategoriesCreated')

        const categoryLabel = getCategoryLabel(categoryType as keyof typeof nameKeyMap)
        showCreated(`${categoryLabel}: "${formData.name}"`)
      }

      triggerAchievementCheck()

      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement :", error)
      showError(t('common.savingError') || 'Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`manager-form-container ${isOpen ? 'open' : 'closed'}`}>
      <div className="manager-form-wrapper">
        <p className="form-title-inner">{getFormTitle()}</p>

        <form className="form-fields" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('categories.fields.name')}</label>
            <input
              ref={nameInputRef}
              type="text"
              className="form-input category"
              value={formData.name}
              onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          {categoryType === 'tag' && (
            <div className="form-group">
              <label>{t('categories.fields.order')}</label>
              <input
                type="number"
                className="form-input category"
                value={formData.order}
                onChange={(e: any) => setFormData({ ...formData, order: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          )}

          {categoryType === 'platform' && (
            <div className="form-group">
              <label>{t('categories.fields.brand')}</label>
              <input
                type="text"
                className="form-input category"
                value={formData.brand}
                onChange={(e: any) => setFormData({ ...formData, brand: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('categories.fields.color')}</label>
            <input
              type="color"
              className="color-picker-square"
              value={formData.color}
              onChange={(e: any) => setFormData({ ...formData, color: e.target.value })}
              disabled={isSubmitting}
            />
            <div className="flex-1"></div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel-category"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-addEdit-category" disabled={isSubmitting}>
              {isSubmitting
                ? 'Enregistrement...'
                : isEdit
                  ? t('categories.edit')
                  : t('categories.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryForm
