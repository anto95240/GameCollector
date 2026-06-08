

import cacheManager from "@/hooks/api/utils/cacheManager";

class CacheInvalidationService {
  static clearAllCaches() {
    cacheManager.clear();
    console.debug(`[Cache CLEARED] All caches cleared globally`);
  }
  static invalidateUserCaches() {
    cacheManager.invalidatePattern(/^user:|^filters:|^shortcuts:/);
    console.debug(`[Cache INVALIDATE] All user-related caches`);
  }
  static invalidateGameCaches() {
    cacheManager.invalidatePattern(/^game:/);
    console.debug(`[Cache INVALIDATE] All game caches`);
  }
  static invalidateAchievementCaches() {
    cacheManager.invalidatePattern(/^achievement:/);
    console.debug(`[Cache INVALIDATE] All achievement caches`);
  }
  static invalidateMetadataCaches() {
    cacheManager.invalidatePattern(/^metadata:/);
    console.debug(`[Cache INVALIDATE] All metadata caches`);
  }
  static invalidateRealtimeCaches() {
    this.invalidateGameCaches();
    this.invalidateAchievementCaches();
    cacheManager.invalidatePattern(/^user:history:/);
  }
  static getCacheStats() {
    return cacheManager.getStats();
  }
  static getCacheKeys() {
    return cacheManager.keys();
  }
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
