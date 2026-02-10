import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faCalendarAlt, faHeart, faCheck, faGamepad, faArchive } from "@fortawesome/free-solid-svg-icons";
import "./DetailHero.css";
import { useTranslation } from "react-i18next";

const DetailHero = ({ game }) => {
    const { t } = useTranslation();
    return (
        <section className="hero-section">
            <img src={game.image} alt={game.name} className="hero-cover" />
            
            <div className="hero-content">
                <div className="tags-row">
                    {game.tags.map((tag, i) => <span key={i} className="tag-pill">{tag}</span>)}
                </div>
                
                <h1 className="detail-title">{game.name}</h1>
                
                <div className="meta-bar">
                    <div className="meta-item">
                        <span className="rating-stars">
                            {[...Array(5)].map((_, i) => <FontAwesomeIcon key={i} icon={faStar} />)}
                        </span>
                        <strong>{game.rating}/5</strong>
                    </div>
                    <div className="meta-item">
                        <FontAwesomeIcon icon={faCalendarAlt} /> {t('gameDetail.addedToCollection')} <strong>{game.addedDate}</strong>
                    </div>
                </div>

                <div className="hero-actions">
                    <button className={`btn-secondary-action ${game.isOwned ? 'owned' : ''}`}>
                        <FontAwesomeIcon icon={faArchive} /> {game.isOwned ? "Possédé" : "Non possédé"}
                    </button>

                    <button className={`btn-secondary-action ${game.isFavorite ? 'active' : ''}`}>
                        <FontAwesomeIcon icon={faHeart} /> {game.isFavorite ? t('common.favorite') : t('common.favorite')}
                    </button>
                    
                    <button className="btn-secondary-action">
                        <FontAwesomeIcon icon={game.status === 'Terminé' ? faCheck : faGamepad} /> 
                        {game.status}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default DetailHero;