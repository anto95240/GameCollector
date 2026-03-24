import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../../../screens/Register/Register.css";

const SignUpPart3 = ({ data, update, t }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="step-form-anim">
      {/* Champ Mot de passe */}
      <div className="input-group mb-4">
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder={t("auth.register.password")}
          value={data.password}
          onChange={update}
          className="auth-input"
          required
        />
        <FontAwesomeIcon icon={faLock} className="input-icon" />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={t("common.arialLabelPassword")}
        >
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </button>
      </div>

      {/* Champ Confirmation */}
      <div className="input-group">
        <input
          type={showConfirmPassword ? "text" : "password"}
          name="passwordConfirm"
          placeholder={t("auth.register.confirmPassword")}
          value={data.passwordConfirm}
          onChange={update}
          className="auth-input"
          required
        />
        <FontAwesomeIcon icon={faLock} className="input-icon" />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          aria-label={t("common.arialLabelPassword")}
        >
          <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
        </button>
      </div>
    </div>
  );
};

export default SignUpPart3;
