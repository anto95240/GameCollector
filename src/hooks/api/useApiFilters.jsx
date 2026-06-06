import { useCallback, useState } from "react";

import api from "@/config/interceptor";
import { useAuth } from "@/context/AuthContext";

import cacheManager from "./utils/cacheManager";
import { extractFilterValues,normalizeUserId } from "./utils/filterExtractors";
import { mapApiFilterToLocal } from "./utils/filterMappers";

const FILTERS_TTL = 3 * 60 * 1000; // 3 minutes

export const useApiFilters = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Invalide tous les caches de filtres pour l'utilisateur courant
   */
  const invalidateUserFilterCache = useCallback(() => {
    const userId = normalizeUserId(user);
    if (userId) {
      cacheManager.invalidatePattern(new RegExp(`^filters:${userId}:`));
    }
  }, [user]);

  const getUserFilters = useCallback(async () => {
    const userId = normalizeUserId(user);
    if (!userId) return [];

    const cacheKey = `filters:${userId}:all`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/user/${userId}/filters`);
      const filters = Array.isArray(data) ? data : data?.filters || [];
      const mapped = filters.map(mapApiFilterToLocal);
      cacheManager.set(cacheKey, mapped, FILTERS_TTL);
      return mapped;
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

        // Invalider le cache après ajout
        invalidateUserFilterCache();
        return savedFilter;
      } catch (err) {
        setError(err.response?.data?.message || "Erreur lors de la sauvegarde du filtre");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, updateUser, invalidateUserFilterCache],
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
      // Invalider le cache après suppression
      invalidateUserFilterCache();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suppression du filtre");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, invalidateUserFilterCache]);

  const setActiveUserFilter = useCallback(async (filterId) => {
    const userId = normalizeUserId(user);
    if (!userId) {
      throw new Error("Utilisateur non connecté");
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.put(`/api/user/${userId}/filters/${filterId}/active`);
      // Invalider le cache car l'état actif a changé
      invalidateUserFilterCache();
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'activation du filtre");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, invalidateUserFilterCache]);

  const getActiveUserFilter = useCallback(async () => {
    const userId = normalizeUserId(user);
    if (!userId) return null;

    const cacheKey = `filters:${userId}:active`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/user/${userId}/filters/active`);
      const mapped = data ? mapApiFilterToLocal(data) : null;
      if (mapped) {
        cacheManager.set(cacheKey, mapped, FILTERS_TTL);
      }
      return mapped;
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