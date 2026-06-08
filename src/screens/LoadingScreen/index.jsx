import { useSearchParams } from 'react-router'

import ChargementPage from '@/screens/Chargement'

const LoadingScreen = () => {
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('variant') || 'login'
  let returnTo = searchParams.get('returnTo')

  // Décoder l'URL si elle est encodée
  if (returnTo) {
    try {
      returnTo = decodeURIComponent(returnTo)
    } catch (e) {
      console.error('Erreur décodage returnTo:', e)
      returnTo = variant === 'logout' ? '/' : '/dashboard'
    }
  } else {
    returnTo = variant === 'logout' ? '/' : '/dashboard'
  }

  return <ChargementPage variant={variant} returnTo={returnTo} />
}

export default LoadingScreen
