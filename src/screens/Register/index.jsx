import { useState } from "react";
import { useNavigate, Link } from "react-router";
import LoadingButton from "../../components/common/LoadingButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faLock,
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import "../Login/login.css";
import "./register.css";

const StepIdentity = ({ data, update }) => (
  <div className="step-form-anim">
    <div className="input-group mb-4">
      <input
        type="text"
        name="firstname"
        placeholder="Prénom"
        value={data.firstname}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faUser} className="input-icon" />
    </div>
    <div className="input-group">
      <input
        type="text"
        name="lastname"
        placeholder="Nom"
        value={data.lastname}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faUser} className="input-icon" />
    </div>
  </div>
);

const StepAccount = ({ data, update }) => (
  <div className="step-form-anim">
    <div className="input-group mb-4">
      <input
        type="text"
        name="username"
        placeholder="Nom d'utilisateur"
        value={data.username}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faUser} className="input-icon" />
    </div>
    <div className="input-group">
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={data.email}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
    </div>
  </div>
);

const StepSecurity = ({ data, update }) => (
  <div className="step-form-anim">
    <div className="input-group mb-4">
      <input
        type="password"
        name="password"
        placeholder="Mot de passe"
        value={data.password}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faLock} className="input-icon" />
    </div>
    <div className="input-group">
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirmer"
        value={data.confirmPassword}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faLock} className="input-icon" />
    </div>
  </div>
);

const Register = () => {
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
    else {
      setIsAnimating(true);
      setTimeout(() => {
        setShowLoading(true);
        setTimeout(() => navigate("/login"), 1500);
      }, 1000);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <h2 className="auth-title">Nouveau Profil</h2>
        <div className="steps-container">
          <div className="cyber-progress-track">
            <div
              className="cyber-progress-fill"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
          <div className="steps-labels">
            <span className={step >= 1 ? "active" : ""}>
              {step === 1 ? "• Identité" : "Identité"}
            </span>
            <span className={step >= 2 ? "active" : ""}>
              {step === 2 ? "• Compte" : "Compte"}
            </span>
            <span className={step >= 3 ? "active" : ""}>
              {step === 3 ? "• Sécurité" : "Sécurité"}
            </span>
          </div>
        </div>
        <form onSubmit={handleNext} className="auth-form">
          {step === 1 && <StepIdentity data={formData} update={handleChange} />}
          {step === 2 && <StepAccount data={formData} update={handleChange} />}
          {step === 3 && <StepSecurity data={formData} update={handleChange} />}
          <div className="form-navigation">
            {step > 1 && (
              <LoadingButton
                text="Retour"
                type="button"
                onClick={() => setStep(step - 1)}
                variant="secondary"
                className="flex-1"
              />
            )}
            <LoadingButton
              text={step === 3 ? "Initialiser" : "Suivant"}
              isAnimating={isAnimating}
              showLoading={showLoading}
              variant="cyber"
              className="flex-1"
            />
          </div>
        </form>
        <div className="auth-footer">
          <p>
            Déjà inscrit ?{" "}
            <Link to="/" className="cyber-link bold">
              Connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
