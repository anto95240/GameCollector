import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiAuth } from "../api/useApiAuth";

export const useLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useApiAuth();

  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

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

  return { email, setEmail, password, setPassword, error, isAnimating, showLoading, handleSubmit, t };
};