import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faTrashAlt,
  faLayerGroup,
  faGamepad,
  faCalendarAlt,
  faStar,
  faCheckCircle,
  faHeart,
  faClock,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

import FilterAccordionItem from "../FilterAccordionItem";
import "./FilterPanel.css";
import { t } from "i18next";

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

  const handleClearCategory = (categoryLabel) => {
    selectedFilters.forEach((filter) => {
      if (filter.startsWith(`${categoryLabel}:`)) {
        onRemoveFilter(filter);
      }
    });
  };

  const getOptionCount = (categoryLabel, optionValue) => {
    if (!games) return 0;

    return games.filter((g) => {
      switch (categoryLabel) {
        case "Genre":
          return g.genre === optionValue;
        case "Plateforme":
          return g.platform === optionValue;
        case "Année":
          return String(g.year) === optionValue;
        case "Note":
          return g.rating === optionValue;
        case "Statut":
          return g.status === optionValue;
        case "Favoris":
          return optionValue === "Nos favoris" ? g.isFavorite : !g.isFavorite;
        case "Prochainement":
          return optionValue === "Prochainement" ? g.isSoon : !g.isSoon;
        default:
          return false;
      }
    }).length;
  };

  const isFilterSelected = (categoryLabel, optionValue) =>
    selectedFilters.includes(`${categoryLabel}: ${optionValue}`);

  const getActiveFilterValue = (categoryLabel) => {
    const found = selectedFilters.find((filter) => filter.startsWith(`${categoryLabel}:`));
    return found ? found.split(": ")[1] : "";
  };

  const getActiveSort = () => {
    const raw = getActiveFilterValue("Trier par");
    const [field = "Nom", order = "asc"] = raw ? raw.split("|") : [];
    return { field, order };
  };

  const toggleSpecial = (key) => {
    setSpecialExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const parseRange = (categoryLabel) => {
      const current = getActiveFilterValue(categoryLabel);
      if (!current || !current.includes("-")) return { min: "", max: "" };
      const [min, max] = current.split("-");
      return { min: min || "", max: max || "" };
    };

    setRangeDrafts({
      yearRange: parseRange("Année"),
      ratingRange: parseRange("Note"),
    });
    setSortDraft(getActiveSort());
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
                const activeValue = getActiveFilterValue(cat.label);
                const draft = rangeDrafts[specialKey] || { min: "", max: "" };
                return (
                  <div key={cat.id} className="accordion-item range-item special-item">
                    <button type="button" className="accordion-header special-header" onClick={() => toggleSpecial(specialKey)}>
                      <div className="header-left">
                        <span className="icon-cat"><FontAwesomeIcon icon={ICONS[cat.id] || faLayerGroup} fixedWidth /></span>
                        <span className="cat-label">{cat.label}</span>
                        {activeValue ? <span className="active-badge">{activeValue}</span> : null}
                      </div>
                      <FontAwesomeIcon icon={faChevronDown} className={`chevron ${specialExpanded[specialKey] ? "rotate" : ""}`} size="xs" />
                    </button>
                    <div className={`accordion-content special-content ${specialExpanded[specialKey] ? "open" : "closed"}`}>
                      {specialExpanded[specialKey] ? (
                        <div className="range-card">
                          <div className="range-row range-grid">
                            <input
                              type="number"
                              min={cat.min}
                              max={cat.max}
                              placeholder={cat.min}
                              className="range-input"
                              value={draft.min}
                              onChange={(e) => setRangeDrafts((prev) => ({ ...prev, [specialKey]: { ...prev[specialKey], min: e.target.value } }))}
                            />
                            <span className="range-separator">—</span>
                            <input
                              type="number"
                              min={cat.min}
                              max={cat.max}
                              placeholder={cat.max}
                              className="range-input"
                              value={draft.max}
                              onChange={(e) => setRangeDrafts((prev) => ({ ...prev, [specialKey]: { ...prev[specialKey], max: e.target.value } }))}
                            />
                          </div>
                          <div className="range-actions">
                            <button
                              type="button"
                              className="range-apply-btn"
                              onClick={() => {
                                const min = draft.min || cat.min;
                                const max = draft.max || cat.max;
                                onSelectFilter(cat.label, `${min}-${max}`);
                                onClose();
                              }}
                            >
                              Appliquer
                            </button>
                          </div>
                          <p className="range-help">Définissez une plage min/max pour filtrer les jeux.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (cat.type === "sort") {
                const activeSort = getActiveFilterValue(cat.label);
                const activeSortParts = activeSort ? activeSort.split("|") : [];
                const activeSortField = activeSortParts[0] || sortDraft.field;
                const activeSortOrder = activeSortParts[1] || sortDraft.order;
                return (
                  <div key={cat.id} className="accordion-item special-item">
                    <button type="button" className="accordion-header special-header" onClick={() => toggleSpecial("sort")}>
                      <div className="header-left">
                        <span className="icon-cat"><FontAwesomeIcon icon={ICONS[cat.id] || faLayerGroup} fixedWidth /></span>
                        <span className="cat-label">{cat.label}</span>
                        {activeSort ? <span className="active-badge">{activeSortField} · {activeSortOrder === "desc" ? "Décroissant" : "Croissant"}</span> : null}
                      </div>
                      <FontAwesomeIcon icon={faChevronDown} className={`chevron ${specialExpanded.sort ? "rotate" : ""}`} size="xs" />
                    </button>
                    <div className={`accordion-content special-content ${specialExpanded.sort ? "open" : "closed"}`}>
                      {specialExpanded.sort ? (
                        <div className="sort-options-wrap p-2">
                          <div className="sort-group">
                            <div className="sort-group-label">Champ</div>
                            <div className="sort-pills">
                              {cat.options.map((opt) => {
                                const selected = sortDraft.field === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    className={`sort-option ${selected ? "selected" : ""}`}
                                    onClick={() => setSortDraft((prev) => ({ ...prev, field: opt, order: prev.order || "asc" }))}
                                  >
                                    <span>{opt}</span>
                                    {selected ? <span className="sort-current-dot">Actif</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="sort-group">
                            <div className="sort-group-label">Ordre</div>
                            <div className="sort-pills">
                              {[
                                { label: "Croissant", value: "asc" },
                                { label: "Décroissant", value: "desc" },
                              ].map((opt) => {
                                const selected = sortDraft.order === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`sort-option ${selected ? "selected" : ""}`}
                                    onClick={() => setSortDraft((prev) => ({ ...prev, order: opt.value }))}
                                  >
                                    <span>{opt.label}</span>
                                    {selected ? <span className="sort-current-dot">Actif</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="sort-actions">
                            <button
                              type="button"
                              className="range-apply-btn"
                              onClick={() => {
                                onSelectFilter(cat.label, `${sortDraft.field}|${sortDraft.order}`);
                                onClose();
                              }}
                            >
                              Appliquer le tri
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                  getOptionCount={getOptionCount}
                  showAllState={showAllOptions[cat.id]}
                  toggleShowAll={toggleShowAll}
                  handleClearCategory={handleClearCategory}
                />
              );
            })}

            <div className="save-filters-box p-3">
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nommer ce jeu de filtres" />
              <div className="save-actions flex gap-2 mt-2">
                <button className="btn" onClick={() => { onSaveCurrentFilters && onSaveCurrentFilters(saveName); setSaveName(""); }}>
                  Sauvegarder les filtres
                </button>
                <button className="btn btn-ghost" onClick={() => { onClearAll && onClearAll(); }}>
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="saved-filters-list p-3">
            {savedFilters.length === 0 ? (
              <div className="saved-empty-state">
                <div className="saved-empty-title">Aucun filtre sauvegardé</div>
                <p className="saved-empty-text">
                  Sauvegardez un ensemble de filtres pour le retrouver ici et le réappliquer en un clic.
                </p>
              </div>
            ) : (
              savedFilters.map((s) => (
                <div key={s.id} className="saved-item flex items-center justify-between gap-3 p-2">
                  <div className="saved-info">
                    <div className="saved-topline">
                      <div className="saved-name">{s.name}</div>
                    </div>
                  </div>
                  <div className="saved-actions flex gap-2">
                    <button className="btn" onClick={() => { onApplySaved && onApplySaved(s); }}>
                      Appliquer
                    </button>
                    <button className="btn btn-danger" onClick={() => { onDeleteSaved && onDeleteSaved(s.id); }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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
