import ProfileCard from "../../../secondary/profile/ProfileCard";
import ActionButtons from "../../../secondary/profile/ActionButtons";
import "./DeleteAccountSection.css";

const DeleteAccountSection = ({ setUiState, t }) => {
  return (
    <ProfileCard 
      id="account-delete-section" 
      className="delete-account-card"
      title={t("profile.links.deleteAccount")} 
    >
      <div className="delete-content-row">
        <div className="delete-warning-container">
          <p className="delete-warning-text">
            {t("profile.delete.warning1")} <br />
            {t("profile.delete.warning2")}
          </p>
        </div>
        
        <div className="delete-action-wrapper">
          <ActionButtons 
            onDelete={() => setUiState(prev => ({ ...prev, showDeletePopup: true }))}
            t={t} 
          />
        </div>
      </div>
    </ProfileCard>
  );
};

export default DeleteAccountSection;