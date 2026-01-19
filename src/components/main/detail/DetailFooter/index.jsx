import GameCard from "../../../common/GameCard";
import "./DetailFooter.css";

const DetailFooter = () => {
    return (
        <footer className="footer-section">
            <h3 className="footer-title">Récemment consultés</h3>
            <div className="recent-scroll no-scrollbar">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="recent-card">
                        <GameCard variant="dashboard" game={{ name: `Jeu ${i}`, id: i }} />
                    </div>
                ))}
            </div>
        </footer>
    );
};

export default DetailFooter;