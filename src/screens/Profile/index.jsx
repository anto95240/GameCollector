import "./profile.css";
import { useProfile } from "../../hooks/useProfile";

// Composants
import ProfilSection from "../../components/main/ProfilePage/ProfilSection";
import ConnexionSection from "../../components/main/ProfilePage/ConnexionSection";
import DeleteAccountSection from "../../components/main/ProfilePage/DeleteAccountSection";

// Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList } from "@fortawesome/free-solid-svg-icons";

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
        
        {/* Sidebar */}
        <div className={`profile-sidebar ${uiState.showMobileMenu ? "show" : ""}`}>
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

        {/* Bouton Menu Mobile */}
        <div className="mobile-menu-toggle">
          <button onClick={toggleMobileMenu}>
            <FontAwesomeIcon icon={faList} />
          </button>
        </div>

        {/* Contenu Principal */}
        <div className="profile-content">
          <ProfilSection 
            user={user} 
            form={form} 
            setForm={setForm} 
            t={t} 
            handleSaveProfile={handleSaveProfile} 
            handleDownloadData={handleDownloadData}
          />

          <ConnexionSection 
            user={user} 
            form={form} 
            setForm={setForm} 
            uiState={uiState} 
            setUiState={setUiState} 
            t={t} 
            handleSaveProfile={handleSaveProfile} 
          />

          <DeleteAccountSection 
            setUiState={setUiState} 
            t={t} 
          />
        </div>
      </div>
    
      {/* Modal Suppression */}
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