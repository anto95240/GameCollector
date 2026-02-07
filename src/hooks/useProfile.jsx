import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import axios from "axios";

export const useProfile = () => {
  const navigate = useNavigate();
  const { user, setUser, account, API_URL, t } = useOutletContext();

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    typeAccount: "",
    budgetStart: "",
    nameAccount: "",
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
      typeAccount: account?.type || "",
      budgetStart: account?.budgetStart || "",
      nameAccount: account?.name || "",
      avatarURL: user?.image
        ? user.image.startsWith("http")
          ? user.image
          : `${API_URL}/${user.image}`
        : "",
      imageFile: null,
    }));
  }, [user, account, API_URL]);

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

      const res = await axios.put(`${API_URL}/api/user/${user._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setUser(res.data);
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
      await axios.delete(`${API_URL}/api/user/${user._id}`);
      alert(t('ErrorMsg.alerteDeleteUser') || "Votre compte a été supprimé.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert(t('ErrorMsg.errorDelete') || "Erreur lors de la suppression du compte.");
    }
  };

  const handleDownloadData = () => {
    const dataToExport = {
      userProfile: user,
      accountSettings: account,
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