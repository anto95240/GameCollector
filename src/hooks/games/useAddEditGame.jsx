import { useState, useEffect } from "react";
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
  
  const tagsMgr = useTagsManager(isEditMode ? gameToEdit.tags_ids?.map(tag => tag._id || tag) : []);

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
      setFormData(prev => ({
        ...prev,
        name: gameToEdit.name || "",
        description: gameToEdit.description || "",
        rating: gameToEdit.note || "",
        comment: gameToEdit.comment || "",
        genre: gameToEdit.genre_id?._id || gameToEdit.genre_id || "",
        platform: gameToEdit.platform_id?._id || gameToEdit.platform_id || "",
        status: gameToEdit.status_id?._id || gameToEdit.status_id || "",
        year: gameToEdit.year || "",
        playTime: gameToEdit.playTime || "",
        developer: gameToEdit.developer || "",
        achievements: gameToEdit.achievements || "",
        isSoon: gameToEdit.isSoon || false,
        isFavorite: gameToEdit.isFavorite || false,
        image: null 
      }));
      
      if (gameToEdit.image) {
        setPreviewImg(gameToEdit.image.startsWith("http") ? gameToEdit.image : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${gameToEdit.image}`);
      }
    }
  }, [isEditMode, gameToEdit]);

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
      Object.keys(formData).forEach(key => {
        if (key !== "tags" && formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
          submitData.append(key, formData[key]);
        }
      });
      
      tagsMgr.selectedTags.forEach(id => submitData.append("tags_ids", id));

      if (isEditMode) await updateGame(gameToEdit._id, submitData);
      else await createGame(submitData);
      
      navigate("/liste");
    } catch (e) { 
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