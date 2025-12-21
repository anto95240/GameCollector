import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

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
    const [showForm, setShowForm] = useState(false);
    const listItems = MOCK_DATA[categoryType] || [];

    // Helper simple pour le titre
    const getCategoryLabel = () => {
        const labels = { genre: "Genre", platform: "Plateforme", tag: "Tag", status: "Status" };
        return labels[categoryType] || "Catégorie";
    };

    return (
        <div className="manager-container">
            
            {/* HEADER */}
            <div className="manager-header">
                <span className="manager-title">{getCategoryLabel()}</span>
                
                <button 
                    className={`add-icon-btn ${showForm ? "active" : ""}`} 
                    onClick={() => setShowForm(!showForm)}
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
                />

                {/* FORMULAIRE (S'ouvre et se ferme) */}
                <CategoryForm 
                    categoryType={categoryType} 
                    isOpen={showForm} 
                    onClose={() => setShowForm(false)} 
                />

            </div>
        </div>
    );
};

export default CategoryManager;