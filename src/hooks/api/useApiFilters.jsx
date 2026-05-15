import { useCallback, useState } from "react";
import api from "@/config/interceptor";
import { useAuth } from "@/context/AuthContext";
import { normalizeUserId, extractFilterValues } from "./utils/filterExtractors";
import { mapApiFilterToLocal } from "./utils/filterMappers";

export const useApiFilters = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getUserFilters = useCallback(async () => {
    const userId = normalizeUserId(user);
    if (!userId) return [];

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/user/${userId}/filters`);
      const filters = Array.isArray(data) ? data : data?.filters || [];
      return filters.map(mapApiFilterToLocal);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la récupération des filtres sauvegardés");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveUserFilter = useCallback(
    async ({ name, selectedFilters, description, isActive = false }) => {
      const userId = normalizeUserId(user);
      if (!userId) {
        throw new Error("Utilisateur non connecté");
      }

      setLoading(true);
      setError(null);
      try {
        const payloadValues = extractFilterValues(selectedFilters);
        const payload = {
          name,
          description: description || payloadValues.description,
          genre: payloadValues.genre,
          platform: payloadValues.platform,
          minRating: payloadValues.minRating,
          maxRating: payloadValues.maxRating,
          releaseYear: payloadValues.releaseYear,
          isActive,
        };

        const { data } = await api.post(`/api/user/${userId}/filters`, payload);
        const savedFilter = mapApiFilterToLocal(data?.filter || data);

        if (typeof updateUser === "function" && data?.user) {
          updateUser(data.user);
        }

        return savedFilter;
      } catch (err) {
        setError(err.response?.data?.message || "Erreur lors de la sauvegarde du filtre");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, updateUser],
  );

  const deleteUserFilter = useCallback(async (filterId) => {
    const userId = normalizeUserId(user);
    if (!userId) {
      throw new Error("Utilisateur non connecté");
    }

    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/user/${userId}/filters/${filterId}`);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suppression du filtre");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setActiveUserFilter = useCallback(async (filterId) => {
    const userId = normalizeUserId(user);
    if (!userId) {
      throw new Error("Utilisateur non connecté");
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`/api/user/${userId}/filters/${filterId}/active`);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'activation du filtre");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getActiveUserFilter = useCallback(async () => {
    const userId = normalizeUserId(user);
    if (!userId) return null;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/user/${userId}/filters/active`);
      return data ? mapApiFilterToLocal(data) : null;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la récupération du filtre actif");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    getUserFilters,
    saveUserFilter,
    deleteUserFilter,
    setActiveUserFilter,
    getActiveUserFilter,
  };
};

export default useApiFilters;