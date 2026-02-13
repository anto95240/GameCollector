import LanguageSelector from "../UserMenuParts/LanguageSelector";
import ThemeToggle from "../UserMenuParts/ThemeToggle";
import UserLinks from "../UserMenuParts/UserLinks";
import "./UserMenu.css";

const UserMenu = ({ user, t, state, setters, actions, onClose }) => {
    const { isDark, language, langMenuOpen } = state;
    const { setLangMenuOpen } = setters;
    const { toggleTheme, changeLanguage } = actions;
    const displayName = user?.username || "Pilote";

    return (
        <div className="navbar-actions"> 
            <p>{t('navbar.welcome')}{displayName}</p>
            
            <div className="theme-trad">
                <LanguageSelector 
                    currentLang={language} 
                    isOpen={langMenuOpen} 
                    setOpen={setLangMenuOpen} 
                    onChange={changeLanguage} 
                />
                
                <ThemeToggle 
                    isDark={isDark} 
                    toggleTheme={toggleTheme} 
                />
            </div>

            <hr className="separate" />
            
            <UserLinks t={t} onClose={onClose} />
        </div>
    );
};

export default UserMenu;