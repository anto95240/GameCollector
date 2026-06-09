import './FilterPanelTabs.css'

export const FilterPanelTabs = ({ activePanelTab, setActivePanelTab }: any) => {
  return (
    <div className="filter-tabs flex gap-2 p-3">
      <button
        className={`tab ${activePanelTab === 'all' ? 'active' : ''}`}
        onClick={() => setActivePanelTab('all')}
      >
        Tous les filtres
      </button>
      <button
        className={`tab ${activePanelTab === 'saved' ? 'active' : ''}`}
        onClick={() => setActivePanelTab('saved')}
      >
        Filtres sauvegardés
      </button>
    </div>
  )
}
