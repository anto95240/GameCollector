import LanguageSelector from "../UserMenuParts/LanguageSelector";
import ThemeToggle from "../UserMenuParts/ThemeToggle";
import UserLinks from "../UserMenuParts/UserLinks";
import "./userMenu.css";

const UserMenu = ({ t, state, setters, actions }) => {
    const { isDark, language, langMenuOpen } = state;
    const { setLangMenuOpen } = setters;
    const { toggleTheme, changeLanguage } = actions;

    return (
        <div className="navbar-actions flex flex-col items-center absolute"> 
            <p>{t('navbar.welcome')}Anto Ric</p>
            
            <div className="theme-trad flex justify-center gap-3 w-full">
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

            <hr className="separate w-full" />
            
            <UserLinks t={t} />
        </div>
    );
};

export default UserMenu;