import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LanguageContextType {
  language: string
  changeLanguage: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export const LanguageProvider = ({ children }: any) => {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'FR')

  useEffect(() => {
    i18n.changeLanguage(language.toLowerCase())
    localStorage.setItem('language', language)
  }, [language, i18n])

  const changeLanguage = (lang: string) => {
    setLanguage(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage doit être utilisé à l'intérieur d'un LanguageProvider")
  }
  return context
}
