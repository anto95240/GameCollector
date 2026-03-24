import "./Chargement.css";
import { useTranslation } from "react-i18next";

const ChargementPage = ({ variant = "login" }) => {
  const { t } = useTranslation();

  const getStatusMessage = () => {
    if (variant === "logout") {
      return t("auth.loading.statusLogout");
    }
    return t("auth.loading.statusLogin");
  };

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="cyber-spinner">
          <div className="spinner-inner"></div>
          <div className="spinner-text">GC</div>
        </div>
        <div className="loading-bar-container">
          <div className="loading-bar-fill"></div>
        </div>
        <p className="loading-status">{getStatusMessage()}</p>
      </div>
      <div className="grid-overlay"></div>
    </div>
  );
};

export default ChargementPage;
