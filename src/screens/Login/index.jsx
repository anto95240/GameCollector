import { useNavigate, Link } from "react-router";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./login.css"
import { useTranslation } from "react-i18next";

const LoginPage = () => {
    const [login, setLogin] = useState("antoine@test.com");  /* toto95@admin.fr */
    const [password, setPassword] = useState("Test1234!");  /* Admin**95 */
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    // const loginToken = sessionStorage.getItem("loginToken");
    // const API_URL = import.meta.env.VITE_API_URL;
    const { t } = useTranslation();

    const handleSubmit = () => {
        // e.preventDefault(); 

        // const loginData = {
        //     login: login,
        //     password: password,
        // }
        try {
            // const { data } = await axios.post(`${API_URL}/api/user/login`, loginData);
            // sessionStorage.setItem("loginToken", data.token);
            navigate("/dashboard");
        } catch (error) {
            setErrorMsg(t('ErrorMsg.errorNetwork'));
        }
    }
    
    // useEffect(() => {
    //     if (loginToken) {
    //         navigate("/dashboard");
    //     }
    // }, [loginToken, navigate]);

    return (
        <div>
            {/* <div className="theme-wrapper">
                <ThemeTrad />
            </div> */}
            <section id="section-login" className="login-section-wrapper">
                <div className="login-form-container">
                    <h2 className="form-title ">{t('auth.login.title')}</h2>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group floating-label">
                            <input type="text"className="form-input" id="login" name="login" value={login} onChange={(e) => { setLogin(e.target.value) }}  required placeholder=" " />
                            <label htmlFor="login">{t('auth.login.usernameOrEmail')}</label>
                        </div>

                        <div className="form-group floating-label">
                            <input type={showPassword ? "text" : "password"} className="form-input" id="password" name="password" value={password} onChange={(e) => { setPassword(e.target.value) }} required placeholder=" " />
                            <label htmlFor="password">{t('auth.login.password')}</label>
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="eye-button"
                                aria-label={t('auth.login.arialLabelPassword')}
                            >
                            {showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
                            </button>
                        </div>
                        {errorMsg && <span className="loginError">{errorMsg}</span>}

                        <button type="submit" className="submit-button bg-">{t('auth.login.submit')}</button>
                    </form>

                    <p className="create-account">
                    {t('auth.login.newUser')} <Link className="create-account-link" to="/register">{t('auth.login.newUserLink')}</Link>
                    </p>
                </div>
            </section>
        </div>
    );
};

export default LoginPage;