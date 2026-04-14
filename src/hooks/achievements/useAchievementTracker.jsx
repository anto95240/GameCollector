import { useEffect, useCallback, useRef } from "react";
import { useApiAuth } from "../api/useApiAuth";
import { useApiAchievements } from "../api/useApiAchievements";
import { useApiMetadata } from "../api/useApiMetadata";

export const useAchievementTracker = () => {
  const { getMe, getGameHistory } = useApiAuth();
  const { unlockAchievement, getUserAchievements, getAllAchievements } = useApiAchievements();
  const { getAllMetadata } = useApiMetadata();
  const processedRef = useRef(new Set());

  const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.achievements)) return payload.achievements;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  };

  const normalizeText = (value) => (
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  );

  const extractAchievementIdName = (entry) => {
    if (!entry) return null;
    if (typeof entry === "string") return entry;
    if (entry.id_name) return entry.id_name;
    if (entry.idName) return entry.idName;
    if (entry.slug) return entry.slug;
    if (entry.achievement?.id_name) return entry.achievement.id_name;
    if (entry.achievement?.idName) return entry.achievement.idName;
    if (entry.achievement?.slug) return entry.achievement.slug;
    if (typeof entry.achievement === "string") return entry.achievement;
    if (entry._id) return entry._id;
    if (entry.id) return entry.id;
    return null;
  };

  const getAchievementIdentifiers = (achievement) => {
    const ids = [
      achievement?.id_name,
      achievement?.idName,
      achievement?.slug,
      achievement?._id,
      achievement?.id,
    ].filter(Boolean).map(String);

    return [...new Set(ids)];
  };

  const getStats = async (currentUser = null) => {
    try {
      const gamesCache = localStorage.getItem("games_list_cache");
      const gamesList = gamesCache ? JSON.parse(gamesCache) : [];
      const fallbackUser = JSON.parse(localStorage.getItem("user") || "{}");
      const user = {
        ...fallbackUser,
        ...(currentUser || {}),
      };
      const totalPlayTime = gamesList.reduce((acc, game) => acc + Number(game?.playing_time || 0), 0);
      const [metadataPayload, historyPayload] = await Promise.all([
        getAllMetadata().catch(() => null),
        getGameHistory().catch(() => []),
      ]);

      const metadata = metadataPayload || {};
      const historyGames = asArray(historyPayload);

      const resolveMetadataName = (collection, candidate, labelKey) => {
        const identifier = candidate?._id || candidate?.id || candidate || null;
        if (!identifier || !Array.isArray(collection)) return null;
        const byId = collection.find((item) => String(item?._id || item?.id) === String(identifier));
        if (byId) return byId[labelKey] || byId.name || null;
        if (candidate && typeof candidate === "string") return candidate;
        return null;
      };

      const resolvedGames = gamesList.map((game) => {
        const platformName = resolveMetadataName(metadata.platforms, game.platform_id || game.platform, "platform_name");
        const genreName = resolveMetadataName(metadata.genres, game.genre_id || game.genre, "genre_name");
        const statusName = resolveMetadataName(metadata.statuses, game.status_id || game.status, "status_name");

        return {
          ...game,
          platformName,
          genreName,
          statusName,
        };
      });

      const completedGamesCount = resolvedGames.filter((game) => normalizeText(game.statusName).includes("termine")).length;
      const soonGamesCount = resolvedGames.filter((game) => Boolean(game.isSoon) || normalizeText(game.statusName).includes("prochainement")).length;
      const uniquePlatformsCount = new Set(resolvedGames.map((game) => game.platformName || game.platform_id?._id || game.platform_id).filter(Boolean)).size;
      const uniqueGenresCount = new Set(resolvedGames.map((game) => game.genreName || game.genre_id?._id || game.genre_id).filter(Boolean)).size;
      const reviewedGamesCount = resolvedGames.filter((game) => game.note !== undefined && game.note !== null && String(game.comment || "").trim().length > 0).length;
      const retroGamesCount = resolvedGames.filter((game) => Number(game.year || 0) > 0 && Number(game.year) < 2000).length;
      const archivisteCount = resolvedGames.filter((game) => (
        String(game.description || "").trim().length > 0 &&
        game.note !== undefined && game.note !== null &&
        String(game.comment || "").trim().length > 0 &&
        Number(game.year || 0) > 0 &&
        Number(game.playing_time || 0) > 0 &&
        String(game.developer || "").trim().length > 0 &&
        String(game.succes || "").trim().length > 0 &&
        Array.isArray(game.tags_ids) && game.tags_ids.length > 0
      )).length;

      return {
        totalGames: gamesList.length,
        favoritesCount: gamesList.filter(g => g.isFavorite).length,
        marioGames: gamesList.filter(g => g.name?.toLowerCase().includes("mario")).length,
        totalPlayTime,
        reviewedGamesCount,
        completedGamesCount,
        soonGamesCount,
        uniquePlatformsCount,
        uniqueGenresCount,
        retroGamesCount,
        archivisteCount,
        historyCount: historyGames.length,
        customCategoriesCreated: Number(user.customCategoriesCreated || 0),
        profileUpdatedCount: Number(user.profileUpdatedCount || 0),
        deletedGamesCount: Number(user.deletedGamesCount || 0),
        lateNightActionsCount: Number(user.lateNightActionsCount || 0),
        viewedStats: Boolean(user.viewedStats),
        gamepadNavigationUsed: Boolean(user.gamepadNavigationUsed),
        startupAnimationSeen: Boolean(user.startupAnimationSeen),
      };
    } catch (e) {
      console.error("[Achievement] Erreur calcul stats:", e);
      return {
        totalGames: 0,
        favoritesCount: 0,
        marioGames: 0,
        totalPlayTime: 0,
        reviewedGamesCount: 0,
        completedGamesCount: 0,
        soonGamesCount: 0,
        uniquePlatformsCount: 0,
        uniqueGenresCount: 0,
        retroGamesCount: 0,
        archivisteCount: 0,
        historyCount: 0,
        customCategoriesCreated: 0,
        profileUpdatedCount: 0,
        deletedGamesCount: 0,
        lateNightActionsCount: 0,
        viewedStats: false,
        gamepadNavigationUsed: false,
        startupAnimationSeen: false,
      };
    }
  };

  const evaluateAchievementCondition = (achievement, stats) => {
    const idName = normalizeText(achievement?.id_name || achievement?.idName || achievement?.slug || achievement?.title);

    switch (idName) {
      case "insert_coin":
        return stats.totalGames >= 1;
      case "critique_art":
        return stats.reviewedGamesCount > 0;
      case "coup_de_foudre":
        return stats.favoritesCount > 0;
      case "identite_secrete":
        return stats.profileUpdatedCount > 0;
      case "mon_precieux":
        return stats.customCategoriesCreated > 0;
      case "etagere_virtuelle":
        return stats.totalGames >= 10;
      case "boutique_independante":
        return stats.totalGames >= 50;
      case "musee_jeu_video":
        return stats.totalGames >= 100;
      case "generique_fin":
        return stats.completedGamesCount >= 10;
      case "completionniste":
        return stats.completedGamesCount >= 25;
      case "backlog_sueur":
        return stats.soonGamesCount > 20;
      case "guerre_consoles":
        return stats.uniquePlatformsCount >= 5;
      case "eclectique":
        return stats.uniqueGenresCount >= 7;
      case "retro_gamer":
        return stats.retroGamesCount > 0;
      case "archiviste":
        return stats.archivisteCount > 0;
      case "player_2_ready":
        return stats.gamepadNavigationUsed;
      case "data_analyst":
        return stats.viewedStats;
      case "nostalgie":
        return stats.startupAnimationSeen;
      case "its_a_me":
        return stats.marioGames > 0;
      case "rage_quit":
        return stats.deletedGamesCount > 0;
      case "voyage_temps":
        return stats.historyCount >= 10;
      case "insomniaque":
        return stats.lateNightActionsCount > 0;
      default:
        return false;
    }
  };

  // Vérifier et débloquer les trophées (une seule fois par session)
  const checkAchievements = useCallback(async () => {
    try {
      const currentUser = await getMe().catch(() => null);
      const fallbackUser = JSON.parse(localStorage.getItem("user") || "{}");
      const user = {
        ...fallbackUser,
        ...(currentUser || {}),
      };
      const stats = await getStats(user);

      if (!user || (!user._id && !user.id && !user.uid)) {
        return;
      }

      // ✅ Récupérer les achievements débloqués depuis la BDD (pas localStorage)
      let unlockedFromDb = [];
      try {
        const allData = await getAllAchievements();
        const allAchievements = asArray(allData);
        unlockedFromDb = asArray(await getUserAchievements());
        const alreadyUnlocked = new Set(
          unlockedFromDb
            .map(extractAchievementIdName)
            .filter(Boolean),
        );

        // Vérifier chaque trophée connu par l'API
        for (const achievement of allAchievements) {
          const identifiers = getAchievementIdentifiers(achievement);
          if (identifiers.length === 0) continue;
          const idName = identifiers[0];

          // Sauter si déjà traité cette session
          if (processedRef.current.has(idName)) continue;
          
          // Sauter si déjà débloqué en BDD
          if (alreadyUnlocked.has(idName)) {
            processedRef.current.add(idName);
            continue;
          }

          if (evaluateAchievementCondition(achievement, stats)) {
            try {
              let response = null;
              let unlocked = false;

              for (const identifier of identifiers) {
                try {
                  response = await unlockAchievement(identifier);
                  unlocked = true;
                  break;
                } catch {
                  // Essayer l'identifiant suivant si le backend n'accepte pas celui-ci.
                }
              }

              if (!unlocked) {
                throw new Error(`Aucun identifiant accepté par l'API: ${identifiers.join(", ")}`);
              }

              processedRef.current.add(idName);

              // Mettre à jour le localStorage avec les données retournées du backend
              if (response?.user) {
                localStorage.setItem("user", JSON.stringify(response.user));
              }

              // Dispatch l'event toast
              window.dispatchEvent(new CustomEvent('achievementUnlocked', {
                detail: {
                  idName,
                  title: achievement.title,
                  description: achievement.description,
                  icon: achievement.icon
                }
              }));
            } catch (error) {
              console.error(`❌ [Achievement] Erreur déverrouillage ${idName}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("[Achievement] Erreur récupération depuis API:", error);
        // Fallback sur localStorage si API échoue
        const alreadyUnlocked = new Set(
          (user.unlockedAchievements || [])
            .map(extractAchievementIdName)
            .filter(Boolean),
        );
        const allData = await getAllAchievements();
        const allAchievements = asArray(allData);

        for (const achievement of allAchievements) {
          const identifiers = getAchievementIdentifiers(achievement);
          if (identifiers.length === 0) continue;
          const idName = identifiers[0];

          if (processedRef.current.has(idName) || alreadyUnlocked.has(idName)) continue;

          if (evaluateAchievementCondition(achievement, stats)) {
            try {
              let response = null;
              let unlocked = false;

              for (const identifier of identifiers) {
                try {
                  response = await unlockAchievement(identifier);
                  unlocked = true;
                  break;
                } catch {
                  // Essayer l'identifiant suivant si le backend n'accepte pas celui-ci.
                }
              }

              if (!unlocked) {
                throw new Error(`Aucun identifiant accepté par l'API: ${identifiers.join(", ")}`);
              }

              processedRef.current.add(idName);
              if (response?.user) {
                localStorage.setItem("user", JSON.stringify(response.user));
              }
              window.dispatchEvent(new CustomEvent('achievementUnlocked', {
                detail: {
                  idName,
                  title: achievement.title,
                  description: achievement.description,
                  icon: achievement.icon,
                }
              }));
            } catch (e) {
              console.error(`❌ [Achievement] Erreur ${idName}:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Achievement] Erreur générale:", error);
    }
  }, [
    getMe,
    getStats,
    unlockAchievement,
    getUserAchievements,
    getAllAchievements,
  ]);

  // Vérifier au démarrage
  useEffect(() => {
    checkAchievements();

    const handleGamepadConnected = () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.gamepadNavigationUsed = true;
      localStorage.setItem("user", JSON.stringify(user));
      checkAchievements();
    };

    // Écouter les événements manuels de vérification
    const handleCheckAchievements = () => {
      checkAchievements();
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('checkAchievements', handleCheckAchievements);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('checkAchievements', handleCheckAchievements);
    };
  }, [checkAchievements]);

  // Exposer la fonction pour un appel manuel (après créer/éditer jeu)
  return { checkAchievements };
};
