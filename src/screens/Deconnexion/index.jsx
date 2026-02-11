import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement"; 
import "./Deconnexion.css";
import "../Login/Login.css"; 

const DeconnexionPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLoading, setShowLoading] = useState(false);

    const handleLogout = () => {
        setIsLoggingOut(true); 
        
        setTimeout(() => {
            setShowLoading(true); 
            setTimeout(() => {
                sessionStorage.clear();
                localStorage.removeItem("loginToken");
                navigate("/");
            }, 1500);
        }, 800);
    };

    return (
        <>
            {showLoading && <ChargementPage variant="logout" />}

            <div className="auth-container logout-page">
                <div className="auth-card logout-card console-border-card">
                    <h2 className="auth-title">{t('auth.logout.title')}</h2>
                    
                    <div className="logout-content">
                        <p className="logout-message">
                            {t('auth.logout.message')}
                        </p>
                        
                        <div className="form-navigation">
                            <LoadingButton 
                                text={t('common.cancel')}
                                type="button" 
                                onClick={() => navigate(-1)} 
                                variant="secondary"
                                className="flex-1"
                            />
                            <LoadingButton 
                                text={t('auth.logout.returnLogin')}
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