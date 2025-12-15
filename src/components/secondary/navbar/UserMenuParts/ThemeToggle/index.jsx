import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faSun, 
    faMoon, 
} from "@fortawesome/free-solid-svg-icons";

import "./themeToggle.css";

const ThemeToggle = ({ isDark, toggleTheme }) => (
    <button 
        className="theme-btn flex items-center justify-center cursor-pointer" 
        onClick={toggleTheme}
        aria-label="Changer le thème"
    >
        <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </button>
);
export default ThemeToggle;