/**
 * Cache Manager - Système centralisé de gestion du cache pour les requêtes API
 * Fournit un cache en mémoire avec TTL configurable
 */

class CacheManager {
  constructor() {
    this.cacheMap = new Map();
    this.timestampMap = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes par défaut
  }

  /**
   * Définit une clé cache avec une valeur et un TTL
   * @param {string} key - Clé unique du cache
   * @param {any} value - Valeur à mettre en cache
   * @param {number} ttl - Time To Live en millisecondes (optionnel)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cacheMap.set(key, value);
    this.timestampMap.set(key, Date.now() + ttl);
  }

  /**
   * Récupère une valeur du cache si elle est encore valide
   * @param {string} key - Clé du cache
   * @returns {any|null} Valeur du cache ou null si expirée/inexistante
   */
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

  /**
   * Vérifie si une clé existe et est valide
   * @param {string} key - Clé du cache
   * @returns {boolean} true si le cache est valide
   */
  has(key) {
    const timestamp = this.timestampMap.get(key);
    return timestamp && Date.now() < timestamp;
  }

  /**
   * Supprime une clé du cache
   * @param {string} key - Clé à supprimer
   */
  delete(key) {
    this.cacheMap.delete(key);
    this.timestampMap.delete(key);
  }

  /**
   * Invalide tous les caches dont la clé correspond au pattern
   * @param {string|RegExp} pattern - Pattern de clés à invalider
   */
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    for (const key of this.cacheMap.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  /**
   * Vide complètement le cache
   */
  clear() {
    this.cacheMap.clear();
    this.timestampMap.clear();
  }

  /**
   * Retourne des statistiques sur le cache
   * @returns {object} Infos sur le cache
   */
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

  /**
   * Estime l'utilisation mémoire du cache (approximatif)
   * @returns {number} Taille estimée en octets
   */
  estimateMemoryUsage() {
    let total = 0;
    for (const value of this.cacheMap.values()) {
      total += JSON.stringify(value).length * 2; // *2 pour UTF-16
    }
    return total;
  }

  /**
   * Obtient la liste de toutes les clés du cache
   * @returns {array} Clés du cache
   */
  keys() {
    return Array.from(this.cacheMap.keys());
  }
}

// Instance singleton du cache manager
const cacheManager = new CacheManager();

export default cacheManager;
