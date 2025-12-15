import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "./deconnexion.css";

const DeconnexionPage = () => {
    const { t } = useTranslation();

    return (
        <section id="section-logout" className="logout-section-wrapper w-full flex justify-center items-center">
            
            <div className="logout-card-container flex flex-col items-center gap-7">
                
                <h2 className="logout-title">{t('auth.logout.title')}</h2>

                <div className="logout-inner-boxflex flex-col items-center justify-center text-center">
                    
                    <div className="logout-text-group flex flex-col gap-2.5 ">
                        <p className="logout-bye">{t('auth.logout.bye')}</p>
                        <p className="logout-thanks">{t('auth.logout.thanks')}</p>
                    </div>

                    <Link to="/" className="return-login-btn flex items-center justify-center gap-2.5 w-auto">
                        <FontAwesomeIcon icon={faArrowLeft} />
                        <span>{t('auth.logout.returnLogin')}</span>
                    </Link>
                </div>

            </div>
        </section>
    );
};

export default DeconnexionPage;