import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faEllipsisVertical, faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";
import "./gameCard.css";

const GameCard = ({ 
    game, 
    variant = "list", 
    index, 
    activeMenuIndex, 
    onToggleMenu, 
    t,
    onDeleteRequest,
    onClick,
    className = "" // Nouvelle prop pour injecter des classes (ex: .deleting)
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

    const handleEditClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate("/game/add-edit-game", { state: { game: game } });
        if (onToggleMenu) onToggleMenu(null, e);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation(); 
        onToggleMenu(null, e); 
        if (onDeleteRequest) onDeleteRequest(game);
    };

    // VARIANT: ADD
    if (variant === "add") {
        return (
            <div className={`game-card card-add cursor-pointer ${className}`} onClick={onClick}>
                <FontAwesomeIcon icon={faPlus} className="plus-icon" />
                <span>{t ? t('gameList.addGame') : "Ajouter"}</span>
            </div>
        );
    }

    // VARIANT: DASHBOARD
    if (variant === "dashboard") {
        const gameName = typeof game === 'string' ? game : game.name;
        
        return (
            <div 
                className={`game-card card-dashboard console-card-hover cursor-pointer ${className}`}
                onClick={handleCardClick}
            >
                <p className="game-name-dashboard">{gameName}</p>
            </div>
        );
    }

    // VARIANT: LIST
    return (
        <div 
            // Ajout de ${className} à la fin pour permettre l'animation .deleting
            className={`game-card card-list console-card-hover cursor-pointer ${className}`}
            onClick={handleCardClick}
        >
            <div className="card-top">
                <FontAwesomeIcon 
                    icon={faHeart} 
                    className={`icon-heart ${game.isFavorite ? 'favorite' : ''}`}
                    onClick={(e) => e.stopPropagation()} 
                />
                <button 
                    className="btn-dots" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(index, e);
                    }}
                >
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                </button>
            </div>

            {activeMenuIndex === index && (
                <div className="context-menu flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button className="ctx-item" onClick={handleEditClick}>
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