import './FilterPanelHeader.css'

import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export const FilterPanelHeader = ({ onClose }: any) => {
  return (
    <div className="filter-header flex justify-center items-center shrink-0">
      <h3>Filtrer</h3>
      <button className="close-filter" onClick={onClose} aria-label="Fermer">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  )
}
