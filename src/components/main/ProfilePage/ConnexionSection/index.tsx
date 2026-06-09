import './ConnexionSection.css'

import ActionButtons from '@/components/secondary/Profile/ActionButtons'
import InlineFormItem from '@/components/secondary/Profile/InlineFormItem'
import ProfileCard from '@/components/secondary/Profile/ProfileCard'

const ConnexionSection = ({ user, form, setForm, uiState, setUiState, t, handleSaveProfile }: any) => {
  const handleCancel = () => {
    setUiState((prev: any) => ({
      ...prev,
      showEmailForm: false,
      showPasswordForm: false,
    }))
  }

  return (
    <ProfileCard
      id="login-section"
      title={t('profile.links.authMethod')}
      actions={<ActionButtons onCancel={handleCancel} onSave={handleSaveProfile} t={t} />}
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
        />

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
        />

        {/* Confirm Password */}
        {uiState.showPasswordForm && (
          <div className="confirm-password-field">
            <input
              type="password"
              placeholder={t('profile.edit.confirmPassword')}
              value={form.confirmPassword}
              onChange={(e: any) => setForm((p: any) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
        )}
      </div>
    </ProfileCard>
  )
}

export default ConnexionSection
