import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiAuth } from "../../hooks/api/useApiAuth"; // [1] Import du hook
import LoadingButton from "../../components/common/LoadingButton";
import "../Login/Login.css";
import "./Register.css";
import SignUpPart1 from "../../components/main/SignUpPart1";
import SignUpPart2 from "../../components/main/SignUpPart2";
import SignUpPart3 from "../../components/main/SignUpPart3";
import ChargementPage from "../Chargement";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

const Register = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { register } = useApiAuth();

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const handleChange = (e) => {
    if (error) setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = async (e) => {
    e.preventDefault();

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError(
        t("auth.register.errorPasswordsMatch") ||
          "Les mots de passe ne correspondent pas",
      );
      return;
    }

    setIsAnimating(true);
    setError("");

    try {
      const response = await register(formData);

      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        setShowLoading(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err) {
      console.error("Register Error", err);
      const message =
        err.response?.data?.message ||
        "Une erreur est survenue lors de l'inscription.";
      setError(message);
      setIsAnimating(false);
      setShowLoading(false);
    }
  };

  return (
    <>
      {showLoading && <ChargementPage variant="login" />}
      <div className="auth-container">
        <div className="auth-card register-card console-border-card">
          <h2 className="auth-title">{t("auth.register.title")}</h2>

          <div className="steps-container">
            <div className="cyber-progress-track">
              <div
                className="cyber-progress-fill"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
            <div className="steps-labels">
              <span className={step >= 1 ? "active" : ""}>
                {step === 1
                  ? `• ${t("auth.register.steps.identity")}`
                  : t("auth.register.steps.identity")}
              </span>
              <span className={step >= 2 ? "active" : ""}>
                {step === 2
                  ? `• ${t("auth.register.steps.account")}`
                  : t("auth.register.steps.account")}
              </span>
              <span className={step >= 3 ? "active" : ""}>
                {step === 3
                  ? `• ${t("auth.register.steps.security")}`
                  : t("auth.register.steps.security")}
              </span>
            </div>
          </div>

          <form onSubmit={handleNext} className="auth-form">
            {error && (
              <div
                className="error-message"
                style={{
                  color: "#ff4d4d",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                <FontAwesomeIcon
                  icon={faExclamationCircle}
                  style={{ marginRight: "8px" }}
                />
                {error}
              </div>
            )}

            {step === 1 && (
              <SignUpPart1 data={formData} update={handleChange} t={t} />
            )}
            {step === 2 && (
              <SignUpPart2 data={formData} update={handleChange} t={t} />
            )}
            {step === 3 && (
              <SignUpPart3 data={formData} update={handleChange} t={t} />
            )}

            <div className="form-navigation">
              {step > 1 && (
                <LoadingButton
                  text={t("common.back")}
                  type="button"
                  onClick={() => setStep(step - 1)}
                  variant="secondary"
                  className="flex-1"
                  disabled={isAnimating}
                />
              )}
              <LoadingButton
                text={
                  step === 3
                    ? t("auth.register.submit")
                    : t("auth.register.next")
                }
                isAnimating={isAnimating}
                showLoading={showLoading}
                variant="cyber"
                className="flex-1"
              />
            </div>
          </form>

          <div className="auth-footer">
            <p>
              {t("auth.register.alreadyUser")}
              <Link to="/" className="cyber-link bold">
                {t("auth.register.alreadyUserLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
