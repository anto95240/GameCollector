import './UserMenu.css'

import { faQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import LanguageSelector from '@/components/secondary/Navbar/UserMenuParts/LanguageSelector'
import ThemeToggle from '@/components/secondary/Navbar/UserMenuParts/ThemeToggle'
import UserLinks from '@/components/secondary/Navbar/UserMenuParts/UserLinks'
import { useAuth } from '@/context/AuthContext'

const UserMenu = ({ user, t, state, setters, actions, onClose }: any) => {
  const { profile } = useAuth()
  const { language, langMenuOpen } = state
  const { setLangMenuOpen } = setters
  const { changeLanguage } = actions
  // Priorité : username du profil > prénom > partie avant le @ de l'email > fallback
  const displayName =
    profile?.username || profile?.firstname || user?.email?.split('@')[0] || 'Utilisateur'

  const handleHelpClick = () => {
    window.dispatchEvent(new CustomEvent('showKeyboardHelp'))
    onClose()
  }

  return (
    <div className="navbar-actions">
      <p>
        {t('navbar.welcome')}
        {displayName}
      </p>

      <div className="theme-trad">
        <LanguageSelector
          currentLang={language}
          isOpen={langMenuOpen}
          setOpen={setLangMenuOpen}
          onChange={changeLanguage}
        />

        <ThemeToggle onClose={onClose} />

        <button
          className="help-button-menu"
          onClick={handleHelpClick}
          title="Afficher les raccourcis clavier (Ctrl+H)"
          aria-label="Afficher l'aide des raccourcis clavier"
        >
          <FontAwesomeIcon icon={faQuestion} />
        </button>
      </div>

      <hr className="separate" />
      <UserLinks t={t} onClose={onClose} />
      <hr className="separate-version" />
      <button
        className="version"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('showPatchNotes'))
          onClose()
        }}
        title="Voir les notes de mise à jour"
        aria-label="Voir les nouveautés"
        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
      >
        v{import.meta.env.VITE_APP_VERSION}
      </button>
    </div>
  )
}

export default UserMenu
