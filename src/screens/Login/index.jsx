import { useState } from "react";
import { useNavigate, Link } from "react-router";
import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons"; // Ajout des icônes
import "./Login.css";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");
  
  // Nouvel état pour la visibilité du mot de passe
  const [showPassword, setShowPassword] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsAnimating(true);
    
    setTimeout(() => {
      setShowLoading(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    }, 1000);
  };

  return (
    <>
      {showLoading && <ChargementPage variant="login" />}
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">{t('auth.login.title')}</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            
            {/* Champ Email */}
            <div className="input-group">
              <input
                type="email"
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