import "./ActiveFiltersBox.css";

import { faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const ActiveFiltersBox = ({
  selectedFilters,
  onRemoveFilter,
  onClearAll,
  noFilterLabel,
  clearAllLabel,
}) => {
  return (
    <div className="active-filters-box">
      {selectedFilters.length === 0 ? (
        <span className="placeholder-text">{noFilterLabel}</span>
      ) : (
        <>
          {selectedFilters.map((filter, i) => (
            <span key={i} className="filter-tag flex cursor-pointer items-center gap-1.5" onClick={() => onRemoveFilter(filter)}>
              {filter.split(":")[1]} <FontAwesomeIcon icon={faTimes} size="xs" />
            </span>
          ))}
          <button className="reset-all-btn" onClick={onClearAll}>
            <FontAwesomeIcon icon={faTrashAlt} /> {clearAllLabel}
          </button>
        </>
      )}
    </div>
  );
};
