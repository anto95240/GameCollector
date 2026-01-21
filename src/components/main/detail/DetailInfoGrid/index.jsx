import { faGamepad, faClock, faTrophy, faLayerGroup, faCalendarAlt, faCode } from "@fortawesome/free-solid-svg-icons";
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
                
                <div className="bento-card">
                    <h3>Mes Notes</h3>
                    <div className="user-note">
                        "{game.userNotes}"
                    </div>
                </div>
            </div>

            {/* Colonne Droite : Données Techniques */}
            <div className="data-col">
                <div className="bento-card">
                    <h3>Informations</h3>
                    <div className="stats-list">
                        <StatItem icon={faGamepad} label="Plateforme" value={game.platform} />
                        <StatItem icon={faClock} label="Temps" value={game.playtime} />
                        <StatItem icon={faTrophy} label="Succès" value={game.achievements} />
                        <StatItem icon={faLayerGroup} label="Genre" value={game.genre} />
                        <StatItem icon={faCalendarAlt} label="Année de sortie" value={game.year} />
                        {game.developer && (
                             <StatItem icon={faCode} label="Développeur" value={game.developer} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailInfoGrid;