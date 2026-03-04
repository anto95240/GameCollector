import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useApiAuth } from "../api/useApiAuth";
import { API_URL } from "../../config/constants";

export const useProfile = () => {
  const navigate = useNavigate();
  const { t } = useOutletContext(); 
  
  const { user, updateUser } = useAuth(); 
  const { updateProfile, deleteAccount, logout } = useApiAuth(); 

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
      const formData = new FormData();
      
      ["firstname", "lastname", "username", "email"].forEach((key) => {
        if (form[key]) formData.append(key, form[key]);
      });
      
      if (form.password) {
        if (form.password !== form.confirmPassword) {
          return alert(t('ErrorMsg.passwordsNotMatching') || "Les mots de passe ne correspondent pas.");
        }
        formData.append("password", form.password);
      }
      
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }
      console.log(user)
      // Utilisation propre de l'API
      const updatedUser = await updateProfile(user.uid, formData);
      
      // Mise à jour du contexte pour que l'UI (Navbar, etc.) s'actualise
      updateUser(updatedUser);
      alert(t('ErrorMsg.alerteSucces') || "Profil mis à jour avec succès !");
      
      setForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setUiState(prev => ({ ...prev, showEmailForm: false, showPasswordForm: false }));

    } catch (err) {
      console.error(err);
      alert(t('ErrorMsg.errorUpdateUser') || "Une erreur est survenue lors de la mise à jour.");
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteAccount(user.uid);
      alert(t('ErrorMsg.alerteDeleteUser') || "Votre compte a été supprimé.");
      await logout(); // Gère la redirection et le nettoyage
    } catch (err) {
      console.error(err);
      alert(t('ErrorMsg.errorDelete') || "Erreur lors de la suppression du compte.");
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