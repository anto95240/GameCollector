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
  const mergedUser = user && profile ? { ...user, ...profile } : user
  const { updateProfile, deleteAccount, logout } = useApiAuth()
  const { showSuccess, showError, showUpdated, showDeleted } = useToast()

  const [form, setForm] = useState(() => getInitialProfileForm(mergedUser))

  const [uiState, setUiState] = useState({
    showEmailForm: false,
    showPasswordForm: false,
    showDeletePopup: false,
    showMobileMenu: false,
  })

  const [prevUser, setPrevUser] = useState(mergedUser)

  if (JSON.stringify(mergedUser) !== JSON.stringify(prevUser)) {
    setPrevUser(mergedUser)
    setForm(getInitialProfileForm(mergedUser))
  }

  const handleSaveProfile = async () => {
    try {
      const validationErrors = validateProfile(form)
      const firstError = getFirstValidationError(validationErrors)
      if (firstError) {
        showError(firstError)
        return
      }

      await handleSaveProfileAsync(
        form,
        mergedUser,
        updateProfile,
        showError,
        showUpdated
      )

      if (refreshProfile) refreshProfile()
      incrementStoredUserMetric('profileUpdatedCount')
      triggerAchievementCheck()

      setForm((prev: any) => ({ ...prev, password: '', confirmPassword: '' }))
      setUiState((prev: any) => ({ ...prev, showEmailForm: false, showPasswordForm: false }))
    } catch (err: any) {
      console.error(err)
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
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData,
  }
}
