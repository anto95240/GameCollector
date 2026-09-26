import './Settings.css'

import { faPalette } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

const Settings = () => {
  const { t } = useTranslation()

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="title-section">
          <FontAwesomeIcon icon={faPalette} /> Paramètres d'apparence
        </h1>
        <p className="subtitle-section">
          Les paramètres de thème ont été déplacés vers la galerie de thèmes.
        </p>
      </div>
      <div className="settings-content">
        <p>Veuillez utiliser la nouvelle interface pour changer de thème.</p>
      </div>
    </div>
  )
}

export default Settings
