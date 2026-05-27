import "./FilterPanel.css";

import {
  faCalendarAlt,
  faCheckCircle,
  faChevronDown,
  faClock,
  faGamepad,
  faHeart,
  faLayerGroup,
  faStar,
  faTimes,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { t } from "i18next";
import { useEffect, useState } from "react";

import FilterAccordionItem from "@/components/secondary/Liste/filtre/FilterAccordionItem";

import {
  getActiveFilterValue,
  getActiveSort,
  getOptionCount,
  handleClearCategory,
  isFilterSelected,
  parseRangeDraft,
} from "./filterUtils";
import { SavedFiltersList } from "./SavedFiltersList";
import { SaveFiltersBox } from "./SaveFiltersBox";
import { RangeFilterItem, SortFilterItem } from "./SpecialFilters";

const ICONS = {
  genre: faLayerGroup,
  platform: faGamepad,
  year: faCalendarAlt,
  rating: faStar,
  status: faCheckCircle,
  favorite: faHeart,
  soon: faClock,
};

const FilterPanel = ({
  isOpen,
  onClose,
  selectedFilters,
  onRemoveFilter,
  onClearAll,
  filterData,
  onSelectFilter,
  games,
  resultCount,
  // saved filters handlers
  savedFilters = [],
  onSaveCurrentFilters,
  onApplySaved,
  onDeleteSaved,
}) => {
  const [expandedFilter, setExpandedFilter] = useState(null);
  const [showAllOptions, setShowAllOptions] = useState({});
  const [activePanelTab, setActivePanelTab] = useState("all");
  const [saveName, setSaveName] = useState("");
  const [specialExpanded, setSpecialExpanded] = useState({
    sort: false,
    ratingRange: false,
    yearRange: false,
  });
  const [sortDraft, setSortDraft] = useState({ field: "Nom", order: "asc" });
  const [rangeDrafts, setRangeDrafts] = useState({
    yearRange: { min: "", max: "" },
    ratingRange: { min: "", max: "" },
  });

  const toggleFilterCategory = (id) =>
    setExpandedFilter(expandedFilter === id ? null : id);

  const toggleShowAll = (categoryId) => {
    setShowAllOptions((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleClearCategoryLocal = (categoryLabel) => {
    handleClearCategory(selectedFilters, onRemoveFilter, categoryLabel);
  };

  const getOptionCountLocal = (categoryLabel, optionValue) => 
    getOptionCount(games, categoryLabel, optionValue);

  const isFilterSelectedLocal = (categoryLabel, optionValue) =>
    isFilterSelected(selectedFilters, categoryLabel, optionValue);

  const getActiveFilterValueLocal = (categoryLabel) =>
    getActiveFilterValue(selectedFilters, categoryLabel);

  const getActiveSortLocal = () => getActiveSort(selectedFilters);

  const toggleSpecial = (key) => {
    setSpecialExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setRangeDrafts({
      yearRange: parseRangeDraft(selectedFilters, "Année"),
      ratingRange: parseRangeDraft(selectedFilters, "Note"),
    });
    setSortDraft(getActiveSortLocal());
  }, [selectedFilters]);

  return (
    <div
      className={`filter-panel flex flex-col ${isOpen ? "open" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="filter-header flex justify-center items-center shrink-0">
        <h3>Filtrer</h3>
        <button className="close-filter" onClick={onClose} aria-label="Fermer">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="filter-scroll-content grow overflow-y-auto custom-scrollbar">
        <div className="active-filters-box">
          {selectedFilters.length === 0 ? (
            <span className="placeholder-text">{t("gameList.filters.noFilter")}</span>
          ) : (
            <>
              {selectedFilters.map((filter, i) => (
                <span
                  key={i}
                  className="filter-tag flex cursor-pointer items-center gap-1.5"
                  onClick={() => onRemoveFilter(filter)}
                >
                  {filter.split(":")[1]} <FontAwesomeIcon icon={faTimes} size="xs" />
                </span>
              ))}
              <button className="reset-all-btn" onClick={onClearAll}>
                <FontAwesomeIcon icon={faTrashAlt} /> {t("gameList.filters.clearAll")}
              </button>
            </>
          )}
        </div>

        {/* Tab switch: All filters / Saved filters */}
        <div className="filter-tabs flex gap-2 p-3">
          <button className={`tab ${activePanelTab === "all" ? "active" : ""}`} onClick={() => setActivePanelTab("all")}>Tous les filtres</button>
          <button className={`tab ${activePanelTab === "saved" ? "active" : ""}`} onClick={() => setActivePanelTab("saved")}>Filtres sauvegardés</button>
        </div>

        {activePanelTab === "all" ? (
          <div className="filter-accordion flex flex-col gap-3 pb-4">
            {filterData.map((cat) => {
              if (cat.type === "range") {
                const specialKey = cat.id === "year_range" ? "yearRange" : "ratingRange";
                return (
                  <RangeFilterItem
                    key={cat.id}
                    category={cat}
                    rangeDrafts={rangeDrafts}
                    setRangeDrafts={setRangeDrafts}
                    getActiveFilterValue={getActiveFilterValueLocal}
                    onSelectFilter={onSelectFilter}
                    onClose={onClose}
                    icon={ICONS[cat.id] || faLayerGroup}
                    specialExpanded={specialExpanded}
                    toggleSpecial={toggleSpecial}
                  />
                );
              }

              if (cat.type === "sort") {
                return (
                  <SortFilterItem
                    key={cat.id}
                    category={cat}
                    sortDraft={sortDraft}
                    setSortDraft={setSortDraft}
                    getActiveFilterValue={getActiveFilterValueLocal}
                    onSelectFilter={onSelectFilter}
                    onClose={onClose}
                    icon={ICONS[cat.id] || faLayerGroup}
                    specialExpanded={specialExpanded}
                    toggleSpecial={toggleSpecial}
                  />
                );
              }

              return (
                <FilterAccordionItem
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedFilter === cat.id}
                  onToggle={() => toggleFilterCategory(cat.id)}
                  selectedFilters={selectedFilters}
                  onSelectFilter={onSelectFilter}
                  onRemoveFilter={onRemoveFilter}
                  icon={ICONS[cat.id] || faLayerGroup}
                  getOptionCount={getOptionCountLocal}
                  showAllState={showAllOptions[cat.id]}
                  toggleShowAll={toggleShowAll}
                  handleClearCategory={handleClearCategoryLocal}
                />
              );
            })}

            <SaveFiltersBox 
              saveName={saveName}
              setSaveName={setSaveName}
              onSaveCurrentFilters={onSaveCurrentFilters}
              onClearAll={onClearAll}
            />
          </div>
        ) : (
          <SavedFiltersList 
            savedFilters={savedFilters} 
            onApplySaved={onApplySaved} 
            onDeleteSaved={onDeleteSaved}
          />
        )}

      </div>

      {/* FOOTER */}
      <div className="filter-footer shrink-0 p-4">
        <button className="btn-show-results w-full" onClick={onClose}>
          Voir les {resultCount} jeux
        </button>
      </div>

    </div>
  );
};

export default FilterPanel;
