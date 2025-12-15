import { Link } from "react-router";
import "./signUpPart2.css";
import ChargementPage from "../../../screens/Chargement";
import FloatingInput from "../../common/FloatingInput";
import LoadingButton from "../../common/LoadingButton";

const SignUpPart2 = ({
  formData,
  setFormData,
  prevStep,
  handleSubmit,
  badPassword,
  setBadPassword,
  errorMsg,
  successMsg,
  setErrorMsg,
  t,
  isAnimating,
  showLoading
}) => {

  // Mise à jour des inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrorMsg("");

    if (name === "password") {
      setBadPassword(value.length < 8);
    }
  };

  // Soumission du formulaire
  const onSubmit = (e) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <section
      id="section-signupPart2"
      className="signupPart2-section-wrapper flex justify-center items-center m-auto"
    >
      <div className="signupPart2-form-container flex flex-col items-center">
        <h2 className="form-title text-center uppercase w-full">
          {t("auth.register.title")}
        </h2>

        <form className="signupPart2-form flex flex-col w-full" onSubmit={onSubmit}>
          
          <FloatingInput
            type="email"
            id="email"
            name="email"
            label={t("auth.register.email")}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <FloatingInput
            id="password"
            name="password"
            label={t("auth.register.password")}
            value={formData.password}
            onChange={handleChange}
            required
            isPassword={true} 
          />

          <FloatingInput
            id="passwordConfirm"
            name="passwordConfirm"
            label={t("auth.register.confirmPassword")}
            value={formData.passwordConfirm}
            onChange={handleChange}
            required
            isPassword={true} 
          />

          {badPassword && <p className="signinError">{t("ErrorMsg.badPassword")}</p>}
          {errorMsg && <p className="signinError">{errorMsg}</p>}
          {successMsg && <p className="success-message">{successMsg}</p>}

          <div className="btn-group flex flex-col items-center gap-4">
            
            {/* Composant unifié LoadingButton */}
            <LoadingButton 
                text={t('auth.register.submit')}
                isAnimating={isAnimating}
                showLoading={showLoading}
            />

            {/* Bouton Retour (simple bouton texte/lien pour alléger) */}
            <button
              type="button"
              onClick={prevStep}
              className="back-button"
            >
              {t("auth.register.back")}
            </button>

          </div>

          <p className="login-account text-center mt-6">
            {t("auth.register.alreadyUser")}{" "}
            <Link className="login-account-link" to="/">
              {t("auth.register.alreadyUserLink")}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default SignUpPart2;