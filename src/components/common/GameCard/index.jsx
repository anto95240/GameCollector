import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faEllipsisVertical, faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router"; // Utilisation de react-router-dom
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
    className = "",
    isActive = false // Prop pour l'état dynamique mobile
}) => {
    const navigate = useNavigate();

    const createSlug = (name) => {
        return name?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || "";
    };

    const handleCardClick = (e) => {
        // Empêcher la redirection si on clique sur le menu ou les boutons d'action
        if (e.target.closest('.btn-dots') || e.target.closest('.context-menu') || e.target.closest('.icon-heart')) {
            return;
        }

        if (variant === "add") {
            if (onClick) onClick();
            return;
        }

        const name = typeof game === 'string' ? game : game?.name;
        if (name) {
            navigate(`/game/${createSlug(name)}`);
        }
    };

    if (variant === "add") {
        return (
            <div 
                className={`game-card card-add cursor-pointer ${className}`} 
                onClick={handleCardClick}
            >
                <div className="card-add-content">
                    <FontAwesomeIcon icon={faPlus} className="plus-icon" />
                    <span>{t ? t('gameList.addGame') : "Ajouter"}</span>
                </div>
            </div>
        );
    }

    const isListVariant = variant === "list";
    const gameName = typeof game === 'string' ? game : game.name;
    const cardStyle = game?.image ? { backgroundImage: `url(${game.image})` } : {};

    return (
        <div 
            className={`game-card card-${variant} ${isActive ? 'active-mobile' : ''} cursor-pointer ${className}`}
            style={cardStyle}
            onClick={handleCardClick}
            data-id={game.id || index} // Nécessaire pour l'observer
        >
            <div className="card-overlay"></div>

            {isListVariant && (
                <div className="card-top">
                    <FontAwesomeIcon 
                        icon={faHeart} 
                        className={`icon-heart ${game.isFavorite ? 'favorite' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            // Logique favori
                        }} 
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
            )}

            {isListVariant && activeMenuIndex === index && (
                <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                    <button className="ctx-item" onClick={(e) => {
                        e.stopPropagation();
                        navigate("/game/add-edit-game", { state: { game } });
                    }}>
                        <FontAwesomeIcon icon={faPen} /> <span>{t('gameList.actions.edit')}</span>
                    </button>
                    <button className="ctx-item delete" onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(game);
                    }}>
                        <FontAwesomeIcon icon={faTrash} /> <span>{t('gameList.actions.delete')}</span>
                    </button>
                </div>
            )}

            <p className={`game-title ${variant === 'dashboard' ? 'game-name-dashboard' : ''}`}>
                {gameName}
            </p>
        </div>
    );
};

export default GameCard;