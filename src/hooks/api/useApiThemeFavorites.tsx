// src/hooks/api/useApiThemeFavorites.tsx
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

/**
 * Hook pour gérer les thèmes favoris de l'utilisateur.
 * Lit/écrit dans la table `user_theme_favorites`.
 */
export const useApiThemeFavorites = () => {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // Charger les favoris depuis Supabase
  useEffect(() => {
    if (!user) {
      setFavorites(new Set())
      setIsLoading(false)
      return
    }

    const fetchFavorites = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('user_theme_favorites')
        .select('theme_id')
        .eq('user_id', user.id)

      if (!error && data) {
        setFavorites(new Set(data.map((row) => row.theme_id)))
      }
      setIsLoading(false)
    }

    fetchFavorites()
  }, [user])

  /** Ajouter un thème aux favoris */
  const addFavorite = useCallback(
    async (themeId: string) => {
      if (!user) return
      // Optimistic update
      setFavorites((prev) => new Set([...prev, themeId]))

      const { error } = await supabase
        .from('user_theme_favorites')
        .insert({ user_id: user.id, theme_id: themeId })

      if (error) {
        // Rollback
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(themeId)
          return next
        })
        console.error('Erreur ajout favori:', error)
      }
    },
    [user]
  )

  /** Retirer un thème des favoris */
  const removeFavorite = useCallback(
    async (themeId: string) => {
      if (!user) return
      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev)
        next.delete(themeId)
        return next
      })

      const { error } = await supabase
        .from('user_theme_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('theme_id', themeId)

      if (error) {
        // Rollback
        setFavorites((prev) => new Set([...prev, themeId]))
        console.error('Erreur suppression favori:', error)
      }
    },
    [user]
  )

  /** Toggle favori */
  const toggleFavorite = useCallback(
    (themeId: string) => {
      if (favorites.has(themeId)) {
        removeFavorite(themeId)
      } else {
        addFavorite(themeId)
      }
    },
    [favorites, addFavorite, removeFavorite]
  )

  const isFavorite = useCallback((themeId: string) => favorites.has(themeId), [favorites])

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  }
}
