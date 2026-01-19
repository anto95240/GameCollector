import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faEllipsisVertical, faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router"; // Import nécessaire
import "./gameCard.css";

const GameCard = ({ 
    game, 
    variant = "list", 
    index, 
    activeMenuIndex, 
    onToggleMenu, 
    t,
    onDeleteRequest
}) => {
    const navigate = useNavigate();

    const createSlug = (name) => {
        return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    };

    const handleCardClick = () => {
        const name = typeof game === 'string' ? game : game.name;
        if (name) {
            navigate(`/game/${createSlug(name)}`);
        }
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation(); 
        onToggleMenu(null, e); 
        if (onDeleteRequest) onDeleteRequest(game);
    };

    // VARIANT: ADD
    if (variant === "add") {
        return (
            <div className="game-card card-add">
                <FontAwesomeIcon icon={faPlus} className="plus-icon" />
                <span>{t ? t('gameList.addGame') : "Ajouter"}</span>
            </div>
        );
    }

    // VARIANT: DASHBOARD (Ajout du onClick)
    if (variant === "dashboard") {
        const gameName = typeof game === 'string' ? game : game.name;
        
        return (
            <div 
                className="game-card card-dashboard console-card-hover cursor-pointer" 
                onClick={handleCardClick}
            >
                <p className="game-name-dashboard">{gameName}</p>
            </div>
        );
    }

    // VARIANT: LIST (Ajout du onClick)
    return (
        <div 
            className="game-card card-list console-card-hover cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="card-top">
                <FontAwesomeIcon 
                    icon={faHeart} 
                    className="icon-heart"
                    style={{ opacity: game.isFavorite ? 1 : 0.5 }} 
                    onClick={(e) => e.stopPropagation()} // Stop propagation pour ne pas ouvrir le détail
                />
                <button 
                    className="btn-dots" 
                    onClick={(e) => {
                        e.stopPropagation(); // Stop propagation
                        onToggleMenu(index, e);
                    }}
                >
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                </button>
            </div>

            {activeMenuIndex === index && (
                <div className="context-menu flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button className="ctx-item">
                        <FontAwesomeIcon icon={faPen} /> 
                        <span>{t('gameList.actions.edit')}</span>
                    </button>
                    <button className="ctx-item delete" onClick={handleDeleteClick}>
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