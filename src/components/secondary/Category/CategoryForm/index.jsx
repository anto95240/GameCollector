import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApiMetadata } from "../../../../hooks/api/useApiMetadata";
import "./CategoryForm.css"

const CategoryForm = ({ categoryType, isOpen, onClose, isEdit, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "", brand: "", order: "", color: "#ffffff"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nameInputRef = useRef(null); 
    const { t } = useTranslation();
    
    const { createMetadata, updateMetadata } = useApiMetadata();

    useEffect(() => {
        if (isEdit && initialData) {
            // Lecture dynamique du nom pour l'édition
            const itemName = initialData.name 
                || initialData.label 
                || initialData.genre_name 
                || initialData.platform_name 
                || initialData.tag_name 
                || initialData.status_name 
                || (typeof initialData === 'string' ? initialData : "");

            setFormData({ 
                name: itemName, 
                brand: initialData.brand || "", 
                order: initialData.order || "", 
                color: initialData.color || "#ffffff" 
            });
        } else {
            setFormData({ name: "", brand: "", order: "", color: "#ffffff" });
        }
    }, [isEdit, initialData, categoryType]);
   
    useEffect(() => {
        if (isOpen && nameInputRef.current) {
            setTimeout(() => {
                nameInputRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    const getFormTitle = () => {
        const action = isEdit ? t('categories.editTitle') : t('categories.addTitle');
        const suffix = {
            genre: t('categories.titleGenre'),
            platform: t('categories.titlePlatform'),
            tag: t('categories.titleTag'),
            status: t('categories.titleStatus')
        }[categoryType] || "";
        return `${action} ${suffix}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) return; 

        setIsSubmitting(true);
        try {
            // Construction du payload avec les clés exactes attendues par Mongoose
            const payload = { color: formData.color };
            
            switch (categoryType) {
                case "genre":
                    payload.genre_name = formData.name;
                    break;
                case "platform":
                    payload.platform_name = formData.name;
                    payload.brand = formData.brand;
                    break;
                case "tag":
                    payload.tag_name = formData.name;
                    payload.order = Number(formData.order) || 0;
                    break;
                case "status":
                    payload.status_name = formData.name;
                    break;
                default:
                    payload.name = formData.name;
            }

            if (isEdit) {
                const id = initialData._id || initialData.id;
                await updateMetadata(categoryType, id, payload);
            } else {
                await createMetadata(categoryType, payload);
            }
            
            if (onSuccess) onSuccess(); 
            
        } catch (error) {
            console.error("Erreur lors de l'enregistrement :", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`manager-form-container ${isOpen ? "open" : "closed"}`}>
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
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    {categoryType === "tag" && (
                         <div className="form-group">
                            <label>{t('categories.fields.order')}</label>
                            <input 
                                type="number" 
                                className="form-input category" 
                                value={formData.order}
                                onChange={(e) => setFormData({...formData, order: e.target.value})}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {categoryType === "platform" && (
                         <div className="form-group">
                            <label>{t('categories.fields.brand')}</label>
                            <input 
                                type="text" 
                                className="form-input category" 
                                value={formData.brand}
                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
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
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
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
                        <button 
                            type="submit" 
                            className="btn-addEdit-category" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Enregistrement..." : (isEdit ? t('categories.edit') : t('categories.add'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryForm;