export const isValidEmail = (email: string) => {
  // Stricter RFC 5322 standard email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

export const validateProfile = (form: any) => {
  const errors: Record<string, string> = {};

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
  } else if (form.username && !/^[a-zA-Z0-9_-]+$/.test(form.username)) {
    errors.username = "Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores";
  }
  if (form.username && form.username.trim().length > 50) {
    errors.username = "Le pseudo doit contenir maximum 50 caractères";
  }

  // Email
  if (form.email && !isValidEmail(form.email)) {
    errors.email = "Veuillez entrer une adresse email valide";
  }

  // Avatar URL (if applicable, let's just make it robust)
  if (form.avatarUrl && !isValidUrl(form.avatarUrl)) {
    errors.avatarUrl = "L'URL de l'avatar n'est pas valide";
  }

  // Password
  if (form.password) {
    if (form.password.length < 8) { // Stricter password requirement
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre";
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
