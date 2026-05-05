import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faLayerGroup, faCalendarAlt, faStar } from "@fortawesome/free-solid-svg-icons";
import SectionStatSecondary from "../../components/common/SectionStatSecondary";
import PlatformChart from "../../components/main/Statistique/PlatformChart";
import YearChart from "../../components/main/Statistique/YearChart";
import InsightsPanel from "../../components/main/Statistique/InsightsPanel";
import RadarGenreChart from "../../components/main/Statistique/RadarGenreChart";
import HeatmapChart from "../../components/main/Statistique/HeatmapChart";
import TopGamesWidget from "../../components/main/Statistique/TopGamesWidget";
import StatusFunnelChart from "../../components/main/Statistique/StatusFunnelChart";
import { useStatsData } from "../../hooks/dashboard/useStatsData";
import "./Statistique.css";

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: faChartBar },
  { id: "genres", label: "Genres & Plateformes", icon: faLayerGroup },
  { id: "activity", label: "Activité", icon: faCalendarAlt },
  { id: "rankings", label: "Classements", icon: faStar },
];

function StatistiquePage() {
  const { t } = useTranslation();
  const { games, metadata, isLoading } = useStatsData();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    user.viewedStats = true;
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("checkAchievements"));
  }, []);

  if (isLoading) {
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
      {/* Summary KPIs */}
      <SectionStatSecondary t={t} />

      {/* Tab navigation */}
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

      {/* Tab content */}
      <div className="stats-tab-content" key={activeTab}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="stats-section fade-in-tab">
            <InsightsPanel games={games} metadata={metadata} />
            <div className="stats-two-col mt-stats">
              <StatusFunnelChart games={games} metadata={metadata} />
              <PlatformChart games={games} metadata={metadata} />
            </div>
          </div>
        )}

        {/* ── GENRES & PLATFORMS ── */}
        {activeTab === "genres" && (
          <div className="stats-section fade-in-tab">
            <div className="stats-two-col">
              <RadarGenreChart games={games} metadata={metadata} />
              <PlatformChart games={games} metadata={metadata} />
            </div>
            <div className="mt-stats">
              <YearChart games={games} metadata={metadata} />
            </div>
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && (
          <div className="stats-section fade-in-tab">
            <HeatmapChart games={games} />
            <div className="mt-stats">
              <YearChart games={games} metadata={metadata} />
            </div>
          </div>
        )}

        {/* ── RANKINGS ── */}
        {activeTab === "rankings" && (
          <div className="stats-section fade-in-tab">
            <TopGamesWidget games={games} metadata={metadata} />
            <div className="mt-stats">
              <StatusFunnelChart games={games} metadata={metadata} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatistiquePage;