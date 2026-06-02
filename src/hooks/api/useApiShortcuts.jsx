import { useCallback,useState } from "react";

import api from "@/config/interceptor";
import { useAuth } from "@/context/AuthContext";
import { getHardcodedDefaults } from "@/hooks/api/useApiShortcutsDefaults";
import keyboardShortcutsService from "@/services/keyboardShortcutsService";

export const useApiShortcuts = () => {
  const { user, updateUser } = useAuth();
  const [shortcuts, setShortcuts] = useState(user?.shortcuts || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getShortcuts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/user/me");
      const userShortcuts = response.data.shortcuts || [];
      setShortcuts(userShortcuts);
      return userShortcuts;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Erreur lors de la récupération des raccourcis";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShortcut = useCallback(
    async (actionId, newBinding) => {
      setLoading(true);
      setError(null);
      try {
        const currentShortcuts = shortcuts || [];
        const existingIndex = currentShortcuts.findIndex(
          (s) => s.action === actionId,
        );

        let updatedShortcuts = [...currentShortcuts];
        if (existingIndex >= 0) {
          updatedShortcuts[existingIndex] = {
            ...updatedShortcuts[existingIndex],
            ...newBinding,
          };
        } else {
          updatedShortcuts.push({
            action: actionId,
            ...newBinding,
            isEnabled: true,
          });
        }

        const formData = new FormData();
        formData.append("shortcuts", JSON.stringify(updatedShortcuts));

        const response = await api.put(
          `/api/user/${user.uid || user._id}`,
          formData,
        );
        const userShortcuts = response.data.shortcuts || [];

        setShortcuts(userShortcuts);
        updateUser(response.data);
        keyboardShortcutsService.loadCustomBindings(userShortcuts);

        return userShortcuts;
      } catch (err) {
        setError(err.response?.data?.message || "Erreur de mise à jour");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, shortcuts, updateUser],
  );

  const toggleShortcut = useCallback(
    async (actionId) => {
      setLoading(true);
      setError(null);
      try {
        const currentShortcuts = shortcuts || [];
        const existingIndex = currentShortcuts.findIndex(
          (s) => s.action === actionId,
        );
        let updatedShortcuts = [...currentShortcuts];

        if (existingIndex >= 0) {
          updatedShortcuts[existingIndex].isEnabled =
            !updatedShortcuts[existingIndex].isEnabled;
        } else {
          // Récupération de la touche par défaut si elle n'existe pas en BDD
          const defaultShortcut = getHardcodedDefaults().find(
            (d) => d.action === actionId,
          );
          updatedShortcuts.push({
            action: actionId,
            key: defaultShortcut?.key || "",
            ctrlKey: defaultShortcut?.ctrlKey || false,
            altKey: defaultShortcut?.altKey || false,
            shiftKey: defaultShortcut?.shiftKey || false,
            isEnabled: false,
          });
        }

        const formData = new FormData();
        formData.append("shortcuts", JSON.stringify(updatedShortcuts));

        const response = await api.put(
          `/api/user/${user.uid || user._id}`,
          formData,
        );
        const userShortcuts = response.data.shortcuts || [];

        setShortcuts(userShortcuts);
        updateUser(response.data);
        keyboardShortcutsService.loadCustomBindings(userShortcuts);

        return userShortcuts;
      } catch (err) {
        setError(err.response?.data?.message || "Erreur lors du toggle");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, shortcuts, updateUser],
  );

  const resetShortcut = useCallback(
    async (actionId) => {
      setLoading(true);
      setError(null);
      try {
        const updatedShortcuts = (shortcuts || []).filter(
          (s) => s.action !== actionId,
        );

        const formData = new FormData();
        formData.append("shortcuts", JSON.stringify(updatedShortcuts));

        const response = await api.put(
          `/api/user/${user.uid || user._id}`,
          formData,
        );
        const userShortcuts = response.data.shortcuts || [];

        setShortcuts(userShortcuts);
        updateUser(response.data);
        keyboardShortcutsService.loadCustomBindings(userShortcuts);

        return userShortcuts;
      } catch (err) {
        setError(err.response?.data?.message || "Erreur lors du reset");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, shortcuts, updateUser],
  );

  const resetAllShortcuts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("shortcuts", JSON.stringify([]));

      const response = await api.put(
        `/api/user/${user.uid || user._id}`,
        formData,
      );
      const userShortcuts = [];

      setShortcuts(userShortcuts);
      updateUser(response.data);
      keyboardShortcutsService.loadCustomBindings(userShortcuts);

      return userShortcuts;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du reset total");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, updateUser]);

  return {
    shortcuts,
    loading,
    error,
    getShortcuts,
    updateShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
  };
};

export default useApiShortcuts;
