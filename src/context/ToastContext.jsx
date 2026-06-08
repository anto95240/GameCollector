import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    isVisible: false,
    type: 'success', // 'success', 'error', 'info'
    message: '',
    duration: 3000,
  })

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({
      isVisible: true,
      type,
      message,
      duration,
    })

    // Auto-hide
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }))
    }, duration)
  }, [])

  const showSuccess = useCallback(
    (message, duration) => showToast(message, 'success', duration),
    [showToast]
  )
  const showError = useCallback(
    (message, duration = 3500) => showToast(message, 'error', duration),
    [showToast]
  )
  const showInfo = useCallback(
    (message, duration) => showToast(message, 'info', duration),
    [showToast]
  )
  const showCreated = useCallback(
    (itemName, duration) => showToast(`✓ ${itemName} créé(e) avec succès`, 'success', duration),
    [showToast]
  )
  const showUpdated = useCallback(
    (itemName, duration) =>
      showToast(`✓ ${itemName} mis(e) à jour avec succès`, 'success', duration),
    [showToast]
  )
  const showDeleted = useCallback(
    (itemName, duration) => showToast(`✓ ${itemName} supprimé(e) avec succès`, 'success', duration),
    [showToast]
  )

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }))
  }, [])

  return (
    <ToastContext.Provider
      value={{
        toast,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showCreated,
        showUpdated,
        showDeleted,
        hideToast,
      }}
    >
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast doit être utilisé à l'intérieur d'un ToastProvider")
  }
  return context
}
