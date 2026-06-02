import "./Statistique.css";

import { faCalendarAlt, faChartBar, faLayerGroup, faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import SectionStatSecondary from "@/components/common/SectionStatSecondary";
import HeatmapChart from "@/components/main/Statistique/HeatmapChart";
import InsightsPanel from "@/components/main/Statistique/InsightsPanel";
import PlatformChart from "@/components/main/Statistique/PlatformChart";
import RadarGenreChart from "@/components/main/Statistique/RadarGenreChart";
import StatusFunnelChart from "@/components/main/Statistique/StatusFunnelChart";
import TopGamesWidget from "@/components/main/Statistique/TopGamesWidget";
import YearChart from "@/components/main/Statistique/YearChart";
import { useStatsData } from "@/hooks/dashboard/useStatsData";
import { mergeStoredUser } from "@/utils/userStorage";

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: faChartBar },
  { id: "genres", label: "Genres & Plateformes", icon: faLayerGroup },
  { id: "activity", label: "Activité", icon: faCalendarAlt },
  { id: "rankings", label: "Classements", icon: faStar }
];

function StatistiquePage() {
  const { t } = useTranslation();
  // Utilisation de stats au lieu de games
  const { stats, metadata, isLoading } = useStatsData();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    mergeStoredUser({ viewedStats: true });
    window.dispatchEvent(new Event("checkAchievements"));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="statistics-page-container flex items-center justify-center">
        <div className="stats-loading">
          <div className="stats-loading-ring" />
          <p>Calcul des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page-container">
      <SectionStatSecondary t={t} />

      <div className="stats-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`stats-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <FontAwesomeIcon className="tab-icon" icon={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="stats-tab-content" key={activeTab}>
        {activeTab === "overview" && (
          <div className="stats-section fade-in-tab">
            <InsightsPanel stats={stats} metadata={metadata} />
            <div className="stats-two-col mt-stats">
              <StatusFunnelChart stats={stats} metadata={metadata} />
              <PlatformChart stats={stats} metadata={metadata} />
            </div>
          </div>
        )}

        {activeTab === "genres" && (
          <div className="stats-section fade-in-tab">
            <div className="stats-two-col">
              <RadarGenreChart stats={stats} metadata={metadata} />
              <PlatformChart stats={stats} metadata={metadata} />
            </div>
            <div className="mt-stats">
              <YearChart stats={stats} />
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="stats-section fade-in-tab">
            <HeatmapChart stats={stats} />
            <div className="mt-stats">
              <YearChart stats={stats} />
            </div>
          </div>
        )}

        {activeTab === "rankings" && (
          <div className="stats-section fade-in-tab">
            <TopGamesWidget stats={stats} metadata={metadata} />
            <div className="mt-stats">
              <StatusFunnelChart stats={stats} metadata={metadata} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default StatistiquePage;