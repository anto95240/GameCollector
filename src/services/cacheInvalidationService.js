/**
 * Cache Invalidation Service
 * Gère l'invalidation globale du cache pour tous les types de données
 */

import cacheManager from "@/hooks/api/utils/cacheManager";

class CacheInvalidationService {
  /**
   * Invalide tous les caches
   */
  static clearAllCaches() {
    cacheManager.clear();
    console.debug(`[Cache CLEARED] All caches cleared globally`);
  }

  /**
   * Invalide les caches utilisateur (après logout, changement de profil)
   */
  static invalidateUserCaches() {
    cacheManager.invalidatePattern(/^user:|^filters:|^shortcuts:/);
    console.debug(`[Cache INVALIDATE] All user-related caches`);
  }

  /**
   * Invalide les caches de jeux
   */
  static invalidateGameCaches() {
    cacheManager.invalidatePattern(/^game:/);
    console.debug(`[Cache INVALIDATE] All game caches`);
  }

  /**
   * Invalide les caches d'achievements
   */
  static invalidateAchievementCaches() {
    cacheManager.invalidatePattern(/^achievement:/);
    console.debug(`[Cache INVALIDATE] All achievement caches`);
  }

  /**
   * Invalide les caches de métadonnées
   */
  static invalidateMetadataCaches() {
    cacheManager.invalidatePattern(/^metadata:/);
    console.debug(`[Cache INVALIDATE] All metadata caches`);
  }

  /**
   * Invalide les caches liés aux données temps réel
   * (jeux, statistiques, achievements)
   */
  static invalidateRealtimeCaches() {
    this.invalidateGameCaches();
    this.invalidateAchievementCaches();
    cacheManager.invalidatePattern(/^user:history:/);
  }

  /**
   * Retourne les statistiques du cache global
   */
  static getCacheStats() {
    return cacheManager.getStats();
  }

  /**
   * Retourne toutes les clés du cache
   */
  static getCacheKeys() {
    return cacheManager.keys();
  }

  /**
   * Nettoie les entrées expirées du cache
   */
  static cleanExpiredEntries() {
    const keys = cacheManager.keys();
    let cleanedCount = 0;
    
    for (const key of keys) {
      if (!cacheManager.has(key)) {
        cacheManager.delete(key);
        cleanedCount++;
      }
    }
    
    console.debug(`[Cache CLEANUP] Removed ${cleanedCount} expired entries`);
    return cleanedCount;
  }
}

export default CacheInvalidationService;
