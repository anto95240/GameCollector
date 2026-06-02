import { useEffect, useMemo,useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import { MOCK_OPTIONS, SECTIONS } from "@/config/constants"; 
import { useApiGame } from "@/hooks/api/useApiGame";
import { useApiMetadata } from "@/hooks/api/useApiMetadata";
import { useScrollSpy } from "@/hooks/ui/useScrollSpy";
import { incrementStoredUserMetric } from "@/utils/userStorage";

import { useTagsManager } from "./useTagsManager";
import { buildGamePayload, formatPreviewImage,getInitialFormData } from "./utils/gameFormHelpers";
import { useGameMetadata } from "./utils/useGameMetadata";

export const useAddEditGame = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { createGame, updateGame } = useApiGame();
  const { getAllMetadata } = useApiMetadata();

  const gameToEdit = location.state?.game;
  const isEditMode = !!gameToEdit;

  const initialSection = SECTIONS?.length > 0 ? SECTIONS[0].id : "desc";
  const { activeSection, scrollToSection } = useScrollSpy(initialSection, ".form-section");
  
  const initialTags = useMemo(
    () => isEditMode ? gameToEdit?.tags_ids?.map(tag => tag._id || tag) : [],
    [isEditMode, gameToEdit?.tags_ids]
  );
  
  const tagsMgr = useTagsManager(initialTags);
  const { optionsData } = useGameMetadata(getAllMetadata);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(null));

  // Synchroniser les tags avec le formulaire
  useEffect(() => {
    setFormData(prev => ({ ...prev, tags: tagsMgr.selectedTags }));
  }, [tagsMgr.selectedTags]);

  // Charger les tags disponibles et initialiser le formulaire en mode édition
  useEffect(() => {
    const initForm = async () => {
      try {
        const meta = await getAllMetadata();
        tagsMgr.setAvailableTags(meta.tags || []);

        if (isEditMode && gameToEdit?.name) {
          const initialData = getInitialFormData(gameToEdit);
          setFormData({ ...initialData, tags: tagsMgr.selectedTags });
          setPreviewImg(formatPreviewImage(gameToEdit.image, import.meta.env.VITE_API_URL));
        }
      } catch (e) { 
        console.error("Erreur initialisation formulaire :", e); 
      }
    };
    initForm();
  }, [isEditMode, gameToEdit?._id]);

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
      const submitData = buildGamePayload(
        formData,
        tagsMgr.selectedTags,
        formData.image  // Envoyer uniquement si c'est un File (nouvelle image)
      );

      let createdOrUpdatedGame;
      if (isEditMode) {
        createdOrUpdatedGame = await updateGame(gameToEdit._id, submitData);
      } else {
        createdOrUpdatedGame = await createGame(submitData);
      }
      
      // Enregistrer les métriques utilisateur
      const hour = new Date().getHours();
      if (hour >= 2 && hour < 5) {
        incrementStoredUserMetric("lateNightActionsCount");
      }
      
      // Déclencher la vérification des achievements
      setTimeout(() => {
        window.dispatchEvent(new Event('checkAchievements'));
      }, 500);
      
      const gameId = createdOrUpdatedGame?._id || gameToEdit?._id;
      
      setTimeout(() => {
        if (gameId) {
          navigate(`/game/${gameId}`, { state: { game: createdOrUpdatedGame } });
        } else {
          console.warn("Impossible de récupérer l'ID du jeu");
          navigate("/list");
        }
      }, 2500);
    } catch (e) { 
      console.error("Erreur lors de la sauvegarde:", e.response?.data || e.message);
      alert("Erreur lors de la sauvegarde.");
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