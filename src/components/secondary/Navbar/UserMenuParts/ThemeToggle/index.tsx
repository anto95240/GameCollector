import './ThemeToggle.css'

import { faPalette } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router'

import { usePreloadRoute } from '@/hooks/ui/usePreloadRoute'

const ThemeToggle = ({ onClose }: any) => {
  const { preloadRoute } = usePreloadRoute()

  return (
    <div className="theme-toggle-container">
      <NavLink
        to="/themes"
        className="theme-settings-link"
        onClick={onClose}
        onMouseEnter={() => preloadRoute('/themes')}
        title="Galerie des Thèmes"
      >
        <FontAwesomeIcon icon={faPalette} />
      </NavLink>
    </div>
  )
}

export default ThemeToggle
