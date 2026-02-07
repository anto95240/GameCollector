import "./SidebarProfile.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList, faTimes } from "@fortawesome/free-solid-svg-icons";

const SidebarProfile = ({ handleScrollToSection, toggleMobileMenu, uiState, t }) => {

  return (
    <div>        
        <div className={`profile-sidebar ${uiState.showMobileMenu ? "show" : ""}`}>
          <div className="sidebar-content">
             <a href="#profile-section" onClick={(e) => handleScrollToSection(e, "profile-section")}>
              {t('profile.links.details')}
            </a>
            <a href="#login-section" onClick={(e) => handleScrollToSection(e, "login-section")}>
              {t('profile.links.authMethod')}
            </a>
            <a href="#account-delete-section" onClick={(e) => handleScrollToSection(e, "account-delete-section")}>
              {t('profile.links.deleteAccount')}
            </a>
          </div>
        </div>

        <div className={`mobile-menu-toggle ${uiState.showMobileMenu ? "active" : ""}`}>
          <button onClick={toggleMobileMenu} aria-label="Menu">
            <FontAwesomeIcon icon={uiState.showMobileMenu ? faTimes : faList} />
          </button>
        </div>    
    </div>
  );
};

export default SidebarProfile;