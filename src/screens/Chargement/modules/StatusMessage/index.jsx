import { useTranslation } from "react-i18next";
import "./StatusMessage.css";

const StatusMessage = ({ isLogout }) => {
  const { t } = useTranslation();
  const statusKey = isLogout ? "auth.loading.statusLogout" : "auth.loading.statusLogin";

  return (
    <div className="status-message">
      <span>{t(statusKey)}</span>
      <span className="dot dot-1"></span>
      <span className="dot dot-2"></span>
      <span className="dot dot-3"></span>
    </div>
  );
};

export default StatusMessage;
