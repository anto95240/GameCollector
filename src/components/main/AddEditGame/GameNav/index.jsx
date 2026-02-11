import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faList } from "@fortawesome/free-solid-svg-icons";
import { SECTIONS } from "../../../../hooks/components/useAddEditGame";
import "./GameNav.css";

const GameNav = ({ activeSection, scrollToSection, showMobileMenu, setShowMobileMenu, t }) => {
    return (
        <>
            {/* Sidebar Desktop */}
            <aside className="sidebar-nav desktop-only">
                {SECTIONS.map((section) => (
                    <button 
                        key={section.id} 
                        onClick={() => scrollToSection(section.id)} 
                        className={`nav-anchor ${activeSection === section.id ? 'active' : ''}`}
                        type="button"
                    >
                        <FontAwesomeIcon icon={section.icon} />
                        <span>{t(section.label)}</span>
                    </button>
                ))}
            </aside>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="mobile-nav-overlay fade-in" onClick={() => setShowMobileMenu(false)}>
                    <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Navigation</h3>
                        {SECTIONS.map((section) => (
                            <button 
                                key={section.id} 
                                onClick={() => scrollToSection(section.id)} 
                                className={`mobile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                                type="button"
                            >
                                <FontAwesomeIcon icon={section.icon} />
                                <span>{t(section.label)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Floating Button Mobile */}
            <button 
                className={`floating-menu-btn mobile-only ${showMobileMenu ? 'open' : ''}`}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                type="button"
                aria-label={showMobileMenu ? "Fermer le menu" : "Ouvrir le menu"}
            >
                <FontAwesomeIcon icon={showMobileMenu ? faTimes : faList} />
            </button>
        </>
    );
};

export default GameNav;