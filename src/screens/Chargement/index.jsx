import "./chargement.css";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

function ChargementPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const barRef = useRef(null);

    useEffect(() => {
        const bar = barRef.current;

        const handleEnd = () => {
            // Une petite transition plus smooth avant la navigation
            setTimeout(() => navigate("/dashboard"), 300);
        };

        bar.addEventListener("animationend", handleEnd);

        return () => {
            bar.removeEventListener("animationend", handleEnd);
        };
    }, [navigate]);

    return (
        <div className="loading-screen flex flex-col items-center justify-center min-h-screen gap-6">
            <img className="loading-logo" src="/logo.png" alt="logo" />

            <h1 className="fade-in">{t("loading.title")}</h1>
            <p className="fade-in delay">{t("loading.message")}</p> 

            <div className="futuristic-loader">
                <hr ref={barRef} />
            </div>
        </div>
    );
}

export default ChargementPage;
