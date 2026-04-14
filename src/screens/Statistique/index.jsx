import SectionStatSecondary from "../../components/common/SectionStatSecondary";
import PlatformChart from "../../components/main/Statistique/PlatformChart";
import YearChart from "../../components/main/Statistique/YearChart";
import { useTranslation } from "react-i18next";
import { useStatsData } from "../../hooks/dashboard/useStatsData";
import { useEffect } from "react";

import "./Statistique.css";

function StatistiquePage() {
  const { t } = useTranslation();
  
  // 1 SEUL appel réseau pour toute la page
  const { games, metadata, isLoading } = useStatsData();

  useEffect(() => {
    // Track que l'utilisateur a consulté les statistiques
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    user.viewedStats = true;
    localStorage.setItem("user", JSON.stringify(user));
    
    // Déclencher la vérification des achievements
    window.dispatchEvent(new Event('checkAchievements'));
  }, []);

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
          {/* On passe les données pré-chargées au graphique */}
          <PlatformChart games={games} metadata={metadata} />
        </div>

        <div className="console-entry-anim">
          {/* On passe les données pré-chargées au graphique */}
          <YearChart games={games} metadata={metadata} />
        </div>
      </div>
    </div>
  );
}

export default StatistiquePage;