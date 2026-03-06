import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faCheck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";
import "./FilterAccordionItem.css";
import { useTranslation } from "react-i18next";

const MAX_VISIBLE_OPTIONS = 5;

const FilterAccordionItem = ({
  category,
  isExpanded,
  onToggle,
  selectedFilters,
  onSelectFilter,
  onRemoveFilter,
  icon,
  getOptionCount,
  showAllState,
  toggleShowAll,
  handleClearCategory,
}) => {
  const { t } = useTranslation();
  const isSelected = (opt) =>
    selectedFilters.includes(`${category.label}: ${opt}`);
  const optionsToShow = showAllState
    ? category.options
    : category.options.slice(0, MAX_VISIBLE_OPTIONS);
  const hasMore = category.options.length > MAX_VISIBLE_OPTIONS;

  const isActiveCategory = selectedFilters.some((f) =>
    f.startsWith(`${category.label}:`),
  );

  return (
    <div className="accordion-item">
      <button
        className={`accordion-header ${isExpanded ? "active" : ""}`}
        onClick={onToggle}
      >
        <div className="header-left">
          <span className="icon-cat">
            <FontAwesomeIcon icon={icon} fixedWidth />
          </span>
          <span className="cat-label">{category.label}</span>
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`chevron ${isExpanded ? "rotate" : ""}`}
          size="xs"
        />
      </button>

      {isExpanded && (
        <div className="accordion-content">
          <div className="filter-options-scroll">
            {optionsToShow.map((opt, idx) => {
              const selected = isSelected(opt);
              return (
                <div
                  key={idx}
                  className={`filter-option-item ${selected ? "selected" : ""}`}
                >
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const tag = `${category.label}: ${opt}`;
                        selected
                          ? onRemoveFilter(tag)
                          : onSelectFilter(category.label, opt);
                      }}
                    />
                    <span className="checkmark">
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    </span>
                    <span className="option-label">{opt}</span>
                    <span className="option-count">
                      {getOptionCount(category.label, opt)}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="category-footer">
            {hasMore ? (
              <button
                className="toggle-view-btn"
                onClick={() => toggleShowAll(category.id)}
              >
                {showAllState ? (
                  <>
                    {" "}
                    <FontAwesomeIcon icon={faChevronUp} /> Réduire{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <FontAwesomeIcon icon={faChevronDown} /> Voir tous{" "}
                  </>
                )}
              </button>
            ) : (
              <span></span>
            )}

            {isActiveCategory && (
              <button
                className="clear-cat-btn"
                onClick={() => handleClearCategory(category.label)}
              >
                <FontAwesomeIcon icon={faUndo} />
                {t("gameList.filters.deselect")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default FilterAccordionItem;
