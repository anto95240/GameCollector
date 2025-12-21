import { useState, useEffect } from "react";
import "./categoryForm.css"

const CategoryForm = ({ categoryType, isOpen, onClose }) => {
    useEffect(() => {
        setFormData({ name: "", brand: "", order: "", color: "#ffffff" });
    }, [categoryType]);

    const [formData, setFormData] = useState({
        name: "", brand: "", order: "", color: "#ffffff"
    });

    const getFormTitle = () => {
        const titles = {
            genre: "Ajouter des genres",
            platform: "Ajouter des plateformes",
            tag: "Ajouter des tags",
            status: "Ajouter des status"
        };
        return titles[categoryType] || "Ajouter";
    };

    return (
        <div className={`manager-form-container ${isOpen ? "open" : "closed"}`}>
            <div className="manager-form-wrapper">
                <p className="form-title-inner">{getFormTitle()}</p>
                
                <form className="form-fields" onSubmit={(e) => e.preventDefault()}>
                    
                    {/* Nom (Commun) */}
                    <div className="form-group">
                        <label>Nom :</label>
                        <input 
                            type="text" className="form-input" value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* Champs Spécifiques */}
                    {categoryType === "tag" && (
                         <div className="form-group">
                            <label>Ordre :</label>
                            <input 
                                type="text" className="form-input" value={formData.order}
                                onChange={(e) => setFormData({...formData, order: e.target.value})}
                            />
                        </div>
                    )}

                    {categoryType === "platform" && (
                         <div className="form-group">
                            <label>Constructeur :</label>
                            <input 
                                type="text" className="form-input" value={formData.brand}
                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                            />
                        </div>
                    )}

                    {/* Couleur (Commun) */}
                    <div className="form-group">
                        <label>Couleur</label>
                        <input 
                            type="color" className="color-picker-square" value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                        />
                        <div style={{flex: 1}}></div> 
                    </div>

                    <div className="form-actions">
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button className="btn-add">Ajouter</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryForm;