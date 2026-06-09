import './ThemeToggle.css'

import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const ThemeToggle = ({ isDark, toggleTheme }: any) => (
  <button className="theme-btn" onClick={toggleTheme} aria-label="Changer le thème">
    <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
  </button>
)
export default ThemeToggle
