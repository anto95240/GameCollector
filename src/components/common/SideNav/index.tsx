import './SideNav.css';

import { faList, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export interface SideNavProps {
  sections: any[];
  activeSection: string;
  scrollToSection: (id: string) => void;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  t: any;
}

const SideNav: React.FC<SideNavProps> = ({
  sections,
  activeSection,
  scrollToSection,
  showMobileMenu,
  setShowMobileMenu,
  t,
}: any) => {
  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="sidebar-nav desktop-only">
        {sections.map((section: any) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`nav-anchor ${activeSection === section.id ? 'active' : ''}`}
            type="button"
          >
            {section.icon && <FontAwesomeIcon icon={section.icon} />}
            <span>{t(section.label)}</span>
          </button>
        ))}
      </aside>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="mobile-nav-overlay fade-in" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-nav-content" onClick={(e: any) => e.stopPropagation()}>
            <h3>Menu</h3>
            {sections.map((section: any) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`mobile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                type="button"
              >
                {section.icon && <FontAwesomeIcon icon={section.icon} />}
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
        aria-label={showMobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        <FontAwesomeIcon icon={showMobileMenu ? faTimes : faList} />
      </button>
    </>
  )
}

export default SideNav
