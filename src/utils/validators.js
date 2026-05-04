/**
 * Validation utilities pour les formulaires
 */

export const validateProfile = (form) => {
  const errors = {};

  // Firstname
  if (form.firstname && form.firstname.trim().length < 2) {
    errors.firstname = "Le prénom doit contenir au moins 2 caractères";
  }

  // Lastname
  if (form.lastname && form.lastname.trim().length < 2) {
    errors.lastname = "Le nom doit contenir au moins 2 caractères";
  }

  // Username
  if (form.username && form.username.trim().length < 3) {
    errors.username = "Le pseudo doit contenir au moins 3 caractères";
  }
  if (form.username && form.username.trim().length > 50) {
    errors.username = "Le pseudo doit contenir maximum 50 caractères";
  }

  // Email
  if (form.email && !isValidEmail(form.email)) {
    errors.email = "Veuillez entrer une adresse email valide";
  }

  // Password
  if (form.password) {
    if (form.password.length < 6) {
      errors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }
    if (form.password.length > 100) {
      errors.password = "Le mot de passe est trop long";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
  }

  return errors;
};

export const validateCategory = (name) => {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = "Le nom est requis";
  } else if (name.trim().length < 2) {
    errors.name = "Le nom doit contenir au moins 2 caractères";
  } else if (name.trim().length > 50) {
    errors.name = "Le nom ne doit pas dépasser 50 caractères";
  }

  return errors;
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getFirstValidationError = (errors) => {
  const keys = Object.keys(errors);
  if (keys.length > 0) {
    return errors[keys[0]];
  }
  return null;
};
