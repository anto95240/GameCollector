import "./sectionStatSecondary.css";
import { useDashboard } from "../../../../hooks/useDashboard";
import StatCard from "../StatCard";

const SectionStatSecondary = ({t}) => {
    const { stats } = useDashboard();
    return (
        <div className="secondary-stats-grid flex flex-col gap-3.5">
            <StatCard title={t('dashboard.favorite')} value={stats.favoriteCount} />
            <StatCard title={t('dashboard.platform')} value={stats.platformCount} />
            <StatCard title={t('dashboard.genre')} value={stats.genreCount} />
        </div>
    );
};

export default SectionStatSecondary;