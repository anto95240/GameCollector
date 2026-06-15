import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/config/translations/en.json'
import fr from '@/config/translations/fr.json'

const resources = {
  fr,
  en,
}

const savedLanguage = localStorage.getItem('language') || 'fr'

// Sécurisation de l'instance pour les modules ES/Vite
const i18n = (i18next && (i18next as any).default) ? (i18next as any).default : i18next

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'fr',

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
