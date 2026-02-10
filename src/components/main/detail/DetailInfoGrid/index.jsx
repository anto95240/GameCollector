import { faGamepad, faClock, faTrophy, faLayerGroup, faCalendarAlt, faCode, faQuoteLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./DetailInfoGrid.css";
import StatItem from "../../../secondary/Detail/StatItem";
import { useTranslation } from "react-i18next";

const DetailInfoGrid = ({ game }) => {
    const { t } = useTranslation();
    return (
        <div className="content-grid">
            {/* Colonne Gauche : Narration */}
            <div className="narrative-col">
                <div className="bento-card">
                    <h3>{t('gameForm.sections.description')}</h3>
                    <p className="description-text">{game.description}</p>
                </div>
                
                <div className="bento-card note-card">
                    <h3><FontAwesomeIcon icon={faQuoteLeft} className="note-icon-title" /> {t('gameForm.fields.comment')}</h3>
                    <div className="user-note-container">
                        <p className="user-note-text">"{game.userNotes}"</p>
                    </div>
                </div>
            </div>

            {/* Colonne Droite : Données Techniques */}
            <div className="data-col">
                <div className="bento-card">
                    <h3>Informations</h3>
                    <div className="stats-list">
                        <StatItem icon={faLayerGroup} label={t('gameForm.fields.genre')} value={game.genre} />
                        <StatItem icon={faCalendarAlt} label={t('gameForm.fields.releaseYear')} value={game.year} />
                        {game.developer && (
                             <StatItem icon={faCode} label={t('gameForm.fields.developer')} value={game.developer} />
                        )}
                        <StatItem icon={faGamepad} label={t('gameForm.fields.platform')} value={game.platform} />
                        <StatItem icon={faClock} label={t('gameForm.fields.playtime')} value={game.playtime} />
                        <StatItem icon={faTrophy} label={t('gameForm.fields.achievements')} value={game.achievements} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailInfoGrid;