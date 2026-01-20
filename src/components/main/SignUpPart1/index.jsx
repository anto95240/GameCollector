import { Link } from "react-router";
import FloatingInput from "../../common/FloatingInput";
import "./signUpPart1.css";

const SignUpPart1 = ({ formData, setFormData, nextStep, badLogin, setBadLogin, t }) => {

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === "username") {
            setBadLogin(value.length < 4);
        }
    };

    const handleSubmit = e => {
        e.preventDefault();
        
        if (formData.username.length < 3) {
            setBadLogin(true);
        } else {
            setBadLogin(false);
            nextStep();
        }
    };

    return (
        <section id="section-signupPart1" className="signupPart1-section-wrapper flex justify-center items-center m-auto">
            <div className="signupPart1-form-container flex flex-col items-center console-border-card">
                <h2 className="form-title text-center uppercase w-full">{t('auth.register.title')}</h2>

                <form className="signupPart1-form flex flex-col w-full console-border-card-secondary" onSubmit={handleSubmit}>
                    
                    <FloatingInput
                        id="firstname"
                        name="firstname"
                        label={t('auth.register.firstName')}
                        value={formData.firstname}
                        onChange={handleChange}
                        required
                    />

                    <FloatingInput
                        id="lastname"
                        name="lastname"
                        label={t('auth.register.name')}
                        value={formData.lastname}
                        onChange={handleChange}
                        required
                    />

                    <FloatingInput
                        id="username"
                        name="username"
                        label={t('auth.register.username')}
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    
                    {/* Gestion erreur visuelle simple pour l'exemple, peut être intégrée dans FloatingInput plus tard si besoin */}
                    {badLogin && <p className="error-message text-center">{t("ErrorMsg.badLogin") || "Nom d'utilisateur trop court"}</p>}

                    <button type="submit" className="submit-button text-center cursor-pointer flex justify-center items-center m-auto">
                        {t('auth.register.next')}
                    </button>
                
                    <p className="login-account text-center">
                        {t('auth.register.alreadyUser')} <Link className="login-account-link" to="/">{t('auth.register.alreadyUserLink')}</Link>
                    </p>
                </form>
            </div>
        </section>
    );
};

export default SignUpPart1;