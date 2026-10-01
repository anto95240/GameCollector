import './ThemePreview.css'

import { faEye, faUndo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState } from 'react'
import { Link } from 'react-router'

import { getAllThemes } from '@/config/themeRegistry'
import { THEME_RULES } from '@/config/themeRules'
import { useTheme } from '@/context/ThemeContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLuminance(hex: string): number {
  if (!hex || hex === 'transparent') return 0.5
  const c = hex.replace('#', '')
  const rgb = parseInt(c, 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

/** Retourne la couleur de texte lisible (#000 ou #fff) pour un fond donné */
function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.3 ? '#000000' : '#ffffff'
}

// Build a map: themeId → brand-primary color (color[1] or color[0])
const allThemeEntries = getAllThemes()
const themeColorMap: Record<string, string> = {}
for (const t of allThemeEntries) {
  // brand-primary is typically colors[1] (the accent), fallback to colors[0]
  themeColorMap[t.id] = t.colors[1] ?? t.colors[0] ?? '#0068ac'
}

// ─── Component ────────────────────────────────────────────────────────────────

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
        {THEME_RULES.map((theme) => {
          // Déterminer la couleur de texte adaptée au brand-primary de ce thème
          const brandColor = themeColorMap[theme.id] ?? '#0068ac'
          const btnTextColor = getContrastColor(brandColor)
          const isActive = localPreset === theme.id
          // Pour l'état actif, le bouton passe au vert (#10b981) — toujours du texte sombre
          const activeBtnTextColor = getContrastColor('#10b981')

          return (
            <div
              key={theme.id}
              data-preset={theme.id}
              className={`theme-preview-card ${isActive ? 'active' : ''}`}
            >
              <div className="theme-preview-info">
                <h3>{theme.name}</h3>
                <span className="theme-preview-id">#{theme.id}</span>
              </div>
              <button
                className="theme-preview-btn apply"
                onClick={() => applyTheme(theme.id)}
                style={{
                  // Force un contraste correct indépendamment du thème de la carte
                  color: isActive ? activeBtnTextColor : btnTextColor,
                }}
              >
                <FontAwesomeIcon icon={faEye} />
                {isActive ? 'Actuel' : 'Prévisualiser'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
