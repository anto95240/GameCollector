import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import CategorySelector from "../../components/main/Category/CategorySelector";
import CategoryManager from "../../components/main/Category/CategoryManager";
import "./category.css";

const CategoryPage = () => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const managerRef = useRef(null);

    // Effet : Scroll automatique sur Mobile/Tablette
    useEffect(() => {
        if (selectedCategory && managerRef.current && window.innerWidth < 1024) {
            // Petit délai pour laisser le temps à l'animation CSS de se lancer
            setTimeout(() => {
                managerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }, [selectedCategory]);

    return (
        <div className={`category-page-container ${selectedCategory ? "mode-active" : "mode-hero"}`}>
            
            {/* Le wrapper gère maintenant l'animation de translation CSS */}
            <div className="selector-wrapper">
                <CategorySelector 
                    selectedId={selectedCategory} 
                    onSelect={(id) => setSelectedCategory(prev => prev === id ? null : id)} 
                />
            </div>

            {/* Le manager apparaît en dessous */}
            <div 
                ref={managerRef} 
                className={`manager-wrapper ${selectedCategory ? "show" : "hide"}`}
            >
                {selectedCategory && (
                    <CategoryManager categoryType={selectedCategory} t={t} />
                )}
            </div>
            
        </div>
    );
};

export default CategoryPage;