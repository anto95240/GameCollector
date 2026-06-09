import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/config/translations/en.json'
import fr from '@/config/translations/fr.json'

const resources = {
  fr,
  en,
}

const savedLanguage = localStorage.getItem('language') || 'fr'

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'fr',

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
