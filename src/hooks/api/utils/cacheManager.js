

class CacheManager {
  constructor() {
    this.cacheMap = new Map();
    this.timestampMap = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes par défaut
  }
  set(key, value, ttl = this.defaultTTL) {
    this.cacheMap.set(key, value);
    this.timestampMap.set(key, Date.now() + ttl);
  }
  get(key) {
    const timestamp = this.timestampMap.get(key);
    
    // Vérifie si la clé existe et n'est pas expirée
    if (timestamp && Date.now() < timestamp) {
      return this.cacheMap.get(key);
    }
    
    // Supprime les données expirées
    this.cacheMap.delete(key);
    this.timestampMap.delete(key);
    return null;
  }
  has(key) {
    const timestamp = this.timestampMap.get(key);
    return timestamp && Date.now() < timestamp;
  }
  delete(key) {
    this.cacheMap.delete(key);
    this.timestampMap.delete(key);
  }
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    for (const key of this.cacheMap.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }
  clear() {
    this.cacheMap.clear();
    this.timestampMap.clear();
  }
  getStats() {
    const totalSize = this.cacheMap.size;
    const validEntries = Array.from(this.timestampMap.values()).filter(
      timestamp => Date.now() < timestamp
    ).length;

    return {
      totalSize,
      validEntries,
      expiredEntries: totalSize - validEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  estimateMemoryUsage() {
    let total = 0;
    for (const value of this.cacheMap.values()) {
      total += JSON.stringify(value).length * 2; // *2 pour UTF-16
    }
    return total;
  }
  keys() {
    return Array.from(this.cacheMap.keys());
  }
}

// Instance singleton du cache manager
const cacheManager = new CacheManager();

export default cacheManager;
