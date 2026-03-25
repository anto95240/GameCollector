import SectionStatSecondary from "../../components/common/SectionStatSecondary";
import PlatformChart from "../../components/main/Statistique/PlatformChart";
import YearChart from "../../components/main/Statistique/YearChart";
import { useTranslation } from "react-i18next";
import { useStatsData } from "../../hooks/dashboard/useStatsData";

import "./Statistique.css";

function StatistiquePage() {
  const { t } = useTranslation();
  
  const { games, metadata, isLoading } = useStatsData();

  if (isLoading) {
    return (
      <div className="statistics-page-container flex items-center justify-center">
        <p className="loading-text mt-10">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="statistics-page-container">
      <SectionStatSecondary t={t} />

      <div className="charts-grid mx-auto">
        <div className="console-entry-anim">
          <PlatformChart games={games} metadata={metadata} />
        </div>

        <div className="console-entry-anim">
          <YearChart games={games} metadata={metadata} />
        </div>
      </div>
    </div>
  );
}

export default StatistiquePage;