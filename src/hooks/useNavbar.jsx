import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export const useNavbar = () => {
    const { t, i18n } = useTranslation();
    
    // États
    const [actionsOpen, setActionsOpen] = useState(false);
    const [langMenuOpen, setLangMenuOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Lazy initialisation pour lire localStorage une seule fois au montage
    const [isDark, setIsDark] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("dark")) || false;
        } catch {
            return false;
        }
    });
    
    const [language, setLanguage] = useState(() => 
        localStorage.getItem("language") || "FR"
    );

    /* ----- EFFETS ----- */
    
    // Gestion du Thème
    useEffect(() => {
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
        localStorage.setItem("dark", JSON.stringify(isDark));
    }, [isDark]);

    // Gestion de la Langue
    useEffect(() => {
        i18n.changeLanguage(language.toLowerCase());
        localStorage.setItem("language", language);
    }, [language, i18n]);

    // Fermeture des menus au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            const isClickOnAccountButton = e.target.closest(".navbar-connection-button");
            const isClickOnAccountMenu = e.target.closest(".navbar-actions");
            const isClickOnLangButton = e.target.closest(".lang-btn");
            const isClickOnLangMenu = e.target.closest(".lang-menu");
            const isClickOnMobileMenuButton = e.target.closest(".mobile-menu-button");
            const isClickOnMobileMenu = e.target.closest(".navbar-links-mobile");

            // Menu compte
            if (!isClickOnAccountButton && !isClickOnAccountMenu) {
                setActionsOpen(false);
            }

            // Menu langue
            if (!isClickOnLangButton && !isClickOnLangMenu) {
                setLangMenuOpen(false);
            }
            
            // Menu mobile
            if (!isClickOnMobileMenuButton && !isClickOnMobileMenu) {
                // On ne ferme pas le menu mobile si on interagit avec les modals de langue/compte
                if (!actionsOpen && !langMenuOpen) {
                    setIsMenuOpen(false);
                }
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [actionsOpen, langMenuOpen]); 

    /* ----- ACTIONS ----- */

    const toggleTheme = () => setIsDark(prev => !prev);
    
    const changeLanguage = (lang, e) => {
        if (e) e.stopPropagation(); 
        setLanguage(lang);
        setLangMenuOpen(false); 
    };

    return {
        t,
        state: { 
            actionsOpen, 
            langMenuOpen, 
            isMenuOpen, 
            isDark, 
            language 
        },
        setters: { 
            setActionsOpen, 
            setLangMenuOpen, 
            setIsMenuOpen 
        },
        actions: { 
            toggleTheme, 
            changeLanguage 
        }
    };
};