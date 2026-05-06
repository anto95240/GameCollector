import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useApiAuth } from "../api/useApiAuth";
import { useValidationToast } from "../ui/useValidationToast";
import { validateProfile, getFirstValidationError } from "../../utils/validators";
import { API_URL } from "../../config/constants";
import { incrementStoredUserMetric } from "../../utils/userStorage";

export const useProfile = () => {
  const { t } = useOutletContext(); 
  
  const { user, updateUser } = useAuth(); 
  const { updateProfile, deleteAccount, logout } = useApiAuth();
  const { showSuccess, showError, showUpdated, showDeleted } = useValidationToast(); 

  // On a nettoyé le state des variables "account" inutilisées
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    imageFile: null,
    avatarURL: "", 
  });

  const [uiState, setUiState] = useState({
    showEmailForm: false, 
    showPasswordForm: false,
    showDeletePopup: false,
    showMobileMenu: false,
  });

  useEffect(() => {
    if (!user) return;
    
    setForm((prev) => ({
      ...prev,
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
      username: user?.username || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
      avatarURL: user?.image
        ? user.image.startsWith("http")
          ? user.image
          : `${API_URL}/${user.image}` // Utilisation de la constante définie plus haut
        : "",
      imageFile: null,
    }));
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      // Validation du formulaire
      const validationErrors = validateProfile(form);
      const firstError = getFirstValidationError(validationErrors);
      if (firstError) {
        showError(firstError);
        return;
      }

      const formData = new FormData();
      
      ["firstname", "lastname", "username", "email"].forEach((key) => {
        if (form[key]) formData.append(key, form[key]);
      });
      
      if (form.password) {
        formData.append("password", form.password);
      }
      
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }
      // Utilisation propre de l'API
      const updatedUser = await updateProfile(user.uid, formData);
      
      // Mise à jour du contexte pour que l'UI (Navbar, etc.) s'actualise
      updateUser(updatedUser);

      incrementStoredUserMetric("profileUpdatedCount");

      window.dispatchEvent(new Event('checkAchievements'));

      showUpdated("Votre profil");
      
      setForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setUiState(prev => ({ ...prev, showEmailForm: false, showPasswordForm: false }));

    } catch (err) {
      console.error(err);
      showError(t('ErrorMsg.errorUpdateUser') || "Une erreur est survenue lors de la mise à jour.");
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteAccount(user.uid);
      showDeleted("Votre compte");
      await logout(); // Gère la redirection et le nettoyage
    } catch (err) {
      console.error(err);
      showError(t('ErrorMsg.errorDelete') || "Erreur lors de la suppression du compte.");
    }
  };

  const handleDownloadData = () => {
    const dataToExport = {
      userProfile: user,
      exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `user_data_${user.username || "export"}.json`);
    
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return {
    user,
    form,
    setForm,
    uiState,
    setUiState,
    t,
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData 
  };
};