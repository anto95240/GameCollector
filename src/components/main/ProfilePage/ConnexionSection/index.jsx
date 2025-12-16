import ProfileCard from "../../../secondary/profile/ProfileCard";
import ActionButtons from "../../../secondary/profile/ActionButtons";
import InlineFormItem from "../../../secondary/profile/InlineFormItem";
import "./ConnexionSection.css"; // Ajout du fichier CSS pour la mise en page

const ConnexionSection = ({ user, form, setForm, uiState, setUiState, t, handleSaveProfile }) => {
  
  const handleCancel = () => {
    setUiState(prev => ({ ...prev, showEmailForm: false, showPasswordForm: false }));
  };

  return (
    <ProfileCard 
      id="login-section" 
      title={t("profile.links.authMethod")} 
      actions={<ActionButtons onCancel={handleCancel} onSave={handleSaveProfile} t={t} />}
    >
      <div className="connexion-container">
        {/* Email */}
        <InlineFormItem
          label={t("profile.labels.email")}
          value={user?.email}
          placeholder={t("profile.edit.newEmail")}
          showForm={uiState.showEmailForm}
          inputType="email"
          toggleForm={() => setUiState(p => ({ ...p, showEmailForm: !p.showEmailForm }))}
          formValue={form.email}
          onFormChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
          buttonLabel={t("profile.edit.changeEmail")}
        />

        {/* Password */}
        <InlineFormItem
          label={t("profile.labels.password")}
          value="********"
          placeholder={t("profile.edit.newPassword")}
          showForm={uiState.showPasswordForm}
          inputType="password"
          toggleForm={() => setUiState(p => ({ ...p, showPasswordForm: !p.showPasswordForm }))}
          formValue={form.password}
          onFormChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
          buttonLabel={t("profile.edit.changePassword")}
        />

        {/* Confirm Password */}
        {uiState.showPasswordForm && (
          <div className="confirm-password-field">
            <input
              type="password"
              placeholder={t("profile.edit.confirmPassword")}
              value={form.confirmPassword}
              onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
        )}
      </div>
    </ProfileCard>
  );
};

export default ConnexionSection;