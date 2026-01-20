import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faBars } from "@fortawesome/free-solid-svg-icons";
import { SECTIONS } from "../../../../hooks/useAddEditGame";
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
                        <button className="close-menu-btn" onClick={() => setShowMobileMenu(false)} type="button">
                            <FontAwesomeIcon icon={faTimes} /> Fermer
                        </button>
                    </div>
                </div>
            )}
            
            {/* Floating Button Mobile */}
            <button className="floating-menu-btn mobile-only" onClick={() => setShowMobileMenu(true)} type="button">
                <FontAwesomeIcon icon={faBars} />
            </button>
        </>
    );
};

export default GameNav;