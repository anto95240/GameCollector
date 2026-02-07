import "./Chargement.css";
import { useTranslation } from "react-i18next";

const ChargementPage = () => {
    const { t } = useTranslation();

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
                <p className="loading-status">{t('auth.loading.status') || "Chargement de votre..."}</p>
            </div>
            <div className="grid-overlay"></div>
        </div>
    );
};

export default ChargementPage;