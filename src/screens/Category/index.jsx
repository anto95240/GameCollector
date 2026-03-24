import { useState, useRef, useEffect } from "react";

import CategorySelector from "../../components/main/Category/CategorySelector";
import CategoryManager from "../../components/main/Category/CategoryManager";
import "./Category.css";

const CategoryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (selectedCategory && managerRef.current && window.innerWidth < 1024) {
      setTimeout(() => {
        managerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [selectedCategory]);

  return (
    <div
      className={`category-page-container ${selectedCategory ? "mode-active" : "mode-hero"}`}
    >
      <div className="selector-wrapper">
        <CategorySelector
          selectedId={selectedCategory}
          onSelect={(id) =>
            setSelectedCategory((prev) => (prev === id ? null : id))
          }
        />
      </div>

      <div
        ref={managerRef}
        className={`manager-wrapper ${selectedCategory ? "show" : "hide"}`}
      >
        {selectedCategory && (
          <CategoryManager categoryType={selectedCategory} />
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
