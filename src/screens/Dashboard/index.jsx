import './Dashboard.css'

import { useTranslation } from 'react-i18next'

import SectionStatSecondary from '@/components/common/SectionStatSecondary'
import SectionGameCard from '@/components/main/Dashboard/SectionGameCard'
import SectionStatPrimary from '@/components/main/Dashboard/SectionStatPrimary'

function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="dashboard-content">
      {/* SECTION STATS PRINCIPALES */}
      <div className="main-stats-grid">
        {/* BLOC 1 - TOTAL */}
        <SectionStatPrimary t={t} />

        {/* BLOC 2 - SECONDAIRES */}
        <SectionStatSecondary t={t} />
      </div>

      <SectionGameCard t={t} />
    </div>
  )
}

export default HomePage
