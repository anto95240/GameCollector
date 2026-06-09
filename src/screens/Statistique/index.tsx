import "./Statistique.css";

import { faCalendarAlt, faChartBar, faLayerGroup, faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import SectionStatSecondary from "@/components/common/SectionStatSecondary";
import SkeletonText from "@/components/common/Skeleton/SkeletonText";
import HeatmapChart from "@/components/main/Statistique/HeatmapChart";
import InsightsPanel from "@/components/main/Statistique/InsightsPanel";
import PlatformChart from "@/components/main/Statistique/PlatformChart";
import RadarGenreChart from "@/components/main/Statistique/RadarGenreChart";
import StatusFunnelChart from "@/components/main/Statistique/StatusFunnelChart";
import TopGamesWidget from "@/components/main/Statistique/TopGamesWidget";
import YearChart from "@/components/main/Statistique/YearChart";
import { useStatsData } from "@/hooks/domains/dashboard/useStatsData";
import { triggerAchievementCheck } from "@/services/achievementService";
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
    triggerAchievementCheck();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="statistics-page-container fade-in flex flex-col gap-6 p-4 w-full">
        <SkeletonText height="150px" className="rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <SkeletonText height="300px" className="rounded-xl w-full" />
          <SkeletonText height="300px" className="rounded-xl w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page-container">
      <SectionStatSecondary />

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