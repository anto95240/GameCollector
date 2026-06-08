import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLanguage, useTheme } from '@/context'

export const useNavbar = () => {
  const { t } = useTranslation()
  const { isDark, toggleTheme } = useTheme()
  const { language, changeLanguage: changeGlobalLanguage } = useLanguage()

  const [actionsOpen, setActionsOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickOnAccountButton = e.target.closest('.navbar-connection-button')
      const isClickOnAccountMenu = e.target.closest('.navbar-actions')
      const isClickOnLangButton = e.target.closest('.lang-btn')
      const isClickOnLangMenu = e.target.closest('.lang-menu')
      const isClickOnMobileMenuButton = e.target.closest('.mobile-menu-button')
      const isClickOnMobileMenu = e.target.closest('.navbar-links-mobile')

      // Menu compte
      if (!isClickOnAccountButton && !isClickOnAccountMenu) {
        setActionsOpen(false)
      }

      // Menu langue
      if (!isClickOnLangButton && !isClickOnLangMenu) {
        setLangMenuOpen(false)
      }

      // Menu mobile
      if (!isClickOnMobileMenuButton && !isClickOnMobileMenu) {
        if (!actionsOpen && !langMenuOpen) {
          setIsMenuOpen(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [actionsOpen, langMenuOpen])

  const changeLanguage = (lang, e) => {
    if (e) e.stopPropagation()
    changeGlobalLanguage(lang)
    setLangMenuOpen(false)
  }

  return {
    t,
    state: {
      actionsOpen,
      langMenuOpen,
      isMenuOpen,
      isDark,
      language,
    },
    setters: {
      setActionsOpen,
      setLangMenuOpen,
      setIsMenuOpen,
    },
    actions: {
      toggleTheme,
      changeLanguage,
    },
  }
}
