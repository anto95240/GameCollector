/**
 * Logique d'initialisation et gestion des données du formulaire
 */

export const getInitialFormData = (gameToEdit = null) => {
  if (!gameToEdit) {
    return {
      name: "", description: "", rating: "", comment: "", genre: "",
      platform: "", year: "", playTime: "", developer: "", achievements: "",
      status: "", isSoon: false, isFavorite: false, image: null, tags: []
    };
  }

  return {
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
    tags: []
  };
};

export const buildGamePayload = (formData, selectedTags, image = null, existingImage = null) => {
  const submitData = new FormData();
  
  // Mapper les champs correctement
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
  
  // Gestion de l'image - IMPORTANT: Envoyer UNIQUEMENT les fichiers File, jamais les strings
  if (image instanceof File) {
    submitData.append("image", image);
  }
  // SINON (mode édition sans changement d'image), NE PAS envoyer le champ image
  // Le backend gardera l'ancienne image
  
  // Ajouter les tags
  selectedTags?.forEach(id => submitData.append("tags_ids", id));

  return submitData;
};

export const formatPreviewImage = (imageUrl, apiUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${apiUrl || "http://localhost:5000"}${imageUrl}`;
};
