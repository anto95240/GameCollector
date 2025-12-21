import "./sectionStatPrimary.css";
import { useDashboard } from "../../../../hooks/useDashboard";

const GameCard = ({t}) => {
    const { stats } = useDashboard();
    return (
        <div className="main-total-card w-full">
            <h1 className="main-title">{t('dashboard.title')}</h1>

            <div className="total-info">
                <p className="total-label">{t('dashboard.totalGame')}</p>
                <p className="total-value">{stats.totalGames}</p>
            </div>
        </div>
    );
};

export default GameCard;