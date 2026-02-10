import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./CategoryForm.css"

const CategoryForm = ({ categoryType, isOpen, onClose, isEdit, initialData }) => {
    const [formData, setFormData] = useState({
        name: "", brand: "", order: "", color: "#ffffff"
    });
    const nameInputRef = useRef(null); 
    const { t } = useTranslation();

    useEffect(() => {
        if (isEdit && initialData) {
            setFormData({ name: typeof initialData === 'string' ? initialData : "", brand: "", order: "", color: "#ffffff" });
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

    return (
        <div className={`manager-form-container ${isOpen ? "open" : "closed"}`}>
            <div className="manager-form-wrapper">
                <p className="form-title-inner">{getFormTitle()}</p>
                
                <form className="form-fields" onSubmit={(e) => e.preventDefault()}>
                    
                    {/* Nom (Commun) */}
                    <div className="form-group">
                        <label>{t('categories.fields.name')}</label>
                        <input 
                            ref={nameInputRef} 
                            type="text" 
                            className="form-input category" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    
                    {categoryType === "tag" && (
                         <div className="form-group">
                            <label>{t('categories.fields.order')}</label>
                            <input 
                                type="text" className="form-input category" value={formData.order}
                                onChange={(e) => setFormData({...formData, order: e.target.value})}
                            />
                        </div>
                    )}

                    {categoryType === "platform" && (
                         <div className="form-group">
                            <label>{t('categories.fields.brand')}</label>
                            <input 
                                type="text" className="form-input category" value={formData.brand}
                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>{t('categories.fields.color')}</label>
                        <input 
                            type="color" className="color-picker-square" value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                        />
                        <div className="flex-1"></div> 
                    </div>

                    <div className="form-actions">
                        <button className="btn-cancel-category" onClick={onClose}>{t('common.cancel')}</button>
                        <button className="btn-addEdit-category">{isEdit ? t('categories.edit') : t('categories.add')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryForm;