import './SaveFiltersBox.css'

export const SaveFiltersBox = ({ saveName, setSaveName, onSaveCurrentFilters, onClearAll }: any) => {
  return (
    <div className="save-filters-box p-3">
      <input
        value={saveName}
        onChange={(e: any) => setSaveName(e.target.value)}
        placeholder="Nommer ce jeu de filtres"
      />
      <div className="save-actions flex gap-2 mt-2">
        <button
          className="btn"
          onClick={() => {
            onSaveCurrentFilters && onSaveCurrentFilters(saveName)
            setSaveName('')
          }}
        >
          Sauvegarder les filtres
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            onClearAll && onClearAll()
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
