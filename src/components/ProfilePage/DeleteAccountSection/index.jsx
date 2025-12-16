import ProfileCard from "../../secondary/profile/ProfileCard";
import ActionButtons from "../../secondary/profile/ActionButtons";
import "./DeleteAccountSection.css";

const DeleteAccountSection = ({ setUiState, t }) => {
  return (
    <ProfileCard 
      id="account-delete-section" 
      title={t("profile.links.deleteAccount")} 
      actions={
        <ActionButtons 
          onDelete={() => setUiState(prev => ({ ...prev, showDeletePopup: true }))}
          t={t} 
        />
      }
    >
      <div className="delete-warning-container">
        <p className="delete-warning-text">
          {t("profile.delete.warning1")} <br />
          {t("profile.delete.warning2")}
        </p>
      </div>
    </ProfileCard>
  );
};

export default DeleteAccountSection;