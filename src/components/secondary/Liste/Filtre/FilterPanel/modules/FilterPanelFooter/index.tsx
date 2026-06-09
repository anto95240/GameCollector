import './FilterPanelFooter.css'

export const FilterPanelFooter = ({ resultCount, onClose }: any) => {
  return (
    <div className="filter-footer shrink-0 p-4">
      <button className="btn-show-results w-full" onClick={onClose}>
        Voir les {resultCount} jeux
      </button>
    </div>
  )
}
