import { useProfile } from "../../hooks/auth/useProfile";
import { useScrollSpy } from "../../hooks/ui/useScrollSpy";
import ProfilSection from "../../components/main/ProfilePage/ProfilSection";
import ConnexionSection from "../../components/main/ProfilePage/ConnexionSection";
import DeleteAccountSection from "../../components/main/ProfilePage/DeleteAccountSection";
import SideNav from "../../components/common/SideNav";
import { PROFILE_SECTIONS } from "../../config/constants";
import "./Profile.css";

const ProfilePage = () => {
  const { user, form, setForm, uiState, setUiState, t, handleSaveProfile, handleDeleteUser, handleDownloadData } = useProfile();
  
  // Remplacement de toute la logique d'IntersectionObserver par le hook
  const { activeSection, scrollToSection } = useScrollSpy("profile-section", ".profile-section-item");

  return (
    <div className="profile-container">
      <SideNav
        sections={PROFILE_SECTIONS}
        activeSection={activeSection}
        scrollToSection={(id) => scrollToSection(id, () => setUiState(p => ({ ...p, showMobileMenu: false })))}
        showMobileMenu={uiState.showMobileMenu}
        setShowMobileMenu={(val) => setUiState(prev => ({ ...prev, showMobileMenu: val }))}
        t={t}
      />

      <div className="profile-content">
        <div id="profile-section" className="profile-section-item">
          <ProfilSection user={user} form={form} setForm={setForm} t={t} handleSaveProfile={handleSaveProfile} handleDownloadData={handleDownloadData} />
        </div>
        <div id="login-section" className="profile-section-item">
          <ConnexionSection user={user} form={form} setForm={setForm} uiState={uiState} setUiState={setUiState} t={t} handleSaveProfile={handleSaveProfile} />
        </div>
        <div id="account-delete-section" className="profile-section-item">
          <DeleteAccountSection setUiState={setUiState} t={t} />
        </div>
      </div>

      {uiState.showDeletePopup && (
        <div className="modal-overlay" onClick={() => setUiState(p => ({ ...p, showDeletePopup: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h4>{t("profile.delete.popupTitle")}</h4>
            <div className="modal-actions">
              <button className="btn-light" onClick={() => setUiState(p => ({ ...p, showDeletePopup: false }))}>{t("common.cancel")}</button>
              <button className="btn-red" onClick={handleDeleteUser}>{t("profile.delete.confirmDelete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;