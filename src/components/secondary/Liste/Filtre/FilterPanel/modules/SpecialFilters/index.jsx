import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./SpecialFilters.css";

export const RangeFilterItem = ({
  category,
  rangeDrafts,
  setRangeDrafts,
  getActiveFilterValue,
  onSelectFilter,
  onClose,
  icon,
  specialExpanded,
  toggleSpecial,
}) => {
  const specialKey = `range_${category.id}`;
  const activeValue = getActiveFilterValue(category.label);
  const draft = rangeDrafts[specialKey] || { min: "", max: "" };

  return (
    <div className="accordion-item range-item special-item">
      <button type="button" className="accordion-header special-header" onClick={() => toggleSpecial(specialKey)}>
        <div className="header-left">
          <span className="icon-cat"><FontAwesomeIcon icon={icon} fixedWidth /></span>
          <span className="cat-label">{category.label}</span>
          {activeValue ? <span className="active-badge">{activeValue}</span> : null}
        </div>
        <FontAwesomeIcon icon={faChevronDown} className={`chevron ${specialExpanded[specialKey] ? "rotate" : ""}`} size="xs" />
      </button>
      <div className={`accordion-content special-content ${specialExpanded[specialKey] ? "open" : "closed"}`}>
        {specialExpanded[specialKey] && (
          <div className="range-card">
            <div className="range-row range-grid">
              <input
                type="number"
                min={category.min}
                max={category.max}
                placeholder={category.min}
                className="range-input"
                value={draft.min}
                onChange={(e) => setRangeDrafts((prev) => ({ ...prev, [specialKey]: { ...prev[specialKey], min: e.target.value } }))}
              />
              <span className="range-separator">—</span>
              <input
                type="number"
                min={category.min}
                max={category.max}
                placeholder={category.max}
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
                  const min = draft.min || category.min;
                  const max = draft.max || category.max;
                  onSelectFilter(category.label, `${min}-${max}`);
                  onClose();
                }}
              >
                Appliquer
              </button>
            </div>
            <p className="range-help">Définissez une plage min/max pour filtrer les jeux.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SortFilterItem = ({
  category,
  sortDraft,
  setSortDraft,
  getActiveFilterValue,
  onSelectFilter,
  onClose,
  icon,
  specialExpanded,
  toggleSpecial,
}) => {
  const activeSort = getActiveFilterValue(category.label);
  const activeSortParts = activeSort ? activeSort.split("|") : [];
  const activeSortField = activeSortParts[0] || sortDraft.field;
  const activeSortOrder = activeSortParts[1] || sortDraft.order;

  return (
    <div className="accordion-item special-item">
      <button type="button" className="accordion-header special-header" onClick={() => toggleSpecial("sort")}>
        <div className="header-left">
          <span className="icon-cat"><FontAwesomeIcon icon={icon} fixedWidth /></span>
          <span className="cat-label">{category.label}</span>
          {activeSort ? <span className="active-badge">{activeSortField} · {activeSortOrder === "desc" ? "Décroissant" : "Croissant"}</span> : null}
        </div>
        <FontAwesomeIcon icon={faChevronDown} className={`chevron ${specialExpanded.sort ? "rotate" : ""}`} size="xs" />
      </button>
      <div className={`accordion-content special-content ${specialExpanded.sort ? "open" : "closed"}`}>
        {specialExpanded.sort && (
          <div className="sort-options-wrap p-2">
            <div className="sort-group">
              <div className="sort-group-label">Champ</div>
              <div className="sort-pills">
                {category.options.map((opt) => {
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
                  onSelectFilter(category.label, `${sortDraft.field}|${sortDraft.order}`);
                  onClose();
                }}
              >
                Appliquer le tri
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
