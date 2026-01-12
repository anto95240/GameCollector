import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faPlus } from "@fortawesome/free-solid-svg-icons";
import "./listeHeader.css";

const ListeHeader = ({ searchTerm, onSearchChange, onToggleFilter, t, }) => {
    return (
        <div className="liste-header flex items-center justify-center mx-auto">
            {/* Barre de recherche */}
            <div className="search-wrapper flex items-center gap-5">
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder={t('gameList.searchPlaceholder')} 
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
                <p className="nb-jeux w-auto mx-auto">nb jeux</p>

            {/* Boutons d'action */}
            <div className="header-buttons flex gap-5">
                <button 
                    className="btn-filter flex items-center justify-center gap-2.5 cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); onToggleFilter(); }}
                >
                    <FontAwesomeIcon icon={faFilter} /> 
                    <span>{t('gameList.filters.title')}</span>
                </button>
                
                <button className="btn-add flex items-center justify-center gap-2.5 cursor-pointer">
                    <FontAwesomeIcon icon={faPlus} /> 
                    <span>{t('gameList.addGame')}</span>
                </button>
            </div>
        </div>
    );
};

export default ListeHeader;