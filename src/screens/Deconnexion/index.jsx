import { useState } from "react";
import { useNavigate } from "react-router";
import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement"; 
import "./Deconnexion.css";
import "../Login/Login.css"; 

const DeconnexionPage = () => {
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
            {showLoading && <ChargementPage />}

            <div className="auth-container logout-page">
                <div className="auth-card logout-card">
                    <h2 className="auth-title">Fin de Session</h2>
                    
                    <div className="logout-content">
                        <p className="logout-message">
                            Voulez-vous vraiment déconnecter votre profil pilote du système ?
                        </p>
                        
                        <div className="form-navigation mt-6">
                            <LoadingButton 
                                text="Annuler" 
                                type="button" 
                                onClick={() => navigate(-1)} 
                                variant="secondary"
                                className="flex-1"
                            />
                            <LoadingButton 
                                text="Déconnexion" 
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