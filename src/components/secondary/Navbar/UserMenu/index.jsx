import "./UserMenu.css";

import { faQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import LanguageSelector from "@/components/secondary/Navbar/UserMenuParts/LanguageSelector";
import ThemeToggle from "@/components/secondary/Navbar/UserMenuParts/ThemeToggle";
import UserLinks from "@/components/secondary/Navbar/UserMenuParts/UserLinks";

const UserMenu = ({ user, t, state, setters, actions, onClose }) => {
  const { isDark, language, langMenuOpen } = state;
  const { setLangMenuOpen } = setters;
  const { toggleTheme, changeLanguage } = actions;
  const displayName = user?.username || "Pilote";

  const handleHelpClick = () => {
    window.dispatchEvent(new CustomEvent("showKeyboardHelp"));
    onClose();
  };

  return (
    <div className="navbar-actions">
      <p>
        {t("navbar.welcome")}
        {displayName}
      </p>

      <div className="theme-trad">
        <LanguageSelector
          currentLang={language}
          isOpen={langMenuOpen}
          setOpen={setLangMenuOpen}
          onChange={changeLanguage}
        />

        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />

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
      <p className="version">v{import.meta.env.VITE_APP_VERSION}</p>
    </div>
  );
};

export default UserMenu;
