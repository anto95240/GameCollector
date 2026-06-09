import { useCallback } from 'react'

// Map of route paths to their dynamic import functions
const routeImports = {
  '/dashboard': () => import('@/screens/Dashboard'),
  '/categories': () => import('@/screens/Category'),
  '/list': () => import('@/screens/Liste'),
  '/profile': () => import('@/screens/Profile'),
  '/statistics': () => import('@/screens/Statistique'),
  '/trophies': () => import('@/screens/Trophees'),
  '/game/add-edit-game': () => import('@/screens/AddEditGame'),
  '/login': () => import('@/screens/Login'),
  '/register': () => import('@/screens/Register'),
}

export function usePreloadRoute() {
  const preloadRoute = useCallback((path: any) => {
    if (!path) return

    if ((routeImports as any)[path]) {
      (routeImports as any)[path]().catch((err: any) => console.warn('Preload failed for', path, err))
    } else if (path.startsWith('/game/') && path !== '/game/add-edit-game') {
      import('@/screens/Detail').catch((err: any) => console.warn('Preload failed for detail', err))
    }
  }, [])

  return { preloadRoute }
}
