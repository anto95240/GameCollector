import { useState } from "react";
import { useNavigate, Link } from "react-router";
import LoadingButton from "../../components/common/LoadingButton";
import "../Login/Login.css";
import "./Register.css";
import SignUpPart1 from "../../components/main/SignUpPart1";
import SignUpPart2 from "../../components/main/SignUpPart2";
import SignUpPart3 from "../../components/main/SignUpPart3";
import ChargementPage from "../Chargement";

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
          setTimeout(() => navigate("/dashboard"), 2000);
        }, 1000);
      }
  };

  return (
    <>
      {showLoading && <ChargementPage variant="login" />}
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
            {step === 1 && <SignUpPart1 data={formData} update={handleChange} />}
            {step === 2 && <SignUpPart2 data={formData} update={handleChange} />}
            {step === 3 && <SignUpPart3 data={formData} update={handleChange} />}
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
    </>
  );
};

export default Register;
