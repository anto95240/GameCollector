import { useNavigate, Link } from "react-router";
import { useState } from "react";
// import { useState, useEffect } from "react";
// import axios from "axios"
import "./login.css"
import ChargementPage from "../Chargement";
import { useTranslation } from "react-i18next";
import FloatingInput from "../../components/common/FloatingInput";
import LoadingButton from "../../components/common/LoadingButton"; 

const LoginPage = () => {
    const [login, setLogin] = useState("antoine@test.com");
    const [password, setPassword] = useState("Test1234!");
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [showLoading, setShowLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // const navigate = useNavigate();
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
    //         // Lancer animation
    //         setIsAnimating(true);

    //         setTimeout(() => {
    //            setShowLoading(true);     
    //         }, 300);
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

        // Lancer animation
        setIsAnimating(true);

        setTimeout(() => {
            setShowLoading(true);     
        }, 300);
    };

    return (
        <section id="section-login" className="login-section-wrapper flex justify-center items-center m-auto">
            <div className="login-form-container flex flex-col items-center console-border-card">
                <h2 className="form-title text-center uppercase w-full">{t('auth.login.title')}</h2>

                <form className="login-form flex flex-col w-full console-border-card-secondary" onSubmit={handleSubmit}>
                    
                    <FloatingInput 
                        id="login"
                        name="login"
                        label={t('auth.login.usernameOrEmail')}
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        required
                    />

                    <FloatingInput 
                        id="password"
                        name="password"
                        label={t('auth.login.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        isPassword={true} 
                    />

                    {errorMsg && <span className="loginError">{errorMsg}</span>}

                    {/* Utilisation du composant unifié */}
                    <LoadingButton 
                        text={t('auth.login.submit')}
                        isAnimating={isAnimating}
                        showLoading={showLoading}
                    />

                    <p className="create-account text-center">
                        {t('auth.login.newUser')} <Link className="create-account-link" to="/register">{t('auth.login.newUserLink')}</Link>
                    </p>
                </form>
            </div>
        </section>
    );
};

export default LoginPage;