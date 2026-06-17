import './Welcome.css'

import { faChartPie, faGamepad, faLayerGroup, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { APP_VERSION } from '@/config/constants'
import { readStoredUser } from '@/utils/userStorage'

const WelcomePage = () => {
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
        <h1 className="welcome-title">
          Bienvenue dans votre nouvelle Base de Données personnelle !
        </h1>

        <div className="welcome-grid">
          <div className="welcome-card delay-1">
            <div className="welcome-card-icon collection-icon">
              <FontAwesomeIcon icon={faLayerGroup} />
            </div>
            <h2>Collection infinie</h2>
            <p>Ajout, classement, filtres, fuzzy search. Retrouvez vos jeux en un clin d'œil.</p>
          </div>

          <div className="welcome-card delay-2">
            <div className="welcome-card-icon stats-icon">
              <FontAwesomeIcon icon={faChartPie} />
            </div>
            <h2>Statistiques</h2>
            <p>Graphiques et évolution de la ludothèque. Analysez vos habitudes de jeu.</p>
          </div>

          <div className="welcome-card delay-3">
            <div className="welcome-card-icon trophies-icon">
              <FontAwesomeIcon icon={faTrophy} />
            </div>
            <h2>Chasseur de Trophées</h2>
            <p>Défis et succès uniques. Progressez et complétez votre profil.</p>
          </div>
        </div>

        <button className="welcome-button delay-4" onClick={handleStart}>
          <FontAwesomeIcon icon={faGamepad} className="btn-icon" />
          Commencer ma collection — Press Start
        </button>
      </div>
    </div>
  )
}

export default WelcomePage
