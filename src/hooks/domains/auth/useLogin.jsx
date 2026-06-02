import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useApiAuth } from "@/hooks/api/useApiAuth";
import { writeStoredUser } from "@/utils/userStorage";

export const useLogin = () => {
  const { t } = useTranslation();
  const { login } = useApiAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("antoine@test.com");
  const [password, setPassword] = useState("Test1234!");
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsAnimating(true);

    try {
      const response = await login({ login: email, password });
      if (response.user) {
        writeStoredUser(response.user);
        // Redirection vers la page de chargement fullscreen
        navigate("/loading?variant=login&returnTo=/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || t("auth.login.errorGeneric"));
      setIsAnimating(false);
    }
  };

  return { email, setEmail, password, setPassword, error, isAnimating, handleSubmit, t };
};