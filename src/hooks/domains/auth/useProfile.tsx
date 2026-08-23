import { useState } from 'react'
import { useOutletContext } from 'react-router'

import { useToast } from '@/context'
import { useAuth } from '@/context/AuthContext'
import { useApiAuth } from '@/hooks/api/useApiAuth'
import {
    getInitialProfileForm,
    handleDeleteAccountAsync,
    handleDownloadUserData,
    handleSaveProfileAsync,
} from '@/hooks/domains/auth/utils/profileHandlers'
import { triggerAchievementCheck } from '@/services/achievementService'
import { incrementStoredUserMetric } from '@/utils/userStorage'
import { getFirstValidationError, validateProfile } from '@/utils/validators'

export const useProfile = () => {
  const { t } = useOutletContext<any>()

  const { user, profile, refreshProfile } = useAuth()
  const mergedUser = user && profile ? { ...profile, ...user } : user
  const { updateProfile, deleteAccount, logout } = useApiAuth()
  const { showSuccess, showError, showUpdated, showDeleted } = useToast()

  const [form, setForm] = useState(() => getInitialProfileForm(mergedUser))

  const [uiState, setUiState] = useState({
    showEmailForm: false,
    showPasswordForm: false,
    showFirstnameForm: false,
    showLastnameForm: false,
    showUsernameForm: false,
    showDeletePopup: false,
    showMobileMenu: false,
  })

  const [prevUser, setPrevUser] = useState(mergedUser)

  const [isSaving, setIsSaving] = useState(false)

  if (JSON.stringify(mergedUser) !== JSON.stringify(prevUser)) {
    setPrevUser(mergedUser)
    setForm(getInitialProfileForm(mergedUser))
  }

  const handleSaveProfile = async (type: 'all' | 'email' | 'password' | 'firstname' | 'lastname' | 'username' | 'avatar' = 'all') => {
    setIsSaving(true)
    try {
      const validationErrors = validateProfile(form)
      
      let relevantErrors = validationErrors;
      if (type === 'email') relevantErrors = { email: validationErrors.email };
      else if (type === 'password') relevantErrors = { password: validationErrors.password, confirmPassword: validationErrors.confirmPassword };
      else if (type === 'firstname') relevantErrors = { firstname: validationErrors.firstname };
      else if (type === 'lastname') relevantErrors = { lastname: validationErrors.lastname };
      else if (type === 'username') relevantErrors = { username: validationErrors.username };
      else if (type === 'avatar') relevantErrors = {}; // No string validation for avatar

      const firstError = getFirstValidationError(relevantErrors)
      if (firstError) {
        showError(firstError)
        return
      }

      let payload: any = { ...form };
      if (type === 'email') payload = { email: form.email };
      else if (type === 'password') payload = { password: form.password };
      else if (type === 'firstname') payload = { firstname: form.firstname };
      else if (type === 'lastname') payload = { lastname: form.lastname };
      else if (type === 'username') payload = { username: form.username };
      else if (type === 'avatar') payload = { imageFile: form.imageFile };

      await handleSaveProfileAsync(
        payload,
        mergedUser,
        updateProfile,
        showError,
        showUpdated
      )

      if (refreshProfile) refreshProfile()
      incrementStoredUserMetric('profileUpdatedCount')
      triggerAchievementCheck()

      setForm((prev: any) => ({ ...prev, password: '', confirmPassword: '' }))
      
      if (type === 'email') setUiState((prev: any) => ({ ...prev, showEmailForm: false }))
      else if (type === 'password') setUiState((prev: any) => ({ ...prev, showPasswordForm: false }))
      else if (type === 'firstname') setUiState((prev: any) => ({ ...prev, showFirstnameForm: false }))
      else if (type === 'lastname') setUiState((prev: any) => ({ ...prev, showLastnameForm: false }))
      else if (type === 'username') setUiState((prev: any) => ({ ...prev, showUsernameForm: false }))
      else {
        setUiState((prev: any) => ({
          ...prev, showEmailForm: false, showPasswordForm: false,
          showFirstnameForm: false, showLastnameForm: false, showUsernameForm: false
        }))
      }
      
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    try {
      await handleDeleteAccountAsync(mergedUser, deleteAccount, logout, showDeleted, showError)
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleDownloadData = () => {
    handleDownloadUserData(mergedUser)
  }

  return {
    user: mergedUser,
    form,
    setForm,
    uiState,
    setUiState,
    t,
    isSaving,
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData,
  }
}
