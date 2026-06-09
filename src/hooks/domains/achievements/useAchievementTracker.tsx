import { useCallback, useEffect, useRef } from 'react'

import { useApiAchievements } from '@/hooks/api/useApiAchievements'
import { useApiAuth } from '@/hooks/api/useApiAuth'
import { evaluateAchievementCondition } from '@/utils/parsers/achievementParser'
import { readStoredUser, writeStoredUser } from '@/utils/userStorage'

export const useAchievementTracker = () => {
  const { getMe } = useApiAuth()
  const { unlockAchievement, getUserAchievements, getAllAchievements, getAchievementStats } =
    useApiAchievements()

  const processedRef = useRef(new Set())

  const checkAchievements = useCallback(async () => {
    try {
      // Nettoyage définitif de la dette technique pour tous les utilisateurs
      localStorage.removeItem('games_list_cache')

      // On récupère le user (local UI stats + appel API de sécurité)
      const currentUser = await getMe().catch(() => null)
      const fallbackUser = readStoredUser() || {}
      const user = { ...fallbackUser, ...(currentUser || {}) }

      const userId = currentUser?._id || currentUser?.id || currentUser?.uid
      if (!userId) return

      // On fusionne les stats UI locales avec les stats Jeux venues du Backend
      const backendStats = await getAchievementStats()
      const stats = { ...user, ...backendStats }

      const allAchievements = (await getAllAchievements()) || []
      const unlockedFromDb = (await getUserAchievements()) || []

      const alreadyUnlocked = new Set(unlockedFromDb.map((ua: any) => ua.id_name).filter(Boolean))

      for (const achievement of allAchievements) {
        const idName = achievement?.id_name
        if (!idName) continue

        // On passe si le trophée est déjà traité ou déjà débloqué
        if (processedRef.current.has(idName) || alreadyUnlocked.has(idName)) continue

        // Vérification de la condition avec les stats consolidées
        if (evaluateAchievementCondition(achievement, stats)) {
          try {
            const response = await unlockAchievement(idName)
            processedRef.current.add(idName)

            // Mise à jour locale pour éviter une désynchronisation
            if (response?.user) {
              writeStoredUser(response.user)
            }

            // Déclencher la notification visuelle (Toast)
            window.dispatchEvent(
              new CustomEvent('achievementUnlocked', {
                detail: {
                  idName,
                  title: achievement.title,
                  description: achievement.description,
                  icon: achievement.icon,
                },
              })
            )
          } catch (error: any) {
            console.error(`[Achievement] Erreur déverrouillage ${idName}:`, error)
          }
        }
      }
    } catch (error: any) {
      console.error('[Achievement] Erreur générale Tracker:', error)
    }
  }, [getMe, unlockAchievement, getUserAchievements, getAllAchievements, getAchievementStats])

  // Écouteurs d'événements
  useEffect(() => {
    checkAchievements() // Vérif au démarrage

    const handleCheckAchievements = () => checkAchievements()

    window.addEventListener('checkAchievements', handleCheckAchievements)

    return () => {
      window.removeEventListener('checkAchievements', handleCheckAchievements)
    }
  }, [checkAchievements])

  return { checkAchievements }
}
