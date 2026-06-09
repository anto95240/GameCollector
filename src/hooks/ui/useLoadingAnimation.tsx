import { useEffect, useRef, useState } from 'react'

import { mergeStoredUser } from '@/utils/userStorage'

export const useLoadingAnimation = (variant = 'login', navigate: any, returnTo: string | null = null) => {
  const [progress, setProgress] = useState(0)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    hasCompletedRef.current = false
    let intervalId: any = null
    let completeTimerId: any = null
    let isMounted = true

    // Animate progress bar
    intervalId = setInterval(() => {
      if (!isMounted) return

      setProgress((prev: any) => {
        if (prev >= 100) {
          if (intervalId) clearInterval(intervalId)
          return 100
        }

        if (prev >= 90) return prev + 2
        return prev + Math.random() * 25
      })
    }, 150)

    // Force 100% et trigger la redirection
    completeTimerId = setTimeout(() => {
      if (!isMounted || hasCompletedRef.current) return

      hasCompletedRef.current = true
      setProgress(100)
      if (intervalId) clearInterval(intervalId)

      // Redirection après 400ms
      const finalTimer = setTimeout(() => {
        if (!isMounted) return

        mergeStoredUser({ startupAnimationSeen: true })

        if (navigate) {
          const destination = returnTo || (variant === 'logout' ? '/' : '/dashboard')
          navigate(destination)
        }
      }, 400)

      return () => clearTimeout(finalTimer)
    }, 1600)

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
      if (completeTimerId) clearTimeout(completeTimerId)
    }
  }, [variant, navigate, returnTo])

  return { progress }
}
