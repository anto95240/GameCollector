import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGamepad, faClock, faTrophy, faLayerGroup, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import "./DetailInfoGrid.css";

const DetailInfoGrid = ({ game }) => {
    return (
        <div className="content-grid">
            {/* Colonne Gauche : Narration */}
            <div className="narrative-col">
                <div className="bento-card">
                    <h3>Synopsis</h3>
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
                        <StatItem icon={faCalendarAlt} label="Année" value={game.year} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ icon, label, value }) => (
    <div className="stat-item">
        <span className="stat-label"><FontAwesomeIcon icon={icon} /> {label}</span>
        <span className="stat-value">{value}</span>
    </div>
);

export default DetailInfoGrid;