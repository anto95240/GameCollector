import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApiMetadata } from "../api/useApiMetadata";
import { useValidationToast } from "../ui/useValidationToast";
import { incrementStoredUserMetric } from "../../utils/userStorage";
import { validateCategory, getFirstValidationError } from "../../utils/validators";

export const useCategoryManager = () => {
  const { t } = useTranslation();
  const { getAllMetadata, createMetadata, updateMetadata, deleteMetadata } = useApiMetadata();
  const { showSuccess, showError, showCreated, showUpdated, showDeleted } = useValidationToast();

  const [categories, setCategories] = useState({ genres: [], platforms: [], statuses: [], tags: [] });
  const [selectedCategory, setSelectedCategory] = useState("genres");
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", color: "#5AF2FF" });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fonction pour recharger les données
  const fetchMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllMetadata();
      setCategories(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories :", error);
      showError("Erreur lors du chargement des catégories");
    } finally {
      setIsLoading(false);
    }
  }, [getAllMetadata, showError]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Changement d'onglet (Genres, Plateformes...)
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    resetForm();
  };

  const resetForm = () => {
    setIsEditMode(false);
    setFormData({ id: null, name: "", color: "#5AF2FF" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCategoryLabel = () => {
    const labels = {
      genres: "Genre",
      platforms: "Plateforme",
      statuses: "Statut",
      tags: "Tag"
    };
    return labels[selectedCategory] || "Catégorie";
  };

  // Soumission (Création ou Mise à jour)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du formulaire
    const validationErrors = validateCategory(formData.name);
    const firstError = getFirstValidationError(validationErrors);
    if (firstError) {
      showError(firstError);
      return;
    }

    setIsAnimating(true);
    try {
      // Adapter le nom du champ (ex: genre_name, platform_name...)
      const fieldName = 
        selectedCategory === "genres" ? "genre_name" :
        selectedCategory === "platforms" ? "platform_name" :
        selectedCategory === "statuses" ? "status_name" : "tag_name";

      const payload = { [fieldName]: formData.name, color: formData.color };

      // Retirer le 's' final pour l'endpoint API (ex: 'genres' -> 'genre')
      const endpointCategory = selectedCategory.slice(0, -1);
      const categoryLabel = getCategoryLabel();

      if (isEditMode) {
        await updateMetadata(endpointCategory, formData.id, payload);

        incrementStoredUserMetric("updatedCategoriesCount");

        showUpdated(`${categoryLabel}: "${formData.name}"`);
      } else {
        await createMetadata(endpointCategory, payload);

        incrementStoredUserMetric("customCategoriesCreated");

        showCreated(`${categoryLabel}: "${formData.name}"`);
      }

      window.dispatchEvent(new Event('checkAchievements'));

      await fetchMetadata();
      resetForm();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      showError(t("common.savingError") || "Erreur lors de la sauvegarde");
    } finally {
      setIsAnimating(false);
    }
  };

  const handleEdit = (item) => {
    setIsEditMode(true);
    // Retrouver le bon nom en fonction de la clé dynamique (genre_name, etc.)
    const name = item.genre_name || item.platform_name || item.status_name || item.tag_name || item.name;
    setFormData({ id: item._id, name: name, color: item.color || "#5AF2FF" });
    
    // Scroll mobile vers le formulaire (optionnel)
    if (window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirmDelete") || "Voulez-vous vraiment supprimer cet élément ?")) return;
    
    try {
      const endpointCategory = selectedCategory.slice(0, -1);
      await deleteMetadata(endpointCategory, id);

      incrementStoredUserMetric("deletedCategoriesCount");

      await fetchMetadata();
      window.dispatchEvent(new Event('checkAchievements'));

      const categoryLabel = getCategoryLabel();
      showDeleted(categoryLabel);
    } catch (error) {
      console.error("Erreur lors de la suppression", error);
      showError(t("common.deletingError") || "Erreur lors de la suppression");
    }
  };

  return {
    t, categories, selectedCategory, handleCategoryChange,
    isEditMode, formData, isLoading, isAnimating,
    handleChange, handleSubmit, handleEdit, handleDelete, resetForm
  };
};