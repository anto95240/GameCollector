import { useState } from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./signUpPart2.css";
import ChargementPage from "../../../screens/Chargement";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    handleSubmit(); // handleSubmit depuis RegisterPage gère navigation et validation
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
          <div className="form-group floating-label w-full">
            <input
              type="email"
              id="email"
              className="form-input w-full"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <label htmlFor="email">{t("auth.register.email")}</label>
          </div>

          <div className="form-group floating-label password-group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="form-input w-full"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <label htmlFor="password">{t("auth.register.password")}</label>
            <button
              type="button"
              className="eye-button cursor-pointer"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={t("auth.register.arialLabelPassword")}
            >
              {showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
            </button>
          </div>

          <div className="form-group floating-label password-group">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="passwordConfirm"
              className="form-input w-full"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <label htmlFor="passwordConfirm">{t("auth.register.confirmPassword")}</label>
            <button
              type="button"
              className="eye-button cursor-pointer"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={t("auth.register.arialLabelPassword")}
            >
              {showConfirmPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
            </button>
          </div>

          {badPassword && <p className="signinError">{t("ErrorMsg.badPassword")}</p>}
          {errorMsg && <p className="signinError">{errorMsg}</p>}
          {successMsg && <p className="success-message">{successMsg}</p>}

          <div className="btn-group">
            <button
              type="button"
              onClick={prevStep}
              className="submit-button text-center cursor-pointer flex justify-center items-center m-auto"
            >
              {t("auth.register.back")}
            </button>
            {/* <button
              type="submit"
              className="submit-button text-center cursor-pointer flex justify-center items-center m-auto"
              disabled={loading}
            >
              {loading ? t("auth.register.loading") : t("auth.register.submit")}
            </button> */}

            <div className="toplayer">
              <button
                  type="submit"
                  className={`submit-button text-center cursor-pointer flex justify-center items-center m-auto ${isAnimating ? "loading-btn clicked" : ""}`}
                  disabled={isAnimating}
              >
                  {isAnimating ? <span className="loader-circle"></span> : t('auth.register.submit')}
              </button>

              <div className={`layer ${isAnimating ? "clicked" : ""}`}>
                  {showLoading && <ChargementPage />}
              </div>
          </div>

          </div>

          <p className="login-account text-center">
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
