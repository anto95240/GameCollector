import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { useToast } from '@/context'

const PwaUpdater = () => {
  const { showToast, dismissToast } = useToast()

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered')
    },
    onRegisterError(error: unknown) {
      console.log('SW registration error', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      const toastId = showToast(
        '✨ Level Up ! Une nouvelle mise à jour est disponible.',
        'info',
        Infinity, // Le toast reste jusqu'à ce que l'utilisateur clique
        {
          actionLabel: 'Installer',
          onAction: () => {
            updateServiceWorker(true)
            // dismissToast sera géré automatiquement par l'action du ValidationToast
            // ou par le rechargement de la page provoqué par le service worker.
          },
        }
      )

      // Cleanup si le composant est démonté
      return () => dismissToast(toastId)
    }
  }, [needRefresh, showToast, updateServiceWorker, dismissToast])

  return null
}

export default PwaUpdater
