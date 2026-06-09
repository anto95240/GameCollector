import { useState, ChangeEvent, SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useApiAuth } from "@/hooks/api/useApiAuth";
import { writeStoredUser } from "@/utils/userStorage";
import { validateProfile } from "@/utils/validators/userValidators";

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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (error) setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (step < 3) return setStep(step + 1);

    const validationErrors = validateProfile({
      ...formData,
      confirmPassword: formData.passwordConfirm
    });

    if (Object.keys(validationErrors).length > 0) {
      // Set the first error message as the error
      const firstError = Object.values(validationErrors)[0] as string;
      return setError(firstError);
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur d'inscription.");
      setIsAnimating(false);
    }
  };

  return { step, setStep, formData, handleChange, handleNext, error, isAnimating, t };
};
