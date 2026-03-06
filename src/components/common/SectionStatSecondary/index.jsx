import "./SectionStatSecondary.css";
import { useDashboard } from "../../../hooks/components/useDashboard";
import StatCard from "../StatCard";
import { useLocation } from "react-router";

const SectionStatSecondary = ({ t }) => {
  const { stats } = useDashboard();
  const location = useLocation();

  const isStatisticsPage = location.pathname === "/statistics";

  return (
    <div
      className={`secondary-stats-grid ${isStatisticsPage ? "statistics-page" : "default-page"}`}
    >
      <StatCard title={t("dashboard.favorite")} value={stats.favoriteCount} />
      <StatCard title={t("dashboard.platform")} value={stats.platformCount} />
      <StatCard title={t("dashboard.genre")} value={stats.genreCount} />

      {isStatisticsPage && (
        <StatCard title={t("dashboard.totalGame")} value={stats.totalGames} />
      )}
    </div>
  );
};

export default SectionStatSecondary;
