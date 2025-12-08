import { useNavigate, Link } from "react-router";
import { useState } from "react";
// import { useState, useEffect } from "react";
// import axios from "axios"
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

    //-------- Auth avec back --------//
    // const handleSubmit = async (e) => {
    //     e.preventDefault(); 

    //     const loginData = {
    //         login: login,
    //         password: password,
    //     }
    //     try {
    //         const { data } = await axios.post(`${API_URL}/api/user/login`, loginData);
    //         sessionStorage.setItem("loginToken", data.token);
    //         navigate("/loading");
    //     } catch (error) {
    //         setErrorMsg(t('ErrorMsg.errorNetwork'));
    //     }
    // }
    
    // useEffect(() => {
    //     if (loginToken) {
    //         navigate("/loading");
    //     }
    // }, [loginToken, navigate]);

    
    //-------- Auth sans back --------//
    const handleSubmit = (e) => {
        e.preventDefault();

        // Front-end seulement : validations simples
        if (!login || !password) {
            setErrorMsg(t('ErrorMsg.errorNetwork'));
            return;
        }

        navigate("/loading");
    };

    return (
        <div>
            {/* <div className="theme-wrapper">
                <ThemeTrad />
            </div> */}
            <section id="section-login" className="login-section-wrapper flex justify-center items-center m-auto">
                <div className="login-form-container flex flex-col items-center">
                    <h2 className="form-title text-center uppercase w-full">{t('auth.login.title')}</h2>

                    <form className="login-form flex flex-col w-full " onSubmit={handleSubmit}>
                        <div className="form-group floating-label w-full">
                            <input type="text" id="login" className="form-input w-full" name="login" value={login} onChange={(e) => { setLogin(e.target.value) }} required placeholder=" " />
                            <label htmlFor="login">{t('auth.login.usernameOrEmail')}</label>
                        </div>

                        <div className="form-group floating-label password-group">
                            <input type={showPassword ? "text" : "password"} id="password" className="form-input w-full" name="password" value={password} onChange={(e) => { setPassword(e.target.value) }} required placeholder=" " />
                            <label htmlFor="password">{t('auth.login.password')}</label>
                            <button
                                type="button"
                                className="eye-button cursor-pointer"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={t('auth.login.arialLabelPassword')}
                            >
                                {showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
                            </button>
                        </div>
                        {errorMsg && <span className="loginError">{errorMsg}</span>}

                        <button type="submit" className="submit-button text-center cursor-pointer flex justify-center items-center m-auto">{t('auth.login.submit')}</button>
                    
                        <p className="create-account text-center">
                            {t('auth.login.newUser')} <Link className="create-account-link" to="/register">{t('auth.login.newUserLink')}</Link>
                        </p>
                    </form>

                    
                </div>
            </section>
        </div>
    );
};

export default LoginPage;