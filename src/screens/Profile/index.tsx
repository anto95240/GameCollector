import './Profile.css'

import SideNav from '@/components/common/SideNav'
import ConnexionSection from '@/components/main/ProfilePage/ConnexionSection'
import DeleteAccountSection from '@/components/main/ProfilePage/DeleteAccountSection'
import ProfilSection from '@/components/main/ProfilePage/ProfilSection'
import { PROFILE_SECTIONS } from '@/config/constants'
import { useProfile } from '@/hooks/domains/auth/useProfile'
import { useEscapeKeyCloser } from '@/hooks/ui/useEscapeKeyCloser'
import { useScrollSpy } from '@/hooks/ui/useScrollSpy'

const ProfilePage = () => {
  const {
    user,
    form,
    setForm,
    uiState,
    setUiState,
    t,
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData,
  } = useProfile()

  // Remplacement de toute la logique d'IntersectionObserver par le hook
  const { activeSection, scrollToSection } = useScrollSpy(
    'profile-section',
    '.profile-section-item'
  )

  // Fermer la modal de suppression avec Escape
  useEscapeKeyCloser(
    () => setUiState((p: any) => ({ ...p, showDeletePopup: false })),
    uiState.showDeletePopup
  )

  return (
    <div className="profile-container">
      <SideNav
        sections={PROFILE_SECTIONS}
        activeSection={activeSection}
        scrollToSection={(id: any) =>
          scrollToSection(id, () => setUiState((p: any) => ({ ...p, showMobileMenu: false })))
        }
        showMobileMenu={uiState.showMobileMenu}
        setShowMobileMenu={(val: any) => setUiState((prev: any) => ({ ...prev, showMobileMenu: val }))}
        t={t}
      />

      <div className="profile-content">
        <div id="profile-section" className="profile-section-item">
          <ProfilSection
            user={user}
            form={form}
            setForm={setForm}
            t={t}
            handleSaveProfile={handleSaveProfile}
            handleDownloadData={handleDownloadData}
          />
        </div>
        <div id="login-section" className="profile-section-item">
          <ConnexionSection
            user={user}
            form={form}
            setForm={setForm}
            uiState={uiState}
            setUiState={setUiState}
            t={t}
            handleSaveProfile={handleSaveProfile}
          />
        </div>
        <div id="account-delete-section" className="profile-section-item">
          <DeleteAccountSection setUiState={setUiState} t={t} />
        </div>
      </div>

      {uiState.showDeletePopup && (
        <div
          className="modal-overlay"
          onClick={() => setUiState((p: any) => ({ ...p, showDeletePopup: false }))}
        >
          <div className="modal" onClick={(e: any) => e.stopPropagation()}>
            <h4>{t('profile.delete.popupTitle')}</h4>
            <div className="modal-actions">
              <button
                className="btn-light"
                onClick={() => setUiState((p: any) => ({ ...p, showDeletePopup: false }))}
              >
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
  )
}

export default ProfilePage
