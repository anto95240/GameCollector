import { faGamepad, faClock, faTrophy, faLayerGroup, faCalendarAlt, faCode, faQuoteLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./DetailInfoGrid.css";
import StatItem from "../../../secondary/Detail/StatItem";

const DetailInfoGrid = ({ game }) => {
    return (
        <div className="content-grid">
            {/* Colonne Gauche : Narration */}
            <div className="narrative-col">
                <div className="bento-card">
                    <h3>Description</h3>
                    <p className="description-text">{game.description}</p>
                </div>
                
                <div className="bento-card note-card">
                    <h3><FontAwesomeIcon icon={faQuoteLeft} className="note-icon-title" /> Mes Commentaires</h3>
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
                        <StatItem icon={faLayerGroup} label="Genre" value={game.genre} />
                        <StatItem icon={faCalendarAlt} label="Année" value={game.year} />
                        {game.developer && (
                             <StatItem icon={faCode} label="Développeur" value={game.developer} />
                        )}
                        <StatItem icon={faGamepad} label="Plateforme" value={game.platform} />
                        <StatItem icon={faClock} label="Temps de jeu" value={game.playtime} />
                        <StatItem icon={faTrophy} label="Succès" value={game.achievements} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailInfoGrid;