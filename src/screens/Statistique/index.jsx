import SectionStatSecondary from "../../components/common/SectionStatSecondary";
import PlatformChart from "../../components/main/Statistique/PlatformChart";
import YearChart from "../../components/main/Statistique/YearChart";
import { useTranslation } from "react-i18next";

import "./Statistique.css";

function StatistiquePage() {
  const { t } = useTranslation();

  return (
    <div className="statistics-page-container">
      <SectionStatSecondary t={t} />

      <div className="charts-grid mx-auto">
        <div className="console-entry-anim">
          <PlatformChart />
        </div>

        <div className="console-entry-anim">
          <YearChart />
        </div>
      </div>
    </div>
  );
}

export default StatistiquePage;
