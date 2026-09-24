import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { migrateLocalStorage, normalizeThemeId } from '@/config/themeMigration'
import { supabase } from '@/lib/supabase'

interface ThemeContextType {
  activePreset: string
  setPreset: (preset: string) => Promise<void>
  isLoadingSync: boolean
  setIsPreviewMode: (val: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [activePreset, setActivePreset] = useState<string>(() => {
    // Migrer en premier : normalise gc_equipped_theme et gc_known_unlocked_themes
    migrateLocalStorage()
    try {
      const stored = localStorage.getItem('gc_equipped_theme')
      const val = stored ? normalizeThemeId(JSON.parse(stored)) : 'neon_night'
      return val
    } catch {
      return 'neon_night'
    }
  })
  const [isLoadingSync, setIsLoadingSync] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const userIdRef = useRef<string | null>(null)

  // Écouter les changements d'authentification pour synchroniser
  useEffect(() => {
    const fetchUserAndTheme = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        userIdRef.current = user.id
        // Récupérer le thème équipé depuis Supabase
        const { data, error } = await supabase
          .from('user_themes')
          .select('theme:themes(id_name)')
          .eq('user_id', user.id)
          .eq('is_equipped', true)
          .maybeSingle()

        const themeData = data?.theme as any
        const rawRemote = Array.isArray(themeData) ? themeData[0]?.id_name : themeData?.id_name
        const remoteTheme = rawRemote ? normalizeThemeId(rawRemote) : null

        if (!error && remoteTheme) {
          if (remoteTheme !== activePreset) {
            applyThemeLocal(remoteTheme)
          }
        }
      }
      setIsLoadingSync(false)
    }

    fetchUserAndTheme()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (session.user.id !== userIdRef.current) {
          setUserId(session.user.id)
          userIdRef.current = session.user.id
          // Only fetch theme if it's a completely new user login, to avoid overwriting on focus
          const { data } = await supabase
            .from('user_themes')
            .select('theme:themes(id_name)')
            .eq('user_id', session.user.id)
            .eq('is_equipped', true)
            .maybeSingle()

          const themeData = data?.theme as any
          const rawRemote2 = Array.isArray(themeData) ? themeData[0]?.id_name : themeData?.id_name
          const remoteTheme = rawRemote2 ? normalizeThemeId(rawRemote2) : null

          if (remoteTheme && remoteTheme !== activePreset) {
            applyThemeLocal(remoteTheme)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        userIdRef.current = null
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  function applyThemeLocal(themeId: string) {
    // Appliquer au DOM immédiatement pour que le CSS change instantanément
    if (!isPreviewMode) {
      document.documentElement.setAttribute('data-preset', themeId)
    }
    localStorage.setItem('gc_equipped_theme', JSON.stringify(themeId))

    // La transition globale ayant été optimisée, on peut mettre à jour React
    // en priorité basse pour ne pas saccader l'UI (le DOM CSS est déjà mis à jour)
    startTransition(() => {
      setActivePreset(themeId)
    })
  }

  // Appliquer le thème initialement (au cas où le script index.html n'a pas tourné ou pour react)
  useEffect(() => {
    if (!isPreviewMode) {
      document.documentElement.setAttribute('data-preset', activePreset)
    }
  }, [activePreset, isPreviewMode])

  const setPreset = useCallback(
    async (presetId: string) => {
      // 1. Appliquer localement instantanément pour la fluidité (Optimistic UI)
      applyThemeLocal(presetId)

      // 2. Synchroniser avec Supabase si connecté
      if (userId) {
        try {
          // D'abord trouver l'ID du thème via id_name
          const { data: themeData } = await supabase
            .from('themes')
            .select('id')
            .eq('id_name', presetId)
            .maybeSingle()

          if (themeData) {
            // Déséquiper tous les thèmes
            await supabase.from('user_themes').update({ is_equipped: false }).eq('user_id', userId)

            // Équiper le nouveau
            const { data: existing } = await supabase
              .from('user_themes')
              .select('id')
              .eq('user_id', userId)
              .eq('theme_id', themeData.id)
              .maybeSingle()

            let syncError = null
            if (existing) {
              const { error } = await supabase
                .from('user_themes')
                .update({ is_equipped: true })
                .eq('id', existing.id)
              syncError = error
            } else {
              const { error } = await supabase
                .from('user_themes')
                .insert({ user_id: userId, theme_id: themeData.id, is_equipped: true })
              syncError = error
            }

            if (syncError) {
              console.error('Erreur sync thème:', syncError)
            }
          }
        } catch (e: any) {
          console.error('Erreur inattendue sync thème:', e)
        }
      }
    },
    [userId]
  )

  return (
    <ThemeContext.Provider
      value={{
        activePreset,
        setPreset,
        isLoadingSync,
        setIsPreviewMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider")
  }
  return context
}
