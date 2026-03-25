import CategoryForm from "../../components/secondary/Category/CategoryForm";
import CategoryListe from "../../components/secondary/Category/CategoryListe";
import CategorySelector from "../../components/main/Category/CategorySelector";
import { useCategoryManager } from "../../hooks/category/useCategoryManager";

import "./Category.css";

const CategoryPage = () => {
  const {
    t, categories, selectedCategory, handleCategoryChange,
    isEditMode, formData, isLoading, isAnimating,
    handleChange, handleSubmit, handleEdit, handleDelete, resetForm
  } = useCategoryManager();

  return (
    <div className="category-page-container fade-in">
      <div className="category-header">
        <h1 className="category-title text-3xl font-bold text-white mb-2">
          {t("categories.title")}
        </h1>
        <p className="category-subtitle text-gray-400 mb-8">
          {t("categories.subtitle")}
        </p>
      </div>

      <CategorySelector
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
        t={t}
      />

      <div className="category-content-grid">
        <div className="category-form-wrapper console-entry-anim">
          <CategoryForm
            t={t}
            isEditMode={isEditMode}
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isAnimating={isAnimating}
          />
        </div>

        <div className="category-list-wrapper console-entry-anim" style={{ animationDelay: "0.1s" }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <p className="loading-text">Chargement...</p>
            </div>
          ) : (
            <CategoryListe
              t={t}
              items={categories[selectedCategory] || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;