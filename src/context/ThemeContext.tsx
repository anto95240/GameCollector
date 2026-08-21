import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const item = localStorage.getItem('dark')
      return item ? JSON.parse(item) : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('dark', JSON.stringify(isDark))
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev: boolean) => !prev)
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

  return <ThemeContext.Provider value={{ isDark, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider")
  }
  return context
}
