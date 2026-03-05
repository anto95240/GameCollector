import { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

import CategoryList from "../../../secondary/Category/CategoryListe";
import CategoryForm from "../../../secondary/Category/CategoryForm";
import { useApiMetadata } from "../../../../hooks/api/useApiMetadata";
import "./CategoryManager.css";

const CategoryManager = ({ categoryType }) => {
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);   
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const [listItems, setListItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const formRef = useRef(null);
    
    const { getMetadataByType, deleteMetadata } = useApiMetadata();

    const fetchCategories = useCallback(async () => {
        if (!categoryType) return;
        setIsLoading(true);
        try {
            const data = await getMetadataByType(categoryType);
            setListItems(data || []);
        } catch (error) {
            console.error(`Erreur lors du chargement de ${categoryType}:`, error);
            setListItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [categoryType, getMetadataByType]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const isMobile = window.innerWidth < 1024;
        if (showForm && formRef.current && isMobile) {
            setTimeout(() => {
                formRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 300);
        }
    }, [showForm]);

    const getCategoryLabel = () => {
        const labels = { genre: "Genre", platform: "Plateforme", tag: "Tag", status: "Status" };
        return labels[categoryType] || "Catégorie";
    };

    const handleAddClick = () => {
        if (showForm) {
            setShowForm(false);
            setEditMode(false);
            setItemToEdit(null);
        } else {
            setEditMode(false);
            setItemToEdit(null);
            setShowForm(true);
        }
    };

    const handleEdit = (item) => {
        setEditMode(true);
        setItemToEdit(item);
        setShowForm(true);
    };

    const handleDeleteRequest = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteMetadata(categoryType, itemToDelete._id || itemToDelete.id);
            setShowDeleteModal(false);
            setItemToDelete(null);
            fetchCategories(); 
        } catch (error) {
            console.error("Erreur de suppression:", error);
        }
    };

    const handleSuccess = () => {
        setIsSuccess(true);
        fetchCategories(); 
        setTimeout(() => {
            setIsSuccess(false);
            setShowForm(false);
        }, 1500);
    };

    return (
        <div className="manager-container">
            <div className="manager-header">
                <span className="manager-title">{getCategoryLabel()}</span>
                <button 
                    className={`add-icon-btn ${showForm ? "active" : ""}`} 
                    onClick={handleAddClick}
                    title={showForm ? "Fermer" : "Ajouter"}
                >
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>

            <div className="manager-content">
                {isLoading ? (
                    <p className="loading-text" style={{padding: '2rem', textAlign: 'center'}}>Chargement en cours...</p>
                ) : (
                    <CategoryList 
                        items={listItems} 
                        isCompact={showForm} 
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest} 
                    />
                )}

                <div ref={formRef} className={`form-collapsible ${showForm ? "open" : ""}`}>
                    <div className="form-inner">
                        <CategoryForm 
                            categoryType={categoryType} 
                            isOpen={true} 
                            onClose={() => setShowForm(false)} 
                            isEdit={editMode}       
                            initialData={itemToEdit}
                            onSuccess={handleSuccess}
                        />
                    </div>
                </div>
            </div>
            
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-danger">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="modal-icon-warning" />
                            <h3>Confirmer la suppression</h3>
                        </div>
                        
                        <div className="modal-body">
                            <p>Voulez-vous vraiment supprimer cet élément ?</p>
                            <span className="item-to-delete-name">
                                {itemToDelete?.genre_name || itemToDelete?.platform_name || itemToDelete?.tag_name || itemToDelete?.status_name}
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
    );
};

export default CategoryManager;