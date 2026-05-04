import { useCallback, useState } from "react";
import api from "@/config/interceptor";
import { useAuth } from "@/context/AuthContext";

const normalizeUserId = (user) => user?.uid || user?._id || user?.id || null;

const parseNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractFilterValues = (selectedFilters) => {
  const values = {
    genre: [],
    platform: [],
    minRating: null,
    maxRating: null,
    releaseYear: null,
    isActive: false,
    description: "",
  };

  for (const filter of selectedFilters || []) {
    const [categoryRaw, valueRaw = ""] = filter.split(": ");
    const category = (categoryRaw || "").toLowerCase();
    const value = valueRaw.trim();

    if (category.includes("genre")) {
      values.genre.push(...value.split("|").filter(Boolean));
      continue;
    }

    if (category.includes("platform") || category.includes("plateforme")) {
      values.platform.push(...value.split("|").filter(Boolean));
      continue;
    }

    if (category.includes("rating") || category.includes("note")) {
      const [min, max] = value.split("|").length > 1 ? value.split("|") : value.split("-");
      const minRating = parseNumeric(min);
      const maxRating = parseNumeric(max);
      if (minRating !== null) values.minRating = minRating;
      if (maxRating !== null) values.maxRating = maxRating;
      continue;
    }

    if (category.includes("year") || category.includes("année") || category.includes("annee")) {
      const [minYear] = value.split("-");
      const year = parseNumeric(minYear);
      if (year !== null) values.releaseYear = year;
      continue;
    }

    if (category.includes("active")) {
      values.isActive = value === "true" || value === "1";
    }
  }

  values.genre = Array.from(new Set(values.genre));
  values.platform = Array.from(new Set(values.platform));
  values.description = JSON.stringify({ selectedFilters });

  return values;
};

const mapApiFilterToLocal = (filter) => {
  let parsedDescription = null;
  if (filter?.description) {
    try {
      parsedDescription = JSON.parse(filter.description);
    } catch (error) {
      parsedDescription = null;
    }
  }

  if (parsedDescription?.selectedFilters) {
    return {
      id: filter._id || filter.id,
      name: filter.name,
      description: filter.description || "",
      filters: parsedDescription.selectedFilters,
      isActive: Boolean(filter.isActive),
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  const selectedFilters = [];

  if (Array.isArray(filter.genre) && filter.genre.length > 0) {
    selectedFilters.push(`Genre: ${filter.genre.join("|")}`);
  }

  if (Array.isArray(filter.platform) && filter.platform.length > 0) {
    selectedFilters.push(`Plateforme: ${filter.platform.join("|")}`);
  }

  if (filter.minRating !== null && filter.minRating !== undefined) {
    const maxRating = filter.maxRating ?? 5;
    selectedFilters.push(`Note: ${filter.minRating}-${maxRating}`);
  }

  if (filter.releaseYear !== null && filter.releaseYear !== undefined) {
    selectedFilters.push(`Année: ${filter.releaseYear}-${filter.releaseYear}`);
  }

  return {
    id: filter._id || filter.id,
    name: filter.name,
    description: filter.description || "",
    filters: selectedFilters,
    isActive: Boolean(filter.isActive),
    createdAt: filter.createdAt,
    updatedAt: filter.updatedAt,
  };
};

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