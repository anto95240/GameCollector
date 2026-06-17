import '../Login/Login.css'
import './Deconnexion.css'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import LoadingButton from '@/components/common/LoadingButton'
import { supabase } from '@/lib/supabase'
import { removeStoredUser } from '@/utils/userStorage'

const DeconnexionPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      // Déconnexion réelle auprès de Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Erreur lors de la déconnexion Supabase:', error)
    } finally {
      // Nettoyage forcé en local (même si Supabase échoue)
      removeStoredUser()
      // Nettoyer aussi le token Supabase manuellement au cas où
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      })
    }

    await new Promise((resolve: any) => setTimeout(resolve, 400))
    // Redirection vers la page de chargement fullscreen
    navigate('/loading?variant=logout&returnTo=/')
  }

  return (
    <>
      <div className="auth-container logout-page">
        <div className="auth-card logout-card console-border-card">
          <h2 className="auth-title">{t('auth.logout.title')}</h2>

          <div className="logout-content">
            <p className="logout-message">{t('auth.logout.message')}</p>

            <div className="form-navigation">
              <LoadingButton
                text={t('common.cancel')}
                type="button"
                onClick={() => navigate(-1)}
                variant="secondary"
                className="flex-1"
              />
              <LoadingButton
                text={t('auth.logout.returnLogin')}
                isAnimating={isLoggingOut}
                variant="danger"
                loadingVariant="logout"
                loadingReturnTo="/"
                onClick={handleLogout}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DeconnexionPage
