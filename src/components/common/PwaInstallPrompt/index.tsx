import { useEffect, useState } from 'react'

import { useToast } from '@/context'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const PwaInstallPrompt = () => {
  const [_deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { showToast, dismissToast } = useToast()

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Show our custom install toast
      const toastId = showToast(
        "📱 Installez l'application GameCollector sur votre appareil pour une meilleure expérience !",
        'info',
        Infinity, // Keeps the toast open
        {
          actionLabel: 'Installer',
          onAction: async () => {
            // Show the install prompt
            promptEvent.prompt()
            // Wait for the user to respond to the prompt
            const { outcome } = await promptEvent.userChoice
            if (outcome === 'accepted') {
              console.debug('User accepted the install prompt')
            } else {
              console.debug('User dismissed the install prompt')
            }
            // We no longer need the prompt. Clear it up.
            setDeferredPrompt(null)
            dismissToast(toastId)
          },
        }
      )
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Detect when the app was successfully installed
    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null)
      console.debug('PWA was installed')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [showToast, dismissToast])

  return null
}

export default PwaInstallPrompt
