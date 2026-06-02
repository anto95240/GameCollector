import "./Register.css";

import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router";

import LoadingButton from "@/components/common/LoadingButton";
import SignUpPart1 from "@/components/main/SignUpPart1";
import SignUpPart2 from "@/components/main/SignUpPart2";
import SignUpPart3 from "@/components/main/SignUpPart3";
import { useRegister } from "@/hooks/auth/useRegister";

const Register = () => {
  // L'UI est totalement séparée de la logique !
  const { step, setStep, formData, handleChange, handleNext, error, isAnimating, showLoading, t } = useRegister();

  return (
    <>
      <h2 className="auth-title">{t("auth.register.title")}</h2>

      <div className="steps-container">
        <div className="cyber-progress-track">
          <div className="cyber-progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>
        <div className="steps-labels">
          <span className={step >= 1 ? "active" : ""}>
            {step === 1 ? `• ${t("auth.register.steps.identity")}` : t("auth.register.steps.identity")}
          </span>
          <span className={step >= 2 ? "active" : ""}>
            {step === 2 ? `• ${t("auth.register.steps.account")}` : t("auth.register.steps.account")}
          </span>
          <span className={step >= 3 ? "active" : ""}>
            {step === 3 ? `• ${t("auth.register.steps.security")}` : t("auth.register.steps.security")}
          </span>
        </div>
      </div>

      <form onSubmit={handleNext} className="auth-form">
        {error && (
          <div className="error-message-register">
            <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: "8px" }} />
            {error}
          </div>
        )}

        {step === 1 && <SignUpPart1 data={formData} update={handleChange} t={t} />}
        {step === 2 && <SignUpPart2 data={formData} update={handleChange} t={t} />}
        {step === 3 && <SignUpPart3 data={formData} update={handleChange} t={t} />}

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
            text={step === 3 ? t("auth.register.submit") : t("auth.register.next")}
            isAnimating={isAnimating}
            showLoading={showLoading}
            loadingVariant="login"
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
    </>
  );
};

export default Register;