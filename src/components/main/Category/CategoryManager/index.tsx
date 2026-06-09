import './CategoryManager.css'

import { faExclamationTriangle, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect, useRef, useState } from 'react'

import CategoryForm from '@/components/secondary/Category/CategoryForm'
import CategoryList from '@/components/secondary/Category/CategoryListe'
import { useApiMetadata } from '@/hooks/api/useApiMetadata'
import { useEscapeKeyCloser } from '@/hooks/ui/useEscapeKeyCloser'

const CategoryManager = ({ categoryType }: { categoryType: string }) => {
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  const [listItems, setListItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)

  const { getMetadataByType, deleteMetadata } = useApiMetadata()

  // Fermer le modal de suppression avec Escape
  useEscapeKeyCloser(() => setShowDeleteModal(false), showDeleteModal)

  const fetchCategories = useCallback(async () => {
    if (!categoryType) return
    setIsLoading(true)
    try {
      const data = await getMetadataByType(categoryType)
      setListItems(data || [])
    } catch (error: any) {
      console.error(`Erreur lors du chargement de ${categoryType}:`, error)
      setListItems([])
    } finally {
      setIsLoading(false)
    }
  }, [categoryType, getMetadataByType])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    if (showForm && formRef.current && isMobile) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }, 300)
    }
  }, [showForm])

  const getCategoryLabel = () => {
    const labels: Record<string, string> = {
      genre: 'Genre',
      platform: 'Plateforme',
      tag: 'Tag',
      status: 'Status',
    }
    return labels[categoryType] || 'Catégorie'
  }

  const handleAddClick = () => {
    if (showForm) {
      setShowForm(false)
      setEditMode(false)
      setItemToEdit(null)
    } else {
      setEditMode(false)
      setItemToEdit(null)
      setShowForm(true)
    }
  }

  const handleEdit = (item: any) => {
    setEditMode(true)
    setItemToEdit(item)
    setShowForm(true)
  }

  const handleDeleteRequest = (item: any) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    try {
      await deleteMetadata(categoryType, itemToDelete._id || itemToDelete.id)
      setShowDeleteModal(false)
      setItemToDelete(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Erreur de suppression:', error)
    }
  }

  const handleSuccess = () => {
    fetchCategories()
    setShowForm(false)
  }

  return (
    <div className="manager-container">
      <div className="manager-header">
        <span className="manager-title">{getCategoryLabel()}</span>
        <button
          className={`add-icon-btn ${showForm ? 'active' : ''}`}
          onClick={handleAddClick}
          title={showForm ? 'Fermer' : 'Ajouter'}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      <div className="manager-content">
        {isLoading ? (
          <p className="loading-text" style={{ padding: '2rem', textAlign: 'center' }}>
            Chargement en cours...
          </p>
        ) : (
          <CategoryList
            items={listItems}
            isCompact={showForm}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        )}

        <div ref={formRef} className={`form-collapsible ${showForm ? 'open' : ''}`}>
          <div className="form-inner">
            <CategoryForm
              categoryType={categoryType}
              isOpen={true}
              onClose={() => {
                setShowForm(false)
                setEditMode(false)
                setItemToEdit(null)
              }}
              isEdit={editMode}
              initialData={itemToEdit}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()}>
            <div className="modal-header-danger">
              <FontAwesomeIcon icon={faExclamationTriangle} className="modal-icon-warning" />
              <h3>Confirmer la suppression</h3>
            </div>

            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer cet élément ?</p>
              <span className="item-to-delete-name">
                {itemToDelete?.genre_name ||
                  itemToDelete?.platform_name ||
                  itemToDelete?.tag_name ||
                  itemToDelete?.status_name}
              </span>
              <p className="modal-warning-text">Cette action est irréversible.</p>
            </div>

            <div className="modal-actions">
              <button className="btn-modal btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn-modal btn-confirm-delete" onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryManager
