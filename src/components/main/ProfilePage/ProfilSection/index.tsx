import './ProfilSection.css'

import { useRef } from 'react'

import ActionButtons from '@/components/secondary/Profile/ActionButtons'
import ProfileCard from '@/components/secondary/Profile/ProfileCard'
import InlineFormItem from '@/components/secondary/Profile/InlineFormItem'

import ProfileAvatarModal from '@/components/secondary/Profile/ProfileAvatarModal'
import { useState } from 'react'

const ProfilSection = ({ user, form, setForm, uiState, setUiState, t, isSaving, handleSaveProfile }: any) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const handleCancel = () => {
    setForm((prev: any) => ({
      ...prev,
      firstname: user?.firstname || '',
      lastname: user?.lastname || '',
      username: user?.username || '',
      imageFile: null,
      avatarURL: user?.image || '',
    }))
  }

  const getInitials = () => {
    const first = form.firstname?.charAt(0) || ''
    const last = form.lastname?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }

  const isDefaultImage =
    form.avatarURL === 'https://cdn-icons-png.flaticon.com/512/847/847969.png' || !form.avatarURL

  return (
    <ProfileCard
      id="profile-section"
      title={t('profile.links.details')}
    >
      <div className="profile-form-layout" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        
        <InlineFormItem
          label={t('profile.labels.firstName')}
          showForm={uiState.showFirstnameForm}
          toggleForm={() => setUiState((p: any) => ({ ...p, showFirstnameForm: !p.showFirstnameForm }))}
          formValue={form.firstname}
          onFormChange={(e: any) => setForm((p: any) => ({ ...p, firstname: e.target.value }))}
        >
          <div className="profile-actions-container" style={{ marginTop: '1rem' }}>
            <ActionButtons 
              onCancel={() => setUiState((p: any) => ({ ...p, showFirstnameForm: false }))} 
              onSave={() => handleSaveProfile('firstname')} 
              isSaving={isSaving} 
              t={t} 
            />
          </div>
        </InlineFormItem>

        <InlineFormItem
          label={t('profile.labels.name')}
          showForm={uiState.showLastnameForm}
          toggleForm={() => setUiState((p: any) => ({ ...p, showLastnameForm: !p.showLastnameForm }))}
          formValue={form.lastname}
          onFormChange={(e: any) => setForm((p: any) => ({ ...p, lastname: e.target.value }))}
        >
          <div className="profile-actions-container" style={{ marginTop: '1rem' }}>
            <ActionButtons 
              onCancel={() => setUiState((p: any) => ({ ...p, showLastnameForm: false }))} 
              onSave={() => handleSaveProfile('lastname')} 
              isSaving={isSaving} 
              t={t} 
            />
          </div>
        </InlineFormItem>

        <InlineFormItem
          label={t('profile.labels.username')}
          showForm={uiState.showUsernameForm}
          toggleForm={() => setUiState((p: any) => ({ ...p, showUsernameForm: !p.showUsernameForm }))}
          formValue={form.username}
          onFormChange={(e: any) => setForm((p: any) => ({ ...p, username: e.target.value }))}
        >
          <div className="profile-actions-container" style={{ marginTop: '1rem' }}>
            <ActionButtons 
              onCancel={() => setUiState((p: any) => ({ ...p, showUsernameForm: false }))} 
              onSave={() => handleSaveProfile('username')} 
              isSaving={isSaving} 
              t={t} 
            />
          </div>
        </InlineFormItem>

        {/* Avatar trigger */}
        <div 
          className="account-info-item" 
          onClick={() => setShowAvatarModal(true)} 
          style={{ cursor: 'pointer', marginTop: '1rem' }}
        >
          <div className="account-info-header">
            <p className="label">{t('profile.labels.profilePicture')}</p>
          </div>
        </div>
      </div>

      <ProfileAvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        form={form}
        setForm={setForm}
        onSave={() => {
          handleSaveProfile('avatar')
          setShowAvatarModal(false)
        }}
        isSaving={isSaving}
        t={t}
        getInitials={getInitials}
        isDefaultImage={isDefaultImage}
      />
    </ProfileCard>
  )
}

export default ProfilSection
