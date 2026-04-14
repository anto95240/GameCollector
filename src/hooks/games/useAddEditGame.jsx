import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiGame } from "../api/useApiGame";
import { useApiMetadata } from "../api/useApiMetadata";
import { useTagsManager } from "./useTagsManager";
import { useScrollSpy } from "../ui/useScrollSpy";
import { MOCK_OPTIONS, SECTIONS } from "../../config/constants"; 

export const useAddEditGame = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { createGame, updateGame } = useApiGame();
  const { getAllMetadata } = useApiMetadata();

  const gameToEdit = location.state?.game;
  const isEditMode = !!gameToEdit;

  const initialSection = SECTIONS && SECTIONS.length > 0 ? SECTIONS[0].id : "description";
  const { activeSection, scrollToSection } = useScrollSpy(initialSection, ".form-section");
  
  // Memoïzer initialTags pour éviter les re-créations d'arrays à chaque rendu
  const initialTags = useMemo(
    () => isEditMode ? gameToEdit.tags_ids?.map(tag => tag._id || tag) : [],
    [isEditMode, gameToEdit?.tags_ids]
  );
  
  const tagsMgr = useTagsManager(initialTags);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [optionsData, setOptionsData] = useState({ genre: [], platform: [], status: [], rating: MOCK_OPTIONS.rating });
  const [previewImg, setPreviewImg] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [formData, setFormData] = useState({
    name: "", description: "", rating: "", comment: "", genre: "",
    platform: "", year: "", playTime: "", developer: "", achievements: "",
    status: "", isSoon: false, isFavorite: false, image: null, tags: []
  });

  // Synchronisation des tags sélectionnés avec le formData pour que le GameForm s'affiche bien
  useEffect(() => {
    setFormData(prev => ({ ...prev, tags: tagsMgr.selectedTags }));
  }, [tagsMgr.selectedTags]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const meta = await getAllMetadata();
        setOptionsData({
          genre: [{ value: "", label: "Sélectionner un genre" }, ...meta.genres.map(g => ({ value: g._id, label: g.genre_name }))],
          platform: [{ value: "", label: "Sélectionner une plateforme" }, ...meta.platforms.map(p => ({ value: p._id, label: p.platform_name }))],
          status: [{ value: "", label: "Sélectionner un statut" }, ...meta.statuses.map(s => ({ value: s._id, label: s.status_name }))],
          rating: MOCK_OPTIONS.rating
        });
        tagsMgr.setAvailableTags(meta.tags || []);
      } catch (e) { 
        console.error("Erreur métadonnées :", e); 
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    if (isEditMode && gameToEdit) {
      // S'assurer que les données du jeu sont bien présentes
      const hasRequiredData = gameToEdit.name && gameToEdit.genre_id && gameToEdit.platform_id && gameToEdit.status_id;
      
      if (!hasRequiredData) {
        console.warn("[useAddEditGame] Données incomplètes", gameToEdit);
        return;
      }

      // Debug log pour vérifier ce qui est reçu
      console.log("[useAddEditGame] ✅ Chargement complet des données:", {
        name: gameToEdit.name,
        description: gameToEdit.description,
        comment: gameToEdit.comment,
        playTime: gameToEdit.playing_time,
        developer: gameToEdit.developer,
        achievements: gameToEdit.succes,
      });

      setFormData({
        name: gameToEdit.name || "",
        description: gameToEdit.description || "",
        rating: gameToEdit.note || "",
        comment: gameToEdit.comment || "",
        genre: gameToEdit.genre_id?._id || gameToEdit.genre_id || "",
        platform: gameToEdit.platform_id?._id || gameToEdit.platform_id || "",
        status: gameToEdit.status_id?._id || gameToEdit.status_id || "",
        year: gameToEdit.year || "",
        playTime: gameToEdit.playing_time || "",
        developer: gameToEdit.developer || "",
        achievements: gameToEdit.succes || "",
        isSoon: gameToEdit.isSoon || false,
        isFavorite: gameToEdit.isFavorite || false,
        image: null,
        tags: tagsMgr.selectedTags
      });
      
      if (gameToEdit.image) {
        setPreviewImg(gameToEdit.imageUrl || (gameToEdit.image.startsWith("http") ? gameToEdit.image : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${gameToEdit.image}`));
      }
    }
  }, [isEditMode, gameToEdit?._id, tagsMgr.selectedTags]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, image: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImg(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewImg(null);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tagsMgr.addTag(tagsMgr.tagInput);
    }
  };

  const handleAddNewMetadata = (type) => {
    alert("Fonctionnalité d'ajout rapide de " + type + " à implémenter.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAnimating(true);
    
    try {
      const submitData = new FormData();
      
      // Mapper les champs correctement (convertir les nombres)
      if (formData.name) submitData.append("name", formData.name);
      if (formData.description) submitData.append("description", formData.description);
      if (formData.rating) submitData.append("note", Number(formData.rating));
      if (formData.comment) submitData.append("comment", formData.comment);
      if (formData.genre) submitData.append("genre_id", formData.genre);
      if (formData.platform) submitData.append("platform_id", formData.platform);
      if (formData.status) submitData.append("status_id", formData.status);
      if (formData.year) submitData.append("year", Number(formData.year));
      if (formData.playTime) submitData.append("playing_time", Number(formData.playTime));
      if (formData.developer) submitData.append("developer", formData.developer);
      if (formData.achievements) submitData.append("succes", formData.achievements);
      if (formData.isSoon !== undefined) submitData.append("isSoon", formData.isSoon);
      if (formData.isFavorite !== undefined) submitData.append("isFavorite", formData.isFavorite);
      
      // Pour l'image: envoyer le nouveau fichier OU l'ancien en cas d'édition
      if (formData.image instanceof File) {
        submitData.append("image", formData.image);
      } else if (isEditMode && gameToEdit.image) {
        // Envoyer l'image existante lors de l'édition s'il n'y a pas de nouveau fichier
        submitData.append("image", gameToEdit.image);
      }
      
      // Ajouter les tags
      tagsMgr.selectedTags.forEach(id => submitData.append("tags_ids", id));

      // Debug: afficher ce qui est envoyé
      console.log("📤 FormData envoyée:", {
        fields: Object.fromEntries(submitData),
        isEdit: isEditMode,
        gameId: gameToEdit?._id
      });

      const isFirstGame = !isEditMode;
      if (isEditMode) await updateGame(gameToEdit._id, submitData);
      else await createGame(submitData);
      
      // Mettre à jour les stats
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (isFirstGame && formData.year && parseInt(formData.year) < 2000) {
        // Jeu rétro - compter pour it's_a_me et retro_gamer
      }
      if (formData.name?.toLowerCase().includes("mario")) {
        // Mario game
      }
      // Incrémenter late night actions si approprié
      const hour = new Date().getHours();
      if (hour >= 2 && hour < 5) {
        user.lateNightActionsCount = (user.lateNightActionsCount || 0) + 1;
      }
      localStorage.setItem("user", JSON.stringify(user));
      
      // Déclencher la vérification des achievements après un court délai
      // pour que les jeux soient bien en cache
      setTimeout(() => {
        window.dispatchEvent(new Event('checkAchievements'));
      }, 500);
      
      navigate("/list");
    } catch (e) { 
      console.error("Erreur lors de la sauvegarde:", e.response?.data || e.message);
      alert("Erreur lors de la sauvegarde."); 
    } finally { 
      setIsAnimating(false); 
    }
  };

  return {
    t, navigate, isEditMode, gameToEdit, activeSection, showMobileMenu, setShowMobileMenu, scrollToSection,
    formData, setFormData, handleChange, handleFileChange, handleSubmit,
    tagInput: tagsMgr.tagInput, setTagInput: tagsMgr.setTagInput, suggestedTags: tagsMgr.suggestedTags,
    handleTagKeyDown, addTag: tagsMgr.addTag, handleRemoveTag: tagsMgr.removeTag,
    previewImg, isAnimating, optionsData, availableTags: tagsMgr.availableTags,
    handleAddNewMetadata
  };
};