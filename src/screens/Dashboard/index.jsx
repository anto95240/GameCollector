import SectionGameCard from "../../components/secondary/dashboard/SectionGameCard";
import SectionStatSecondary from "../../components/secondary/dashboard/SectionStatSecondary";
import SectionStatPrimary from "../../components/secondary/dashboard/SectionStatPrimary";
import { useTranslation } from "react-i18next";

import "./dashboard.css";

function HomePage() {

    const { t } = useTranslation();

    return (
        <div className="dashboard-content p-4 flex flex-col">

            {/* SECTION STATS PRINCIPALES */}
            <div className="main-stats-grid flex flex-col gap-5 mb-8">
                
                {/* BLOC 1 - TOTAL */}
                <SectionStatPrimary t={t} />
                
                {/* BLOC 2 - SECONDAIRES */}
                <SectionStatSecondary t={t} />

            </div>

            <SectionGameCard t={t} />

        </div>
    );
}

export default HomePage;