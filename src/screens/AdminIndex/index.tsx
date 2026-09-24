import './AdminIndex.css'

import { faPalette, faVial } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { Link } from 'react-router'

export default function AdminIndex() {
  return (
    <div className="admin-index-container">
      <header className="admin-header">
        <h1>⚙️ Administration & Dev</h1>
        <p>Espace réservé aux tests et outils de développement.</p>
      </header>

      <div className="admin-grid">
        <Link to="/admin/test-theme" className="admin-card">
          <div className="admin-card-icon">
            <FontAwesomeIcon icon={faVial} />
          </div>
          <h2>Sandbox Thèmes</h2>
          <p>Banc d'essai pour simuler l'algorithme de déblocage des thèmes (IGDB).</p>
        </Link>

        <Link to="/admin/theme-preview" className="admin-card">
          <div className="admin-card-icon">
            <FontAwesomeIcon icon={faPalette} />
          </div>
          <h2>Preview Visuelle</h2>
          <p>
            Galerie pour tester et prévisualiser instantanément le rendu CSS de tous les thèmes.
          </p>
        </Link>

        <Link to="/admin/theme-welcome" className="admin-card">
          <div className="admin-card-icon">
            <span>🎬</span>
          </div>
          <h2>Animations de Bienvenue</h2>
          <p>
            Sandbox pour tester les écrans d'accueil immersifs (Dune, Films, etc.) lors de
            l'équipement d'un thème.
          </p>
        </Link>

        <Link to="/admin/ds-games" className="admin-card">
          <div className="admin-card-icon">
            <span>🎮</span>
          </div>
          <h2>Gestionnaire Nintendo DS</h2>
          <p>
            Explorer, rechercher et marquer les jeux Nintendo DS comme Joués/Non joués avec
            intégration IGDB.
          </p>
        </Link>

        <div
          className="admin-card"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            // Test aléatoire
            if (Math.random() > 0.5) {
              window.dispatchEvent(
                new CustomEvent('achievementUnlocked', {
                  detail: {
                    idName: 'test',
                    title: 'Trophée Test',
                    description: 'Ceci est un test visuel',
                    icon: '🏆',
                  },
                })
              )
            } else {
              window.dispatchEvent(
                new CustomEvent('themeUnlocked', {
                  detail: { name: 'Thème Cyber', colors: ['#ff0055', '#00ffff'] },
                })
              )
            }
          }}
        >
          <div className="admin-card-icon">
            <FontAwesomeIcon icon={faVial} />
          </div>
          <h2>🧪 Test Notifications</h2>
          <p>
            Cliquez ici pour déclencher une notification (Trophée ou Thème) et tester le rendu
            visuel !
          </p>
        </div>
      </div>
    </div>
  )
}
