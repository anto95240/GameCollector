import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import CategoryList from "../../../secondary/Category/CategoryListe";
import CategoryForm from "../../../secondary/Category/CategoryForm";
import "./categoryManager.css";

// Mock Data
const MOCK_DATA = {
    genre: ["Action", "Aventure", "RPG", "Streaming"],
    platform: ["PS4", "PS5", "Xbox", "Switch", "Streaming"],
    tag: ["Marvel", "Sport", "Foot", "Star Wars", "Streaming"],
    status: ["Terminé", "En cours", "Pas commencé", "En wishlist", "Streaming"]
};

const CategoryManager = ({ categoryType }) => {
    const { t } = useTranslation();
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);   
    const listItems = MOCK_DATA[categoryType] || [];
    const [isSuccess, setIsSuccess] = useState(false);

    const formRef = useRef(null);

    // --- LOGIQUE DE SCROLL (UNIQUEMENT MOBILE) ---
    useEffect(() => {
        // On vérifie si on est sur petit écran (ex: < 1024px)
        const isMobile = window.innerWidth < 1024;

        if (showForm && formRef.current && isMobile) {
            setTimeout(() => {
                formRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center', // Centre le formulaire
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

    const handleSaveCategory = async (data) => {
        // ... logique de sauvegarde ...
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setShowForm(false); // Ferme le formulaire après l'animation
        }, 1500);
    };

    return (
        <div className="manager-container">
            {isSuccess && <SuccessOverlay message="Catégorie enregistrée !" />}
            {/* HEADER */}
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

            {/* CONTENT */}
            <div className="manager-content">
                {/* LISTE */}
                <CategoryList 
                    items={listItems} 
                    isCompact={showForm} 
                    onEdit={handleEdit}
                    onDelete={() => setShowDeleteModal(true)} // Exemple
                />

                {/* CONTAINER FORMULAIRE AVEC ANIMATION HYBRIDE */}
                <div 
                    ref={formRef} 
                    className={`form-collapsible ${showForm ? "open" : ""}`}
                >
                    <div className="form-inner">
                        <CategoryForm 
                            categoryType={categoryType} 
                            isOpen={true} // Toujours true, le CSS gère la visibilité
                            onClose={() => setShowForm(false)} 
                            isEdit={editMode}       
                            initialData={itemToEdit}
                        />
                    </div>
                </div>
            </div>
            
            {/* MODAL (Placeholder) */}
             {showDeleteModal && <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}></div>}
        </div>
    );
};

export default CategoryManager;