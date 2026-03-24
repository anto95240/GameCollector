import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useApiGame } from "../api/useApiGame";
import { useApiMetadata } from "../api/useApiMetadata";
import {
  faList,
  faStar,
  faGamepad,
  faImage,
  faCheckCircle,
  faTag,
} from "@fortawesome/free-solid-svg-icons";

export const SECTIONS = [
  { id: "desc", icon: faList, label: "gameForm.sections.description" },
  { id: "rate", icon: faStar, label: "gameForm.sections.rating" },
  { id: "detail", icon: faGamepad, label: "gameForm.sections.details" },
  { id: "img", icon: faImage, label: "gameForm.sections.image" },
  { id: "status", icon: faCheckCircle, label: "gameForm.sections.status" },
  { id: "tags", icon: faTag, label: "gameForm.sections.tags" },
];

export const MOCK_OPTIONS = {
  rating: [
    { value: "", label: "Sélectionner une note" },
    { value: 5, label: "⭐⭐⭐⭐⭐" },
    { value: 4, label: "⭐⭐⭐⭐" },
    { value: 3, label: "⭐⭐⭐" },
    { value: 2, label: "⭐⭐" },
    { value: 1, label: "⭐" },
  ],
};

export const useAddEditGame = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { createGame, updateGame } = useApiGame();
  const { getAllMetadata, createMetadata } = useApiMetadata();

  const gameToEdit = location.state?.game;
  const isEditMode = !!gameToEdit;

  const [activeSection, setActiveSection] = useState("desc");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);

  const [availableTags, setAvailableTags] = useState([]);
  const [optionsData, setOptionsData] = useState({
    genre: [],
    platform: [],
    status: [],
    rating: MOCK_OPTIONS.rating,
  });

  const isClickScrolling = useRef(false);

  const [previewImg, setPreviewImg] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rating: "",
    comment: "",
    genre: "",
    platform: "",
    year: "",
    playTime: "",
    developer: "",
    achievements: "",
    status: "",
    tags: [],
    image: null,
    isSoon: false,
    isFavorite: false,
  });

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const meta = await getAllMetadata();
        setOptionsData({
          genre: [
            { value: "", label: "Sélectionner un genre" },
            ...(meta.genres?.map((g) => ({
              value: g._id,
              label: g.genre_name || g.name || "Inconnu",
            })) || []),
          ],
          platform: [
            { value: "", label: "Sélectionner une plateforme" },
            ...(meta.platforms?.map((p) => ({
              value: p._id,
              label: p.platform_name || p.name || "Inconnu",
            })) || []),
          ],
          status: [
            { value: "", label: "Sélectionner un statut" },
            ...(meta.statuses?.map((s) => ({
              value: s._id,
              label: s.status_name || s.name || "Inconnu",
            })) || []),
          ],
          rating: MOCK_OPTIONS.rating,
        });
        setAvailableTags(meta.tags || []);
      } catch (error) {
        console.error("Erreur métadonnées", error);
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    if (isEditMode && gameToEdit) {
      const genreId =
        typeof gameToEdit.genre_id === "object"
          ? gameToEdit.genre_id?._id
          : gameToEdit.genre_id;
      const platformId =
        typeof gameToEdit.platform_id === "object"
          ? gameToEdit.platform_id?._id
          : gameToEdit.platform_id;
      const statusId =
        typeof gameToEdit.status_id === "object"
          ? gameToEdit.status_id?._id
          : gameToEdit.status_id;
      const tagsIds =
        gameToEdit.tags_ids?.map((t) => (typeof t === "object" ? t._id : t)) ||
        [];

      setFormData({
        name: gameToEdit.name || "",
        description: gameToEdit.description || "",
        rating: gameToEdit.note || "",
        comment: gameToEdit.comment || "",
        genre: genreId || "",
        platform: platformId || "",
        year: gameToEdit.year || "",
        playTime: gameToEdit.playing_time || "",
        developer: gameToEdit.developer || "",
        achievements: gameToEdit.succes || "",
        status: statusId || "",
        tags: tagsIds,
        isSoon: gameToEdit.isSoon || false,
        isFavorite: gameToEdit.isFavorite || false,
        image: null,
      });

      if (gameToEdit.image) {
        const imgUrl = gameToEdit.image.startsWith("http")
          ? gameToEdit.image
          : `${import.meta.env.VITE_API_URL}${gameToEdit.image}`;
        setPreviewImg(imgUrl);
      }
    }
  }, [isEditMode, gameToEdit]);

  useEffect(() => {
    const handleIntersect = (entries) => {
      if (isClickScrolling.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    };
    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    });
    const sections = document.querySelectorAll(".form-section");
    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      isClickScrolling.current = true;
      setActiveSection(id);
      setShowMobileMenu(false);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    if (tagInput.trim() === "") {
      setSuggestedTags([]);
    } else {
      const lowerInput = tagInput.toLowerCase();
      const suggestions = availableTags.filter(
        (tag) =>
          tag.tag_name?.toLowerCase().includes(lowerInput) &&
          !formData.tags.includes(tag._id),
      );
      setSuggestedTags(suggestions);
    }
  }, [tagInput, formData.tags, availableTags]);

  const addTag = async (tagVal) => {
    if (!tagVal) return;
    let tagToAdd = null;
    if (typeof tagVal === "object") {
      tagToAdd = availableTags.find((t) => t._id === tagVal._id);
    } else {
      const trimmed = tagVal.trim();
      if (!trimmed) return;
      tagToAdd = availableTags.find(
        (t) => t.tag_name?.toLowerCase() === trimmed.toLowerCase(),
      );
      if (!tagToAdd) {
        try {
          const newTagData = await createMetadata("tag", {
            tag_name: trimmed,
            order: availableTags.length,
            color: "#5AF2FF",
          });
          tagToAdd = newTagData;
          setAvailableTags((prev) => [...prev, tagToAdd]);
        } catch (error) {
          console.error("Erreur lors de la création automatique du tag", error);
          return;
        }
      }
    }
    if (tagToAdd && !formData.tags.includes(tagToAdd._id)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagToAdd._id] }));
      setTagInput("");
      setSuggestedTags([]);
    }
  };

  const handleRemoveTag = (tagIdToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tagId) => tagId !== tagIdToRemove),
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  // Générateur de couleur hexadécimale aléatoire
  const getRandomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  };

  // Ajout rapide de métadonnée
  const handleAddNewMetadata = async (type) => {
    const labels = {
        genre: "Nouveau genre",
        platform: "Nouvelle plateforme",
        status: "Nouveau statut"
    };
    const nameFields = {
        genre: "genre_name",
        platform: "platform_name",
        status: "status_name"
    };

    const newValue = window.prompt(`Entrez le nom pour : ${labels[type]}`);
    if (!newValue || newValue.trim() === "") return;

    setIsAnimating(true);
    try {
        const payload = {
            [nameFields[type]]: newValue.trim(),
            color: getRandomColor()
        };
        const newItem = await createMetadata(type, payload);
        
        setOptionsData(prev => ({
            ...prev,
            [type]: [
                ...prev[type],
                { value: newItem._id, label: newItem[nameFields[type]] }
            ]
        }));

        setFormData(prev => ({
            ...prev,
            [type]: newItem._id
        }));
    } catch (error) {
        console.error(`Erreur lors de l'ajout de ${type}`, error);
        alert("Erreur lors de la création de la catégorie.");
    } finally {
        setIsAnimating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.genre || !formData.platform || !formData.status) {
      alert("Veuillez sélectionner un Genre, une Plateforme et un Statut.");
      return;
    }

    setIsAnimating(true);
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("description", formData.description);
      if (formData.rating) submitData.append("note", formData.rating);
      if (formData.comment) submitData.append("comment", formData.comment);

      submitData.append("genre_id", formData.genre);
      submitData.append("platform_id", formData.platform);
      submitData.append("status_id", formData.status);

      if (formData.year) submitData.append("year", formData.year);
      if (formData.playTime) submitData.append("playing_time", formData.playTime);
      if (formData.developer) submitData.append("developer", formData.developer);
      if (formData.achievements) submitData.append("succes", formData.achievements);

      submitData.append("isSoon", formData.isSoon);
      submitData.append("isFavorite", formData.isFavorite);

      formData.tags.forEach((tagId) => submitData.append("tags_ids", tagId));

      if (formData.image instanceof File) {
        submitData.append("image", formData.image);
      } else if (isEditMode && gameToEdit.image) {
        submitData.append("image", gameToEdit.image); // Correction pour ne pas perdre l'image
      }

      if (isEditMode) {
        await updateGame(gameToEdit._id, submitData);
      } else {
        await createGame(submitData);
      }

      setTimeout(() => navigate("/list"), 1500);
    } catch (error) {
      console.error("Erreur de sauvegarde", error.response?.data || error.message);
      alert("Une erreur est survenue lors de l'enregistrement. Vérifiez vos données.");
    } finally {
      setIsAnimating(false);
    }
  };

  return {
    t, navigate, isEditMode, gameToEdit, activeSection, showMobileMenu, setShowMobileMenu,
    scrollToSection, formData, setFormData, handleChange, handleFileChange, handleSubmit,
    tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag,
    previewImg, isAnimating, optionsData, availableTags, handleAddNewMetadata
  };
};