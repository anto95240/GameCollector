import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import CategoryList from "../../../secondary/Category/CategoryListe";
import CategoryForm from "../../../secondary/Category/CategoryForm";
import "./categoryManager.css";

// Mock Data (Pourrait être passé via props ou contexte)
const MOCK_DATA = {
    genre: ["Action", "Aventure", "RPG", "Streaming"],
    platform: ["PS4", "PS5", "Xbox", "Switch", "Streaming"],
    tag: ["Marvel", "Sport", "Foot", "Star Wars", "Streaming"],
    status: ["Terminé", "En cours", "Pas commencé", "En wishlist", "Streaming"]
};

const CategoryManager = ({ categoryType }) => {
    const { t } = useTranslation();
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false); // État pour savoir si on édite
    const [itemToEdit, setItemToEdit] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);   
    const listItems = MOCK_DATA[categoryType] || [];

    // Helper simple pour le titre
    const getCategoryLabel = () => {
        const labels = { genre: "Genre", platform: "Plateforme", tag: "Tag", status: "Status" };
        return labels[categoryType] || "Catégorie";
    };

    const handleAddClick = () => {
        setEditMode(false);
        setItemToEdit(null);
        setShowForm(!showForm);
    };

    const handleEdit = (item) => {
        setEditMode(true);
        setItemToEdit(item);
        setShowForm(true);
    };

    const handleDeleteClick = (item) => {
        setShowDeleteModal(true);
        // Ici on stockerait l'item à supprimer
    };

    const confirmDelete = () => {
        // Logique de suppression ici
        setShowDeleteModal(false);
    };

    return (
        <div className="manager-container">
            
            {/* HEADER */}
            <div className="manager-header">
                <span className="manager-title">{getCategoryLabel()}</span>
                
                <button 
                    className={`add-icon-btn ${showForm && !editMode ? "active" : ""}`}
                    onClick={handleAddClick}
                    title={showForm ? "Fermer" : "Ajouter"}
                >
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>

            {/* CONTENT */}
            <div className="manager-content">
                
                {/* LISTE (Prend la largeur restante) */}
                <CategoryList 
                    items={listItems} 
                    isCompact={showForm} 
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />

                {/* FORMULAIRE (S'ouvre et se ferme) */}
                <CategoryForm 
                    categoryType={categoryType} 
                    isOpen={showForm} 
                    onClose={() => setShowForm(false)} 
                    isEdit={editMode}       
                    initialData={itemToEdit}
                />

            </div>

            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h4>Confirmer la suppression</h4>
                        <p>Êtes-vous sûr de vouloir supprimer cette catégorie ?</p>
                        <div className="modal-actions">
                            <button className="btn-light" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                            <button className="btn-red" onClick={confirmDelete}>Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
    );
};

export default CategoryManager;