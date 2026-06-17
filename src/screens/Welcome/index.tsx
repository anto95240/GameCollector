import './Welcome.css'

import { faChartPie, faGamepad, faLayerGroup, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { APP_VERSION } from '@/config/constants'
import { readStoredUser } from '@/utils/userStorage'

const WelcomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Si l'utilisateur est déjà connecté, on l'envoie sur le dashboard
    if (readStoredUser()) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Sinon, on déclenche l'animation d'entrée
    setTimeout(() => setIsVisible(true), 100)
  }, [navigate])

  const handleStart = () => {
    localStorage.setItem('last_seen_version', APP_VERSION)
    navigate('/login')
  }

  return (
    <div className={`welcome-container ${isVisible ? 'visible' : ''}`}>
      <div className="welcome-content">
        <h1 className="welcome-title">{t('welcome.title')}</h1>

        <div className="welcome-grid">
          <div className="welcome-card delay-1">
            <div className="welcome-card-icon collection-icon">
              <FontAwesomeIcon icon={faLayerGroup} />
            </div>
            <h2>{t('welcome.collection.title')}</h2>
            <p>{t('welcome.collection.description')}</p>
          </div>

          <div className="welcome-card delay-2">
            <div className="welcome-card-icon stats-icon">
              <FontAwesomeIcon icon={faChartPie} />
            </div>
            <h2>{t('welcome.stats.title')}</h2>
            <p>{t('welcome.stats.description')}</p>
          </div>

          <div className="welcome-card delay-3">
            <div className="welcome-card-icon trophies-icon">
              <FontAwesomeIcon icon={faTrophy} />
            </div>
            <h2>{t('welcome.trophies.title')}</h2>
            <p>{t('welcome.trophies.description')}</p>
          </div>
        </div>

        <button className="welcome-button delay-4" onClick={handleStart}>
          <FontAwesomeIcon icon={faGamepad} className="btn-icon" />
          {t('welcome.startBtn')}
        </button>
      </div>
    </div>
  )
}

export default WelcomePage
