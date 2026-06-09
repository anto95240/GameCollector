import './CategorySelector.css'

import { faCrosshairs, faCube, faTag, faThLarge } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const CATEGORIES_CONFIG = [
  { id: 'genre', label: 'GENRE', icon: faThLarge },
  { id: 'platform', label: 'PLATEFORME', icon: faCube },
  { id: 'tag', label: 'TAG', icon: faTag },
  { id: 'status', label: 'STATUS', icon: faCrosshairs },
]

const CategorySelector = ({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) => {
  return (
    <div className="category-selector-grid">
      {CATEGORIES_CONFIG.map((cat: any) => (
        <button
          key={cat.id}
          className={`console-entry-anim category-card-btn ${selectedId === cat.id ? 'active' : ''} ${selectedId && selectedId !== cat.id ? 'dimmed' : ''}`}
          onClick={() => onSelect(cat.id)}
        >
          <FontAwesomeIcon icon={cat.icon} className="cat-icon" />
          <span className="cat-label">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}

export default CategorySelector
