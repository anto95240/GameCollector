import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faEllipsisVertical, faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import "./gameCard.css";

const GameCard = ({ 
    game, 
    variant = "list", // "list" | "dashboard" | "add"
    index, 
    activeMenuIndex, 
    onToggleMenu, 
    t 
}) => {

    // --- VARIANT: ADD (Bouton Ajouter) ---
    if (variant === "add") {
        return (
            <div className="game-card card-add">
                <FontAwesomeIcon icon={faPlus} className="plus-icon" />
                <span>{t ? t('gameList.addGame') : "Ajouter"}</span>
            </div>
        );
    }

    // --- VARIANT: DASHBOARD (Simple) ---
    if (variant === "dashboard") {
        // Dans le dashboard, 'game' est souvent juste une string (nom) ou un objet simple
        const gameName = typeof game === 'string' ? game : game.name;
        
        return (
            <div className="game-card card-dashboard">
                <p className="game-name-dashboard">{gameName}</p>
            </div>
        );
    }

    // --- VARIANT: LIST (Standard avec actions) ---
    return (
        <div className="game-card card-list">
            <div className="card-top">
                <FontAwesomeIcon 
                    icon={faHeart} 
                    className="icon-heart"
                    style={{ opacity: game.isFavorite ? 1 : 0.5 }} 
                />
                <button className="btn-dots" onClick={(e) => onToggleMenu(index, e)}>
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                </button>
            </div>

            {/* Menu Contextuel */}
            {activeMenuIndex === index && (
                <div className="context-menu flex flex-col gap-1.5">
                    <button className="ctx-item">
                        <FontAwesomeIcon icon={faPen} /> 
                        <span>{t('gameList.actions.edit')}</span>
                    </button>
                    <button className="ctx-item delete">
                        <FontAwesomeIcon icon={faTrash} /> 
                        <span>{t('gameList.actions.delete')}</span>
                    </button>
                </div>
            )}

            <div className="card-spacer"></div>
            <p className="game-title">{game.name}</p>
        </div>
    );
};

export default GameCard;