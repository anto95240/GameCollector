import './Settings.css'

import { faPalette, faRedo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

import { PRESETS, useTheme } from '@/context/ThemeContext'

const Settings = () => {
  const { t } = useTranslation()
  const { activePreset, setPreset, customAccentColor, setCustomAccentColor } = useTheme()

  const seasonalThemes = [
    'halloween',
    'christmas',
    'spring',
    'easter',
    'summer',
    'winter',
    'autumn',
    'chandeleur',
    'epiphanie',
  ]
  const isSeasonal = seasonalThemes.includes(activePreset)

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAccentColor(e.target.value)
  }

  const resetCustomColor = () => {
    setCustomAccentColor(null)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="title-section">
          <FontAwesomeIcon icon={faPalette} /> Paramètres d'apparence
        </h1>
        <p className="subtitle-section">Personnalisez le thème et les couleurs de l'application.</p>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h2>Thèmes classiques</h2>
          <div className="presets-grid">
            {Object.entries(PRESETS)
              .filter(
                ([key]) =>
                  ![
                    'halloween',
                    'christmas',
                    'spring',
                    'easter',
                    'summer',
                    'winter',
                    'autumn',
                    'chandeleur',
                    'epiphanie',
                  ].includes(key)
              )
              .map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-card ${activePreset === key ? 'active' : ''}`}
                  onClick={() => setPreset(key)}
                  style={{ '--preset-color': preset.defaultColor } as React.CSSProperties}
                >
                  <div className="preset-color-preview"></div>
                  <span className="preset-name">
                    {preset.label || key.replace('-', ' ').toUpperCase()}
                  </span>
                  <span className="preset-mode">{preset.isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="settings-section">
          <h2>Thèmes saisonniers & fêtes</h2>
          <div className="presets-grid">
            {Object.entries(PRESETS)
              .filter(([key]) =>
                [
                  'halloween',
                  'christmas',
                  'spring',
                  'easter',
                  'summer',
                  'winter',
                  'autumn',
                  'chandeleur',
                  'epiphanie',
                ].includes(key)
              )
              .map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-card ${activePreset === key ? 'active' : ''}`}
                  onClick={() => setPreset(key)}
                  style={{ '--preset-color': preset.defaultColor } as React.CSSProperties}
                >
                  <div className="preset-color-preview"></div>
                  <span className="preset-name">
                    {preset.label || key.replace('-', ' ').toUpperCase()}
                  </span>
                  <span className="preset-mode">{preset.isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="settings-section custom-color-section">
          <h2>Couleur d'accent personnalisée</h2>
          {isSeasonal ? (
            <p className="color-desc" style={{ color: 'var(--status-warning)' }}>
              La personnalisation de la couleur d'accent est désactivée pour les thèmes saisonniers
              afin de préserver l'immersion visuelle.
            </p>
          ) : (
            <>
              <p className="color-desc">
                Vous pouvez remplacer la couleur principale du thème sélectionné par la vôtre.
              </p>
              <div className="color-picker-container">
                <input
                  type="color"
                  value={customAccentColor || PRESETS[activePreset]?.defaultColor || '#0068ac'}
                  onChange={handleColorChange}
                  className="color-picker-input"
                />
                <div className="color-actions">
                  <span className="color-hex">
                    {customAccentColor || PRESETS[activePreset]?.defaultColor || '#0068ac'}
                  </span>
                  {customAccentColor && (
                    <button className="btn-reset-color" onClick={resetCustomColor}>
                      <FontAwesomeIcon icon={faRedo} /> Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default Settings
