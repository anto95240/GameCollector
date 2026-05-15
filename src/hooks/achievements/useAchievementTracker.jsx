import { useEffect, useCallback, useRef } from "react";
import { useApiAuth } from "../api/useApiAuth";
import { useApiAchievements } from "../api/useApiAchievements";
import { readStoredUser, writeStoredUser, mergeStoredUser } from "../../utils/userStorage";

export const useAchievementTracker = () => {
  const { getMe } = useApiAuth();
  const { unlockAchievement, getUserAchievements, getAllAchievements, getAchievementStats } = useApiAchievements();

  const processedRef = useRef(new Set());

  const normalizeText = (value) => (
    String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  );

  const evaluateAchievementCondition = (achievement, stats) => {
    const idName = normalizeText(achievement?.id_name || achievement?.idName || achievement?.slug || achievement?.title);
    
    switch (idName) {
      case "insert_coin": return stats.totalGames >= 1;
      case "critique_art": return stats.reviewedGamesCount > 0;
      case "coup_de_foudre": return stats.favoritesCount > 0;
      case "identite_secrete": return stats.profileUpdatedCount > 0;
      case "mon_precieux": return stats.customCategoriesCreated > 0;
      case "etagere_virtuelle": return stats.totalGames >= 10;
      case "boutique_independante": return stats.totalGames >= 50;
      case "musee_jeu_video": return stats.totalGames >= 100;
      case "generique_fin": return stats.completedGamesCount >= 10;
      case "completionniste": return stats.completedGamesCount >= 25;
      case "backlog_sueur": return stats.soonGamesCount > 20;
      case "guerre_consoles": return stats.uniquePlatformsCount >= 5;
      case "eclectique": return stats.uniqueGenresCount >= 7;
      case "retro_gamer": return stats.retroGamesCount > 0;
      case "archiviste": return stats.archivisteCount > 0;
      case "data_analyst": return stats.viewedStats;
      case "nostalgie": return stats.startupAnimationSeen;
      case "its_a_me": return stats.marioGames > 0;
      case "rage_quit": return stats.deletedGamesCount > 0;
      case "voyage_temps": return stats.historyCount >= 10;
      case "insomniaque": return stats.lateNightActionsCount > 0;
      default: return false;
    }
  };

  const checkAchievements = useCallback(async () => {
    try {
      // Nettoyage définitif de la dette technique pour tous les utilisateurs
      localStorage.removeItem("games_list_cache");

      // On récupère le user (local UI stats + appel API de sécurité)
      const currentUser = await getMe().catch(() => null);
      const fallbackUser = readStoredUser() || {};
      const user = { ...fallbackUser, ...(currentUser || {}) };
      
      const userId = currentUser?._id || currentUser?.id || currentUser?.uid;
      if (!userId) return;

      // On fusionne les stats UI locales avec les stats Jeux venues du Backend
      const backendStats = await getAchievementStats();
      const stats = { ...user, ...backendStats };
      
      const allAchievements = await getAllAchievements() || [];
      const unlockedFromDb = await getUserAchievements() || [];
      
      const alreadyUnlocked = new Set(
        unlockedFromDb.map(ua => ua.id_name).filter(Boolean)
      );
      
      for (const achievement of allAchievements) {
        const idName = achievement?.id_name;
        if (!idName) continue;
        
        // On passe si le trophée est déjà traité ou déjà débloqué
        if (processedRef.current.has(idName) || alreadyUnlocked.has(idName)) continue;
        
        // Vérification de la condition avec les stats consolidées
        if (evaluateAchievementCondition(achievement, stats)) {
          try {
            const response = await unlockAchievement(idName);
            processedRef.current.add(idName);
            
            // Mise à jour locale pour éviter une désynchronisation
            if (response?.user) {
              writeStoredUser(response.user);
            }
            
            // Déclencher la notification visuelle (Toast)
            window.dispatchEvent(new CustomEvent('achievementUnlocked', {
              detail: {
                idName,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon
              }
            }));
          } catch (error) {
            console.error(`[Achievement] Erreur déverrouillage ${idName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("[Achievement] Erreur générale Tracker:", error);
    }
  }, [getMe, unlockAchievement, getUserAchievements, getAllAchievements, getAchievementStats]);

  // Écouteurs d'événements
  useEffect(() => {
    checkAchievements(); // Vérif au démarrage

    const handleCheckAchievements = () => checkAchievements();
    
    window.addEventListener('checkAchievements', handleCheckAchievements);
    
    return () => {
      window.removeEventListener('checkAchievements', handleCheckAchievements);
    };
  }, [checkAchievements]);

  return { checkAchievements };
};