import './SavedFiltersList.css'

export const SavedFiltersList = ({ savedFilters, onApplySaved, onDeleteSaved }) => {
  if (savedFilters.length === 0) {
    return (
      <div className="saved-empty-state">
        <div className="saved-empty-title">Aucun filtre sauvegardé</div>
        <p className="saved-empty-text">
          Sauvegardez un ensemble de filtres pour le retrouver ici et le réappliquer en un clic.
        </p>
      </div>
    )
  }

  return (
    <div className="saved-filters-list p-3">
      {savedFilters.map((s) => (
        <div key={s.id} className="saved-item flex items-center justify-between gap-3 p-2">
          <div className="saved-info">
            <div className="saved-topline">
              <div className="saved-name">{s.name}</div>
            </div>
          </div>
          <div className="saved-actions flex gap-2">
            <button type="button" className="btn" onClick={() => onApplySaved && onApplySaved(s)}>
              Appliquer
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDeleteSaved && onDeleteSaved(s.id)}
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
