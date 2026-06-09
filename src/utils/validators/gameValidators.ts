import { isValidUrl } from "./userValidators";

export const validateCategory = (name: string) => {
  const errors: Record<string, string> = {};

  if (!name || !name.trim()) {
    errors.name = "Le nom est requis";
  } else if (name.trim().length < 2) {
    errors.name = "Le nom doit contenir au moins 2 caractères";
  } else if (name.trim().length > 50) {
    errors.name = "Le nom ne doit pas dépasser 50 caractères";
  } else if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) {
    errors.name = "Le nom contient des caractères non autorisés";
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
  } else if (typeof formData.image === 'string' && formData.image.startsWith('http') && !isValidUrl(formData.image)) {
    errors.image = "L'URL de l'image n'est pas valide";
  }

  return errors;
};
