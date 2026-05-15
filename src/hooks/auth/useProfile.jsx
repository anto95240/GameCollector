import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useApiAuth } from "../api/useApiAuth";
import { useValidationToast } from "../ui/useValidationToast";
import { validateProfile, getFirstValidationError } from "../../utils/validators";
import { API_URL } from "../../config/constants";
import { incrementStoredUserMetric } from "../../utils/userStorage";
import {
  handleSaveProfileAsync,
  handleDeleteAccountAsync,
  handleDownloadUserData,
  getInitialProfileForm,
} from "./utils/profileHandlers";

export const useProfile = () => {
  const { t } = useOutletContext(); 
  
  const { user, updateUser } = useAuth(); 
  const { updateProfile, deleteAccount, logout } = useApiAuth();
  const { showSuccess, showError, showUpdated, showDeleted } = useValidationToast(); 

  const [form, setForm] = useState(() => getInitialProfileForm(user, API_URL));

  const [uiState, setUiState] = useState({
    showEmailForm: false, 
    showPasswordForm: false,
    showDeletePopup: false,
    showMobileMenu: false,
  });

  useEffect(() => {
    setForm(getInitialProfileForm(user, API_URL));
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      const validationErrors = validateProfile(form);
      const firstError = getFirstValidationError(validationErrors);
      if (firstError) {
        showError(firstError);
        return;
      }

      const updatedUser = await handleSaveProfileAsync(
        form,
        user,
        updateProfile,
        showError,
        showUpdated
      );
      
      updateUser(updatedUser);
      incrementStoredUserMetric("profileUpdatedCount");
      window.dispatchEvent(new Event('checkAchievements'));

      setForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setUiState(prev => ({ ...prev, showEmailForm: false, showPasswordForm: false }));

    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await handleDeleteAccountAsync(
        user,
        deleteAccount,
        logout,
        showDeleted,
        showError
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadData = () => {
    handleDownloadUserData(user);
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