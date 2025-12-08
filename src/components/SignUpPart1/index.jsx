import { Link } from "react-router";
import "./signUpPart1.css"

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
            <div className="signupPart1-form-container flex flex-col items-center">
                <h2 className="form-title text-center uppercase w-full">{t('auth.register.title')}</h2>

                <form className="signupPart1-form flex flex-col w-full " onSubmit={handleSubmit}>
                    <div className="form-group floating-label w-full">
                        <input type="text" id="firstname" className="form-input w-full" name="firstname" value={formData.firstname} onChange={handleChange} required placeholder=" " />
                        <label htmlFor="firstname">{t('auth.register.firstName')}</label>
                    </div>

                    <div className="form-group floating-label w-full">
                        <input type="text" id="lastname" className="form-input w-full" name="lastname" value={formData.lastname} onChange={handleChange} required placeholder=" " />
                        <label htmlFor="lastname">{t('auth.register.name')}</label>
                    </div>

                    <div className="form-group floating-label w-full">
                        <input type="text" id="username" className="form-input w-full" name="username" value={formData.username} onChange={handleChange} required placeholder=" " />
                        <label htmlFor="username">{t('auth.register.username')}</label>
                        {/* {badLogin && <p className="error-message text-center">{t("ErrorMsg.badLogin")}</p>} */}
                    </div>

                    <button type="submit" className="submit-button text-center cursor-pointer flex justify-center items-center m-auto">{t('auth.register.next')}</button>
                
                    <p className="login-account text-center">
                        {t('auth.register.alreadyUser')} <Link className="login-account-link" to="/">{t('auth.register.alreadyUserLink')}</Link>
                    </p>
                </form>

                
            </div>
        </section>
    );
};

export default SignUpPart1;