import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiAuth } from "../api/useApiAuth";

export const useRegister = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useApiAuth();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
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
        localStorage.setItem("user", JSON.stringify(response.user));
        setShowLoading(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur d'inscription.");
      setIsAnimating(false);
      setShowLoading(false);
    }
  };

  return { step, setStep, formData, handleChange, handleNext, error, isAnimating, showLoading, t };
};