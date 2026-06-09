import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

export interface ToastState {
  isVisible: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
  duration: number;
}

export interface ToastContextType {
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type'], duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showCreated: (itemName: string, duration?: number) => void;
  showUpdated: (itemName: string, duration?: number) => void;
  showDeleted: (itemName: string, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    type: 'success', // 'success', 'error', 'info'
    message: '',
    duration: 3000,
  })

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success', duration = 3000) => {
    setToast({
      isVisible: true,
      type,
      message,
      duration,
    })

    // Auto-hide
    setTimeout(() => {
      setToast((prev: any) => ({ ...prev, isVisible: false }))
    }, duration)
  }, [])

  const showSuccess = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  )
  const showError = useCallback(
    (message: string, duration = 3500) => showToast(message, 'error', duration),
    [showToast]
  )
  const showInfo = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  )
  const showCreated = useCallback(
    (itemName: string, duration?: number) => showToast(`✓ ${itemName} créé(e) avec succès`, 'success', duration),
    [showToast]
  )
  const showUpdated = useCallback(
    (itemName: string, duration?: number) =>
      showToast(`✓ ${itemName} mis(e) à jour avec succès`, 'success', duration),
    [showToast]
  )
  const showDeleted = useCallback(
    (itemName: string, duration?: number) => showToast(`✓ ${itemName} supprimé(e) avec succès`, 'success', duration),
    [showToast]
  )

  const hideToast = useCallback(() => {
    setToast((prev: any) => ({ ...prev, isVisible: false }))
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
