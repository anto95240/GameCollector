import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

import LoadingButton from "../../components/common/LoadingButton";
import AuthInput from "../../components/common/AuthInput";
import { useLogin } from "../../hooks/auth/useLogin";
import "./Login.css";

const Login = () => {
  // L'UI est totalement séparée de la logique !
  const { email, setEmail, password, setPassword, error, isAnimating, showLoading, handleSubmit, t } = useLogin();

  return (
    <>
      <h2 className="auth-title">{t("auth.login.title")}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message-login">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        <AuthInput
          name="email"
          placeholder={t("auth.login.usernameOrEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={faUser}
          required={true}
        />

        <AuthInput
          type="password"
          name="password"
          placeholder={t("auth.login.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={faLock}
          required={true}
          isPassword={true}
          ariaLabelToggle={t("auth.login.arialLabelPassword")}
        />

        <LoadingButton
          text={t("auth.login.submit")}
          isAnimating={isAnimating}
          showLoading={showLoading}
          loadingVariant="login"
          variant="cyber"
          className="mt-4"
        />
      </form>

      <div className="auth-footer">
        <p>
          {t("auth.login.newUser")}
          <Link to="/register" className="cyber-link">
            {t("auth.login.newUserLink")}
          </Link>
        </p>
      </div>
    </>
  );
};

export default Login;