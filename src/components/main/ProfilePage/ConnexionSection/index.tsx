import './ConnexionSection.css'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

import ActionButtons from '@/components/secondary/Profile/ActionButtons'
import InlineFormItem from '@/components/secondary/Profile/InlineFormItem'
import ProfileCard from '@/components/secondary/Profile/ProfileCard'

const ConnexionSection = ({ user, form, setForm, uiState, setUiState, t, isSaving, handleSaveProfile }: any) => {
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <ProfileCard
      id="login-section"
      title={t('profile.links.authMethod')}
    >
      <div className="connexion-container">
        {/* Email */}
        <InlineFormItem
          label={t('profile.labels.email')}
          value={user?.email}
          placeholder={t('profile.edit.newEmail')}
          showForm={uiState.showEmailForm}
          inputType="email"
          toggleForm={() => setUiState((p: any) => ({ ...p, showEmailForm: !p.showEmailForm }))}
          formValue={form.email}
          onFormChange={(e: any) => setForm((p: any) => ({ ...p, email: e.target.value }))}
          buttonLabel={t('profile.edit.changeEmail')}
        >
          <div className="profile-actions-container" style={{ marginTop: '1rem' }}>
            <ActionButtons 
              onCancel={() => setUiState((p: any) => ({ ...p, showEmailForm: false }))} 
              onSave={() => handleSaveProfile('email')} 
              isSaving={isSaving} 
              t={t} 
            />
          </div>
        </InlineFormItem>

        {/* Password */}
        <InlineFormItem
          label={t('profile.labels.password')}
          value="********"
          placeholder={t('profile.edit.newPassword')}
          showForm={uiState.showPasswordForm}
          inputType="password"
          toggleForm={() => setUiState((p: any) => ({ ...p, showPasswordForm: !p.showPasswordForm }))}
          formValue={form.password}
          onFormChange={(e: any) => setForm((p: any) => ({ ...p, password: e.target.value }))}
          buttonLabel={t('profile.edit.changePassword')}
        >
          <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t('profile.edit.confirmPassword')}
              value={form.confirmPassword}
              onChange={(e: any) => setForm((p: any) => ({ ...p, confirmPassword: e.target.value }))}
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
            </button>
          </div>
          
          <div className="profile-actions-container" style={{ marginTop: '1rem' }}>
            <ActionButtons 
              onCancel={() => setUiState((p: any) => ({ ...p, showPasswordForm: false }))} 
              onSave={() => handleSaveProfile('password')} 
              isSaving={isSaving} 
              t={t} 
            />
          </div>
        </InlineFormItem>
      </div>
    </ProfileCard>
  )
}

export default ConnexionSection
