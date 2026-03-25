import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiAuth } from "../../hooks/api/useApiAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

import LoadingButton from "../../components/common/LoadingButton";
import ChargementPage from "../Chargement";
import AuthInput from "../../components/common/AuthInput";
import "./Login.css";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");

  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useApiAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsAnimating(true);

    try {
      const response = await login({ login: email, password });
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        setShowLoading(true);
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("auth.login.errorGeneric"));
      setIsAnimating(false);
      setShowLoading(false);
    }
  };

  return (
    <>
      {showLoading && <ChargementPage variant="login" />}

      <h2 className="auth-title">{t("auth.login.title")}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message" style={{ color: "#ff4d4d", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
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