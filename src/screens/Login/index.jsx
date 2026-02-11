import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useApiAuth } from "../../hooks/api/useApiAuth";
import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash, faExclamationCircle } from "@fortawesome/free-solid-svg-icons"; // Ajout icone erreur
import "./Login.css";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");
  
  // États de visibilité et d'erreur
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // [NOUVEAU] Pour afficher les erreurs

  // États d'animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useApiAuth(); // Hook API

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Reset des états
    setError("");
    setIsAnimating(true); // Lance l'animation du bouton
    
    try {
      // 2. Appel API réel
      // Le back va vérifier les identifiants et poser le cookie HttpOnly
      const response = await login({ login: email, password });

      // 3. Succès !
      // On stocke les infos utilisateur pour l'UI et les ProtectedRoutes
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // On déclenche l'écran de chargement de transition
        setShowLoading(true);
        
        // Petite pause pour laisser voir l'animation de succès avant de changer de page
        setTimeout(() => {
           navigate("/dashboard");
        }, 1500);
      }

    } catch (err) {
      console.error("Login failed", err);
      // 4. Gestion de l'erreur
      // On récupère le message du backend ou un message par défaut
      const message = err.response?.data?.message || t('auth.login.errorGeneric') || "Identifiants incorrects";
      setError(message);
      
      // On arrête les animations
      setIsAnimating(false);
      setShowLoading(false);
    }
  };

  return (
    <>
      {/* Écran de chargement plein écran (transition vers dashboard) */}
      {showLoading && <ChargementPage variant="login" />}
      
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">{t('auth.login.title')}</h2>
          
          <form onSubmit={handleSubmit} className="auth-form">
            
            {/* [NOUVEAU] Affichage des erreurs */}
            {error && (
                <div className="error-message" style={{ color: "#ff4d4d", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    <span>{error}</span>
                </div>
            )}

            {/* Champ Email */}
            <div className="input-group">
              <input
                type="text" // Changé en text pour permettre username OU email
                placeholder={t('auth.login.usernameOrEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
              />
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            </div>

            {/* Champ Mot de passe */}
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('auth.login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
              />
              <FontAwesomeIcon icon={faLock} className="input-icon" />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={t('auth.login.arialLabelPassword')}
                className="showPassword"
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>

            <LoadingButton
              text={t('auth.login.submit')}
              isAnimating={isAnimating}
              showLoading={showLoading}
              variant="cyber"
              className="mt-4"
            />
          </form>
          
          <div className="auth-footer">
            <p>
              {t('auth.login.newUser')}
              <Link to="/register" className="cyber-link">
                 {t('auth.login.newUserLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;