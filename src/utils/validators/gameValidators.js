export const validateCategory = (name) => {
  const errors = {}

  if (!name || !name.trim()) {
    errors.name = 'Le nom est requis'
  } else if (name.trim().length < 2) {
    errors.name = 'Le nom doit contenir au moins 2 caractères'
  } else if (name.trim().length > 50) {
    errors.name = 'Le nom ne doit pas dépasser 50 caractères'
  }

  return errors
}
