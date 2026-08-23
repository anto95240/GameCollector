import './Profile.css'

import { useState } from 'react'

import SideNav from '@/components/common/SideNav'
import BugReportSection from '@/components/main/ProfilePage/BugReportSection'
import ConnexionSection from '@/components/main/ProfilePage/ConnexionSection'
import DeleteAccountSection from '@/components/main/ProfilePage/DeleteAccountSection'
import ProfilSection from '@/components/main/ProfilePage/ProfilSection'
import { PROFILE_SECTIONS } from '@/config/constants'
import { useProfile } from '@/hooks/domains/auth/useProfile'
import { useEscapeKeyCloser } from '@/hooks/ui/useEscapeKeyCloser'

const ProfilePage = () => {
  const {
    user,
    form,
    setForm,
    uiState,
    setUiState,
    t,
    isSaving,
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData,
  } = useProfile()

  // PS5 Style: Un seul onglet actif à la fois
  const [activeTab, setActiveTab] = useState('profile-section')

  // Fermer la modal de suppression avec Escape
  useEscapeKeyCloser(
    () => setUiState((p: any) => ({ ...p, showDeletePopup: false })),
    uiState.showDeletePopup
  )

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    setUiState((p: any) => ({ ...p, showMobileMenu: false }))
  }

  return (
    <div className="profile-container">
      <SideNav
        sections={PROFILE_SECTIONS}
        activeSection={activeTab}
        scrollToSection={handleTabChange}
        showMobileMenu={uiState.showMobileMenu}
        setShowMobileMenu={(val: any) =>
          setUiState((prev: any) => ({ ...prev, showMobileMenu: val }))
        }
        t={t}
      />

      <div className="profile-content ps5-style">
        {activeTab === 'profile-section' && (
          <div className="profile-section-item fade-in-tab">
            <ProfilSection
              user={user}
              form={form}
              setForm={setForm}
              uiState={uiState}
              setUiState={setUiState}
              t={t}
              isSaving={isSaving}
              handleSaveProfile={handleSaveProfile}
              handleDownloadData={handleDownloadData}
            />
          </div>
        )}

        {activeTab === 'login-section' && (
          <div className="profile-section-item fade-in-tab">
            <ConnexionSection
              user={user}
              form={form}
              setForm={setForm}
              uiState={uiState}
              setUiState={setUiState}
              t={t}
              isSaving={isSaving}
              handleSaveProfile={handleSaveProfile}
            />
          </div>
        )}

        {activeTab === 'bug-report-section' && (
          <div className="profile-section-item fade-in-tab">
            <BugReportSection user={user} t={t} />
          </div>
        )}

        {activeTab === 'account-delete-section' && (
          <div className="profile-section-item fade-in-tab">
            <DeleteAccountSection setUiState={setUiState} t={t} />
          </div>
        )}
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
