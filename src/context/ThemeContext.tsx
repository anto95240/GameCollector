import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDark: boolean
  activePreset: string
  setPreset: (preset: string) => void
  customAccentColor: string | null
  setCustomAccentColor: (color: string | null) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const PRESETS: Record<string, { isDark: boolean; defaultColor: string; label?: string }> = {
  'neon-night': { isDark: true, defaultColor: '#5af2ff' },
  ember: { isDark: true, defaultColor: '#ff6b35' },
  void: { isDark: true, defaultColor: '#a855f7' },
  matrix: { isDark: true, defaultColor: '#4ade80' },
  arctic: { isDark: false, defaultColor: '#2c8fff' },
  sakura: { isDark: false, defaultColor: '#ec4899' },
  halloween: { isDark: true, defaultColor: '#f97316', label: 'Halloween' },
  christmas: { isDark: true, defaultColor: '#ef4444', label: 'Noël' },
  spring: { isDark: false, defaultColor: '#84cc16', label: 'Printemps' },
  easter: { isDark: false, defaultColor: '#fbbf24', label: 'Pâques' },
  summer: { isDark: false, defaultColor: '#06b6d4', label: 'Été' },
  winter: { isDark: true, defaultColor: '#38bdf8', label: 'Hiver' },
  autumn: { isDark: true, defaultColor: '#d97706', label: 'Automne' },
  chandeleur: { isDark: false, defaultColor: '#fcd34d', label: 'Chandeleur' },
  epiphanie: { isDark: true, defaultColor: '#fbbf24', label: 'Galette des Rois' },
}

export const ThemeProvider = ({ children }: any) => {
  const [activePreset, setActivePreset] = useState<string>(() => {
    return localStorage.getItem('theme-preset') || 'neon-night'
  })

  const [customAccentColor, setCustomAccentColor] = useState<string | null>(() => {
    return localStorage.getItem('theme-accent') || null
  })

  // Derive isDark from the active preset
  const isDark = PRESETS[activePreset]?.isDark ?? true

  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.body.setAttribute('data-preset', activePreset)

    if (customAccentColor) {
      document.documentElement.style.setProperty('--custom-accent', customAccentColor)
      document.body.classList.add('has-custom-accent')
    } else {
      document.documentElement.style.removeProperty('--custom-accent')
      document.body.classList.remove('has-custom-accent')
    }

    localStorage.setItem('theme-preset', activePreset)
    if (customAccentColor) {
      localStorage.setItem('theme-accent', customAccentColor)
    } else {
      localStorage.removeItem('theme-accent')
    }
  }, [isDark, activePreset, customAccentColor])

  const setPreset = (preset: string) => {
    if (PRESETS[preset]) {
      setActivePreset(preset)
      setCustomAccentColor(null) // Reset custom color when changing preset

      // Trigger achievement on customization
      try {
        import('@/utils/userStorage').then(({ incrementStoredUserMetric }) => {
          const customizations = incrementStoredUserMetric('themeCustomizations')
          if (customizations === 1) {
            window.dispatchEvent(new CustomEvent('checkAchievements'))
          }
        })
      } catch (err) {
        console.error('[Theme] Error incrementing metric', err)
      }
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        activePreset,
        setPreset,
        customAccentColor,
        setCustomAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider")
  }
  return context
}
