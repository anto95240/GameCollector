import './Category.css'

import { useEffect, useRef, useState } from 'react'

import CategoryManager from '@/components/main/Category/CategoryManager'
import CategorySelector from '@/components/main/Category/CategorySelector'

const CategoryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const managerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedCategory && managerRef.current && window.innerWidth < 1024) {
      setTimeout(() => {
        managerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 300)
    }
  }, [selectedCategory])

  return (
    <div className={`category-page-container ${selectedCategory ? 'mode-active' : 'mode-hero'}`}>
      <div className="selector-wrapper">
        <CategorySelector
          selectedId={selectedCategory}
          onSelect={(id: any) => setSelectedCategory((prev: any) => (prev === id ? null : id))}
        />
      </div>

      <div ref={managerRef} className={`manager-wrapper ${selectedCategory ? 'show' : 'hide'}`}>
        {selectedCategory && <CategoryManager categoryType={selectedCategory} />}
      </div>
    </div>
  )
}

export default CategoryPage
