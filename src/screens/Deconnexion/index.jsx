import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiAuth } from "../../hooks/api/useApiAuth";
import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement";
import "./Deconnexion.css";
import "../Login/Login.css";

const DeconnexionPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const { logout } = useApiAuth();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setShowLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await logout();
  };

  return (
    <>
      {showLoading && <ChargementPage variant="logout" />}

      <div className="auth-container logout-page">
        <div className="auth-card logout-card console-border-card">
          <h2 className="auth-title">{t("auth.logout.title")}</h2>

          <div className="logout-content">
            <p className="logout-message">{t("auth.logout.message")}</p>

            <div className="form-navigation">
              <LoadingButton
                text={t("common.cancel")}
                type="button"
                onClick={() => navigate(-1)}
                variant="secondary"
                className="flex-1"
              />
              <LoadingButton
                text={t("auth.logout.returnLogin")}
                isAnimating={isLoggingOut}
                showLoading={showLoading}
                variant="danger"
                onClick={handleLogout}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeconnexionPage;
