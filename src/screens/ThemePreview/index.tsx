import './ThemePreview.css'

import { faEye, faUndo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState } from 'react'
import { Link } from 'react-router'

import { THEME_RULES } from '@/config/themeRules'
import { useTheme } from '@/context/ThemeContext'

export default function ThemePreview() {
  const { activePreset, setIsPreviewMode } = useTheme()
  const [localPreset, setLocalPreset] = useState<string | null>(() => {
    return localStorage.getItem('gc_preview_theme') || activePreset
  })

  React.useEffect(() => {
    setIsPreviewMode(true)
    if (localPreset) {
      document.documentElement.setAttribute('data-preset', localPreset)
    }
    return () => {
      setIsPreviewMode(false)
      // Restore the active preset to the DOM when leaving preview mode
      document.documentElement.setAttribute('data-preset', activePreset)
    }
  }, [setIsPreviewMode, activePreset, localPreset])

  const applyTheme = (themeId: string | null) => {
    const newTheme = themeId || 'neon-night'
    setLocalPreset(themeId)
    document.documentElement.setAttribute('data-preset', newTheme)
    if (themeId) {
      localStorage.setItem('gc_preview_theme', themeId)
    } else {
      localStorage.removeItem('gc_preview_theme')
    }
  }

  return (
    <div className="theme-preview-container">
      <header className="theme-preview-header">
        <Link to="/admin" className="admin-back-link">
          ← Retour à l'administration
        </Link>
        <h1>🎨 Preview des Thèmes</h1>
        <p>
          Cette page permet de prévisualiser l'impact visuel (CSS) de chaque thème sur
          l'application.
        </p>

        <div className="theme-preview-actions">
          <button
            className="theme-preview-btn reset"
            onClick={() => applyTheme(null)}
            disabled={!localPreset}
          >
            <FontAwesomeIcon icon={faUndo} /> Réinitialiser le thème par défaut
          </button>
        </div>
      </header>

      <div className="theme-preview-grid">
        {THEME_RULES.map((theme) => (
          <div
            key={theme.id}
            data-preset={theme.id}
            className={`theme-preview-card ${localPreset === theme.id ? 'active' : ''}`}
          >
            <div className="theme-preview-info">
              <h3>{theme.name}</h3>
              <span className="theme-preview-id">#{theme.id}</span>
            </div>
            <button className="theme-preview-btn apply" onClick={() => applyTheme(theme.id)}>
              <FontAwesomeIcon icon={faEye} />
              {localPreset === theme.id ? 'Actuel' : 'Prévisualiser'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
