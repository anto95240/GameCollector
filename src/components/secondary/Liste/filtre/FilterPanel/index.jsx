import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTimes, faTrashAlt, faLayerGroup, faGamepad, 
  faCalendarAlt, faStar, faCheckCircle, faHeart, faClock
} from "@fortawesome/free-solid-svg-icons";

import FilterAccordionItem from "../FilterAccordionItem";
import "./filterPanel.css";

const ICONS = {
  genre: faLayerGroup,
  platform: faGamepad,
  year: faCalendarAlt,
  rating: faStar,
  status: faCheckCircle,
  favorite: faHeart,
  soon: faClock
};

const FilterPanel = ({ 
  isOpen, 
  onClose, 
  selectedFilters, 
  onRemoveFilter, 
  onClearAll, 
  filterData, 
  onSelectFilter,
  games
}) => {

  const [expandedFilter, setExpandedFilter] = useState(null);
  const [showAllOptions, setShowAllOptions] = useState({});

  // --- Handlers ---
  const toggleFilterCategory = (id) => setExpandedFilter(expandedFilter === id ? null : id);

  const toggleShowAll = (categoryId) => {
    setShowAllOptions(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleClearCategory = (categoryLabel) => {
    selectedFilters.forEach(filter => {
      if (filter.startsWith(`${categoryLabel}:`)) {
        onRemoveFilter(filter);
      }
    });
  };

  // Logique de comptage (similaire à l'ancien composant)
  const getOptionCount = (categoryLabel, optionValue) => {
    if (!games) return 0;
    // Note: Assure-toi que les labels correspondent aux clés de ton objet game (genre vs Genre)
    // Dans useGameFiltering j'ai utilisé switch sur le label en lowercase.
    // Pour simplifier ici, on peut compter les occurrences brutes si la structure le permet.
    // Ceci est une implémentation simple :
    return games.filter(g => {
        // Logique de matching simplifiée pour l'affichage du nombre
        // À adapter selon tes vraies données
        if (categoryLabel === "Genre" && g.genre === optionValue) return true;
        if (categoryLabel === "Plateforme" && g.platform === optionValue) return true;
        // ... etc
        return false;
    }).length; 
  };

  return (
    <div className={`filter-panel flex flex-col ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
      
      {/* HEADER */}
      <div className="filter-header flex justify-center items-center">
        <h3>Filtrer</h3>
        <button className="close-filter" onClick={onClose} aria-label="Fermer">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      {/* ACTIVE FILTERS */}
      <div className="active-filters-box">
        {selectedFilters.length === 0 ? (
          <span className="placeholder-text">Aucun filtre actif</span>
        ) : (
          <>
            {selectedFilters.map((filter, i) => (
              <span key={i} className="filter-tag flex cursor-pointer items-center gap-1.5" onClick={() => onRemoveFilter(filter)}>
                {filter.split(':')[1]} <FontAwesomeIcon icon={faTimes} size="xs" style={{ marginLeft: 5 }}/>
              </span>
            ))}
            <button className="reset-all-btn" onClick={onClearAll}>
                <FontAwesomeIcon icon={faTrashAlt} /> Tout effacer
            </button>
          </>
        )}
      </div>

      {/* ACCORDION LIST */}
      <div className="filter-accordion flex flex-col gap-3">
        {filterData.map(cat => (
            <FilterAccordionItem 
                key={cat.id}
                category={cat}
                isExpanded={expandedFilter === cat.id}
                onToggle={() => toggleFilterCategory(cat.id)}
                selectedFilters={selectedFilters}
                onSelectFilter={onSelectFilter}
                onRemoveFilter={onRemoveFilter}
                icon={ICONS[cat.id] || faLayerGroup}
                getOptionCount={getOptionCount}
                showAllState={showAllOptions[cat.id]}
                toggleShowAll={toggleShowAll}
                handleClearCategory={handleClearCategory}
            />
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;