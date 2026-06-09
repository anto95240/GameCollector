export const validateCategory = (name: any) => {
  const errors: Record<string, string> = {};

  if (!name || !name.trim()) {
    errors.name = "Le nom est requis";
  } else if (name.trim().length < 2) {
    errors.name = "Le nom doit contenir au moins 2 caractères";
  } else if (name.trim().length > 50) {
    errors.name = "Le nom ne doit pas dépasser 50 caractères";
  }

  return errors;
};

export const validateGameForm = (formData: any) => {
  const errors: Record<string, string> = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = "Le nom du jeu est requis";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Le nom doit contenir au moins 2 caractères";
  }

  if (!formData.platform) {
    errors.platform = "La plateforme est requise";
  }

  if (!formData.genre) {
    errors.genre = "Le genre est requis";
  }

  if (!formData.status) {
    errors.status = "Le statut est requis";
  }
  
  if (!formData.image && typeof formData.image !== 'string') {
    errors.image = "Une image de couverture est requise";
  }

  return errors;
};
