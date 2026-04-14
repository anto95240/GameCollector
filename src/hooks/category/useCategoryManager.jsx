import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApiMetadata } from "../api/useApiMetadata";

export const useCategoryManager = () => {
  const { t } = useTranslation();
  const { getAllMetadata, createMetadata, updateMetadata, deleteMetadata } = useApiMetadata();

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
    } finally {
      setIsLoading(false);
    }
  }, [getAllMetadata]);

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

  // Soumission (Création ou Mise à jour)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

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

      if (isEditMode) {
        await updateMetadata(endpointCategory, formData.id, payload);
      } else {
        await createMetadata(endpointCategory, payload);
      }

      await fetchMetadata();
      resetForm();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
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
      await fetchMetadata();
    } catch (error) {
      console.error("Erreur lors de la suppression", error);
    }
  };

  return {
    t, categories, selectedCategory, handleCategoryChange,
    isEditMode, formData, isLoading, isAnimating,
    handleChange, handleSubmit, handleEdit, handleDelete, resetForm
  };
};