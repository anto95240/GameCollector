export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateProfile = (form: any) => {
  const errors: Record<string, any> = {}

  // Firstname
  if (form.firstname && form.firstname.trim().length < 2) {
    errors.firstname = 'Le prénom doit contenir au moins 2 caractères'
  }

  // Lastname
  if (form.lastname && form.lastname.trim().length < 2) {
    errors.lastname = 'Le nom doit contenir au moins 2 caractères'
  }

  // Username
  if (form.username && form.username.trim().length < 3) {
    errors.username = 'Le pseudo doit contenir au moins 3 caractères'
  }
  if (form.username && form.username.trim().length > 50) {
    errors.username = 'Le pseudo doit contenir maximum 50 caractères'
  }

  // Email
  if (form.email && !isValidEmail(form.email)) {
    errors.email = 'Veuillez entrer une adresse email valide'
  }

  // Password
  if (form.password) {
    if (form.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }
    if (form.password.length > 100) {
      errors.password = 'Le mot de passe est trop long'
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }
  }

  return errors
}
