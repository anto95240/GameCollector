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

    const updatedUser = await updateProfile(user.uid, formData)
    showUpdated('Votre profil')

    return updatedUser
  } catch (err: any) {
    console.error('Erreur lors de la mise à jour du profil :', err)
    showError('Une erreur est survenue lors de la mise à jour.')
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

export const formatUserAvatarURL = (user: any, apiUrl: any) => {
  if (!user?.image) return ''
  if (user.image.startsWith('http')) return user.image
  return `${apiUrl}/${user.image}`
}

export const getInitialProfileForm = (user: any, apiUrl: any) => {
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
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    imageFile: null,
    avatarURL: formatUserAvatarURL(user, apiUrl),
  }
}
