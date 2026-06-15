import { createContext, useContext, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/config/i18n'

interface LanguageContextType {
  language: string
  changeLanguage: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export const LanguageProvider = ({ children }: any) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'FR')

  useEffect(() => {
    i18n.changeLanguage(language.toLowerCase())
    localStorage.setItem('language', language)
  }, [language])

  const changeLanguage = (lang: string) => {
    setLanguage(lang)
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={{ language, changeLanguage }}>
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage doit être utilisé à l'intérieur d'un LanguageProvider")
  }
  return context
}
