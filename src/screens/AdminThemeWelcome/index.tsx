import './AdminThemeWelcome.css'

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { THEME_CATEGORIES_DATA } from '@/config/themeData'
import { THEME_RULES } from '@/config/themeRules'
import { THEME_WELCOME_DATA } from '@/config/themeWelcomeData'

// Build a flat theme list with colors from THEME_CATEGORIES_DATA
const _themeColorMap: Record<string, string[]> = {}
THEME_CATEGORIES_DATA.forEach((cat) =>
  cat.themes.forEach((t) => {
    _themeColorMap[t.id] = t.colors
  })
)

// Extract themes from themeRules to get their details (colors enriched from themeData)
const allThemes = THEME_RULES.map((rule) => {
  return {
    id: rule.id,
    name: rule.name,
    colors: _themeColorMap[rule.id] ?? ([] as string[]),
  }
})

function WelcomeOverlay({ theme, onClose }: { theme: any; onClose: () => void }) {
  const data = THEME_WELCOME_DATA[theme.id]

  useEffect(() => {
    // Load font if needed
    if (data && data.googleFontUrl) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = data.googleFontUrl
      document.head.appendChild(link)

      return () => {
        // Cleanup not strictly necessary in sandbox but good practice
        document.head.removeChild(link)
      }
    }
  }, [data])

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const animFamily = data ? data.animationFamily : 'particles-up'
  const titleText = data ? data.title : `Bienvenue dans ${theme.name}`
  const fontFamily = data && data.fontFamily ? `"${data.fontFamily}", sans-serif` : 'inherit'

  return (
    <div
      className={`welcome-overlay fade-in-out anim-${animFamily}`}
      data-preset={theme.id}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <div className="welcome-content">
        <h1 className="welcome-title text-focus-in" style={{ fontFamily }}>
          <span className="welcome-prefix" style={{ color: 'var(--text-muted)' }}>
            {titleText.replace(theme.name, '').trim() || 'Bienvenue dans'}
          </span>
          <br />
          <span
            className="welcome-name"
            style={{
              color: 'var(--brand-primary)',
              textShadow: `0 0 20px var(--brand-primary), 0 0 40px var(--bg-app)`,
            }}
          >
            {theme.name}
          </span>
        </h1>
        <div className="welcome-particles">
          {/* Particles logic can just remain generic DOM nodes, the CSS handles their specific behaviors based on animFamily */}
          <div className="particle p1" style={{ backgroundColor: 'var(--brand-primary)' }}></div>
          <div
            className="particle p2"
            style={{ backgroundColor: 'var(--status-success, var(--brand-primary))' }}
          ></div>
          <div className="particle p3" style={{ backgroundColor: 'var(--brand-primary)' }}></div>
          <div
            className="particle p4"
            style={{ backgroundColor: 'var(--status-success, var(--brand-primary))' }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default function AdminThemeWelcome() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(allThemes[0]?.id || '')
  const [showOverlay, setShowOverlay] = useState(false)

  const selectedTheme = allThemes.find((t) => t.id === selectedThemeId)

  return (
    <div className="admin-theme-welcome">
      <header className="admin-header">
        <Link to="/admin" className="admin-back-link">
          ← Retour à l'administration
        </Link>
        <h1>🎬 Sandbox Animations de Bienvenue</h1>
        <p>Testez les écrans immersifs au moment de l'équipement d'un thème.</p>
      </header>

      <div className="sandbox-card">
        <h3>Configurer l'animation</h3>
        <div className="form-group">
          <label>Choisissez un thème :</label>
          <select
            value={selectedThemeId}
            onChange={(e) => setSelectedThemeId(e.target.value)}
            className="theme-select"
          >
            {allThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {selectedTheme && (
          <div className="theme-color-preview">
            <span>Couleurs détectées :</span>
            <div
              className="color-swatch"
              style={{ backgroundColor: selectedTheme.colors[0] }}
            ></div>
            <div
              className="color-swatch"
              style={{ backgroundColor: selectedTheme.colors[1] }}
            ></div>
          </div>
        )}

        <button
          className="test-button"
          onClick={() => setShowOverlay(true)}
          disabled={!selectedTheme}
        >
          ▶ Lancer l'animation
        </button>
      </div>

      {showOverlay && selectedTheme && (
        <WelcomeOverlay theme={selectedTheme} onClose={() => setShowOverlay(false)} />
      )}
    </div>
  )
}
