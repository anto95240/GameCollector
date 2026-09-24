import './ThemeUnlockToast.css'

import { useEffect, useState } from 'react'

const ThemeUnlockToast = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [theme, setTheme] = useState<any>(null)

  useEffect(() => {
    const handleThemeUnlock = (event: any) => {
      const { detail } = event
      setTheme(detail)
      setIsVisible(true)

      // Auto-hide après 4 secondes
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 4000)

      return () => clearTimeout(timer)
    }

    window.addEventListener('themeUnlocked', handleThemeUnlock)
    return () => window.removeEventListener('themeUnlocked', handleThemeUnlock)
  }, [])

  if (!isVisible || !theme) return null

  // Trouver les couleurs pour le design dynamique
  const hasColors = theme.colors && theme.colors.length > 0;
  const color1 = hasColors ? theme.colors[0] : 'var(--brand-primary)';
  const color2 = hasColors && theme.colors.length > 1 ? theme.colors[1] : color1;

  return (
    <div className="theme-unlock-toast" style={{
      '--theme-color-1': color1,
      '--theme-color-2': color2,
    } as React.CSSProperties}>
      <div className="theme-toast-bg-glow"></div>
      
      <div className="theme-toast-icon-container">
        <div className="theme-toast-palette-icon">🎨</div>
      </div>

      <div className="theme-toast-content">
        <span className="theme-toast-subtitle">NOUVEAU THÈME DÉBLOQUÉ</span>
        <h3 className="theme-toast-title">{theme.display_name || theme.name}</h3>
      </div>
    </div>
  )
}

export default ThemeUnlockToast
