import "./profile.css";
import { useProfile } from "../../hooks/useProfile";

// Composants
import ProfilSection from "../../components/main/ProfilePage/ProfilSection";
import ConnexionSection from "../../components/main/ProfilePage/ConnexionSection";
import DeleteAccountSection from "../../components/main/ProfilePage/DeleteAccountSection";
import SidebarProfile from "../../components/secondary/Profile/SidebarProfile";

// Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList, faTimes } from "@fortawesome/free-solid-svg-icons"; // Ajout de faTimes

const ProfilePage = () => {  
  const { 
    user, form, setForm, 
    uiState, setUiState, t, 
    handleSaveProfile, handleDeleteUser, handleDownloadData
  } = useProfile();

  const toggleMobileMenu = () => {
    setUiState(prev => ({ ...prev, showMobileMenu: !prev.showMobileMenu }));
  };

  const closeMobileMenu = () => {
    setUiState(prev => ({...prev, showMobileMenu: false}));
  };

  const handleScrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        closeMobileMenu();
    }
  };

  return (
    <div>
      <div className="profile-container">
        
        {/* Sidebar de navigation (Mobile Overlay & Desktop Sidebar) */}
        {/* <div className={`profile-sidebar ${uiState.showMobileMenu ? "show" : ""}`}>
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
        </div> */}

        {/* Bouton Menu Mobile "HUD Style" */}
        {/* <div className={`mobile-menu-toggle ${uiState.showMobileMenu ? "active" : ""}`}>
          <button onClick={toggleMobileMenu} aria-label="Menu">
            <FontAwesomeIcon icon={uiState.showMobileMenu ? faTimes : faList} />
          </button>
        </div> */}
        
        <SidebarProfile 
            handleScrollToSection={handleScrollToSection} 
            toggleMobileMenu={toggleMobileMenu} 
            t={t}
            uiState={uiState}
        />

        {/* Contenu Principal */}
        <div className="profile-content">
          
          {/* Backdrop sombre sur mobile quand le menu est ouvert */}
          {uiState.showMobileMenu && (
             <div className="mobile-backdrop" onClick={closeMobileMenu}></div>
          )}

          <div id="profile-section">
            <ProfilSection 
                user={user} form={form} setForm={setForm} t={t} 
                handleSaveProfile={handleSaveProfile} handleDownloadData={handleDownloadData}
            />
          </div>

          <div id="login-section">
            <ConnexionSection 
                user={user} form={form} setForm={setForm} 
                uiState={uiState} setUiState={setUiState} t={t} 
                handleSaveProfile={handleSaveProfile} 
            />
          </div>

          <div id="account-delete-section">
            <DeleteAccountSection setUiState={setUiState} t={t} />
          </div>
        </div>
      </div>
    
      {/* Modal Suppression (Inchangé) */}
      {uiState.showDeletePopup && (
        <div className="modal-overlay" onClick={() => setUiState(prev => ({ ...prev, showDeletePopup: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>{t('profile.delete.popupTitle')}</h4>
            <p>{t('profile.delete.popupMessage')}</p>
            <div className="modal-actions">
              <button className="btn-light" onClick={() => setUiState(prev => ({ ...prev, showDeletePopup: false }))}>
                {t('common.cancel')}
              </button>
              <button className="btn-red" onClick={handleDeleteUser}>
                {t('profile.delete.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;