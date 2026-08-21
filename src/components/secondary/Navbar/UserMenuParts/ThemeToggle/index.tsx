import './ThemeToggle.css'

import { faCog } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router'

import { usePreloadRoute } from '@/hooks/ui/usePreloadRoute'

const ThemeToggle = ({ onClose }: any) => {
  const { preloadRoute } = usePreloadRoute()

  return (
    <div className="theme-toggle-container">
      <NavLink
        to="/settings"
        className="theme-settings-link"
        onClick={onClose}
        onMouseEnter={() => preloadRoute('/settings')}
        title="Personnaliser l'apparence"
      >
        <FontAwesomeIcon icon={faCog} />
      </NavLink>
    </div>
  )
}

export default ThemeToggle
