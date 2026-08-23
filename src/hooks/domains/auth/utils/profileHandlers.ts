export const handleSaveProfileAsync = async (form: any, user: any, updateProfile: any, showError: any, showUpdated: any) => {
  try {
    const formData = new FormData()

    ;['firstname', 'lastname', 'username', 'email'].forEach((key: any) => {
      if (form[key]) formData.append(key, form[key])
    })

    if (form.password) {
      formData.append('password', form.password)
    }

    if (form.imageFile) {
      formData.append('image', form.imageFile)
    }
    const updatedUser = await updateProfile(user?.id, formData)
    
    if (form.email && form.email !== user?.email) {
      showUpdated('Un lien de confirmation a été envoyé à votre nouvelle adresse email.', 'Info')
    } else {
      showUpdated('Votre profil')
    }

    return updatedUser
  } catch (err: any) {
    console.error('Erreur lors de la mise à jour du profil :', err)
    
    if (err?.message?.includes('New password should be different from the old password') || err?.message?.includes('different from the old password')) {
      showError("Le nouveau mot de passe doit être différent de l'ancien.")
    } else {
      showError('Une erreur est survenue lors de la mise à jour.')
    }
    
    throw err
  }
}

export const handleDeleteAccountAsync = async (
  user: any,
  deleteAccount: any,
  logout: any,
  showDeleted: any,
  showError: any
) => {
  try {
    await deleteAccount(user.uid)
    showDeleted('Votre compte')
    await logout()
  } catch (err: any) {
    console.error('Erreur lors de la suppression :', err)
    showError('Erreur lors de la suppression du compte.')
    throw err
  }
}

export const handleDownloadUserData = (user: any) => {
  const dataToExport = {
    userProfile: user,
    exportDate: new Date().toISOString(),
  }

  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2))

  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', `user_data_${user.username || 'export'}.json`)

  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

export const formatUserAvatarURL = (user: any) => {
  if (!user?.image) return ''
  return user.image
}

export const getInitialProfileForm = (user: any) => {
  if (!user) {
    return {
      firstname: '',
      lastname: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      imageFile: null,
      avatarURL: '',
    }
  }

  return {
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    username: (user?.username && user.username !== user.email) ? user.username : '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    imageFile: null,
    avatarURL: formatUserAvatarURL(user),
  }
}
