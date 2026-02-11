import "./SectionStatPrimary.css";
import { useDashboard } from "../../../../hooks/components/useDashboard";

const GameCard = ({t}) => {
    const { stats } = useDashboard();
    return (
        <div className="main-total-card">
            <h1 className="main-title">{t('dashboard.title')}</h1>

            <div className="total-info">
                <p className="total-label">{t('dashboard.totalGame')}</p>
                <p className="total-value">{stats.totalGames}</p>
            </div>
        </div>
    );
};

export default GameCard;