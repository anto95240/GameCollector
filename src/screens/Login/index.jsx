import { useState } from "react";
import { useNavigate, Link } from "react-router";
import LoadingButton from "../../components/common/LoadingButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock } from "@fortawesome/free-solid-svg-icons";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");
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
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Connexion Système</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Email d'identification"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
            <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Code d'accès"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
            />
            <FontAwesomeIcon icon={faLock} className="input-icon" />
          </div>
          <LoadingButton
            text="Initialiser la session"
            isAnimating={isAnimating}
            showLoading={showLoading}
            variant="cyber"
            className="mt-4"
          />
        </form>
        <div className="auth-footer">
          <p>
            Nouveau pilote ?{" "}
            <Link to="/register" className="cyber-link bold">
              Créer un profil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
