import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faCheck, faUndo } from "@fortawesome/free-solid-svg-icons";
import "./FilterAccordionItem.css"

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
    handleClearCategory
}) => {
    
    // Helpers locaux
    const isSelected = (opt) => selectedFilters.includes(`${category.label}: ${opt}`);
    const optionsToShow = showAllState ? category.options : category.options.slice(0, MAX_VISIBLE_OPTIONS);
    const hasMore = category.options.length > MAX_VISIBLE_OPTIONS;
    
    // Vérifie si au moins un filtre de cette catégorie est actif
    const isActiveCategory = selectedFilters.some(f => f.startsWith(`${category.label}:`));

    return (
        <div className="accordion-item">
            <button className={`accordion-header flex justify-between items-center w-full cursor-pointer ${isExpanded ? 'active' : ''}`} onClick={onToggle}>
                <div className="header-left flex items-center gap-3">
                    <span className="icon-cat">
                        <FontAwesomeIcon icon={icon} fixedWidth />
                    </span>
                    <span className="cat-label">{category.label}</span>
                </div>
                <FontAwesomeIcon 
                    icon={faChevronDown} 
                    className={`chevron ${isExpanded ? 'rotate' : ''}`} 
                    size="xs" 
                />
            </button>

            {isExpanded && (
                <div className="accordion-content flex flex-col">
                    <div className="filter-options-scroll flex flex-col gap-1.5">
                        {optionsToShow.map((opt, idx) => {
                            const selected = isSelected(opt);
                            return (
                                <div key={idx} className={`filter-option-item flex items-center ${selected ? 'selected' : ''}`}>
                                    <label className="checkbox-container flex items-center cursor-pointer gap-2.5">
                                        <input 
                                            type="checkbox" 
                                            checked={selected} 
                                            onChange={() => {
                                                const tag = `${category.label}: ${opt}`;
                                                selected ? onRemoveFilter(tag) : onSelectFilter(category.label, opt);
                                            }}
                                        />
                                        <span className="checkmark">
                                            <FontAwesomeIcon icon={faCheck} className="check-icon" />
                                        </span>
                                        <span className="option-label">{opt}</span>
                                        <span className="option-count">{getOptionCount(category.label, opt)}</span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="category-footer flex justify-between items-center gap-2.5">
                        {hasMore ? (
                            <button className="toggle-view-btn cursor-pointer flex items-center gap-1.5" onClick={() => toggleShowAll(category.id)}>
                                {showAllState ? (
                                    <> <FontAwesomeIcon icon={faChevronUp}/> Réduire </>
                                ) : (
                                    <> <FontAwesomeIcon icon={faChevronDown}/> Voir tous </>
                                )}
                            </button>
                        ) : (
                            <span></span> /* Spacer */
                        )}
                        
                        {isActiveCategory && (
                            <button className="clear-cat-btn" onClick={() => handleClearCategory(category.label)}>
                                <FontAwesomeIcon icon={faUndo} style={{ marginRight: 4 }}/> 
                                Désélectionner
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default FilterAccordionItem;