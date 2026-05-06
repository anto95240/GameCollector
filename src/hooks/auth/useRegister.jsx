import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useApiAuth } from "../api/useApiAuth";
import { writeStoredUser } from "../../utils/userStorage";

export const useRegister = () => {
  const { t } = useTranslation();
  const { register } = useApiAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "", lastname: "", username: "", email: "", password: "", passwordConfirm: "",
  });

  const handleChange = (e) => {
    if (error) setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = async (e) => {
    e.preventDefault();
    if (step < 3) return setStep(step + 1);
    if (formData.password !== formData.passwordConfirm) {
      return setError(t("auth.register.errorPasswordsMatch") || "Les mots de passe ne correspondent pas");
    }

    setIsAnimating(true);
    setError("");

    try {
      const response = await register(formData);
      if (response.user) {
        writeStoredUser(response.user);
        // Redirection vers la page de chargement fullscreen
        navigate("/loading?variant=login&returnTo=/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur d'inscription.");
      setIsAnimating(false);
    }
  };

  return { step, setStep, formData, handleChange, handleNext, error, isAnimating, t };
};