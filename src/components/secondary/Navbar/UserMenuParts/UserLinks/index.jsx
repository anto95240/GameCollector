import './UserLinks.css'

import { faRightFromBracket, faTrophy, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router'

import { usePreloadRoute } from '@/hooks/ui/usePreloadRoute'

const UserLinks = ({ t, onClose }) => {
  const { preloadRoute } = usePreloadRoute()

  return (
    <div className="navbar-actions-links">
      <NavLink
        className="navbar-link-profile"
        to="/profile"
        onClick={onClose}
        onMouseEnter={() => preloadRoute('/profile')}
        onFocus={() => preloadRoute('/profile')}
      >
        <FontAwesomeIcon icon={faUser} /> {t('navbar.profile')}
      </NavLink>

      <NavLink
        className="navbar-link-profile"
        to="/trophies"
        onClick={onClose}
        onMouseEnter={() => preloadRoute('/trophies')}
        onFocus={() => preloadRoute('/trophies')}
      >
        <FontAwesomeIcon icon={faTrophy} /> {t('navbar.trophies')}
      </NavLink>

      <NavLink className="navbar-link-deconnect" to="/logout" onClick={onClose}>
        <div className="deconnect-text">
          <span className="logo-deconect">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </span>
          <span className="logout-text">{t('navbar.logout')}</span>
        </div>
      </NavLink>
    </div>
  )
}
export default UserLinks
