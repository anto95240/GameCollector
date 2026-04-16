/**
 * Gestionnaire centralisé des raccourcis clavier
 * Permet d'enregistrer et déclencher des raccourcis globalement
 */

class KeyboardShortcutsService {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.listenerAttached = false;
    this.isDesktop = this._checkIfDesktop();
  }

  /**
   * Vérifie si on est sur desktop
   */
  _checkIfDesktop() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|tablet|android|iphone|ipad|ipod/.test(userAgent);
    const isTablet = /tablet|ipad/.test(userAgent);
    return !(isMobile || isTablet) && window.innerWidth > 1024;
  }

  /**
   * Enregistre un raccourci clavier
   * @param {string} key - La clé du raccourci (ex: 'Escape', 'k', 'n')
   * @param {function} callback - La fonction à exécuter
   * @param {object} options - Options: { ctrlKey, altKey, shiftKey, preventDefault }
   */
  register(key, callback, options = {}) {
    const shortcutKey = this._generateKey(key, options);
    this.shortcuts.set(shortcutKey, { callback, options, key });
    
    // Initialiser le listener si pas encore fait
    this._initializeListener();
  }

  /**
   * Initialise l'écouteur d'événements clavier (une seule fois)
   */
  _initializeListener() {
    if (this.listenerAttached) return;
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', () => {
      this.isDesktop = this._checkIfDesktop();
    });
    this.listenerAttached = true;
  }

  /**
   * Désenregistre un raccourci clavier
   */
  unregister(key, options = {}) {
    const shortcutKey = this._generateKey(key, options);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Efface tous les raccourcis
   */
  clearAll() {
    this.shortcuts.clear();
  }

  /**
   * Active/désactive tous les raccourcis
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Gère l'événement keydown global
   */
  handleKeyDown = (event) => {
    if (!this.isEnabled || !this.isDesktop) return;

    const key = event.key.toLowerCase();
    
    // Vérifier TOUS les raccourcis enregistrés pour trouver une correspondance
    for (const [shortcutKey, shortcut] of this.shortcuts.entries()) {
      if (this._matchesShortcut(event, shortcut)) {
        // Toujours prévenir le comportement par défaut sauf si explicitement demandé
        if (shortcut.options.preventDefault !== false) {
          event.preventDefault();
        }
        // Exécuter le callback
        shortcut.callback(event);
        return;
      }
    }
  };

  /**
   * Génère une clé unique pour un raccourci
   */
  _generateKey(key, options = {}) {
    const parts = [];
    if (options.ctrlKey) parts.push('ctrl');
    if (options.altKey) parts.push('alt');
    if (options.shiftKey) parts.push('shift');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Vérifie si un événement correspond à un raccourci
   */
  _matchesShortcut(event, shortcut) {
    const { options, key } = shortcut;
    const eventKey = event.key.toLowerCase();
    const targetKey = key.toLowerCase();
    
    // Vérifier que la touche correspond
    if (eventKey !== targetKey) {
      return false;
    }

    // Vérifier les modificateurs
    // Ctrl et Meta (⌘ sur Mac) sont considérés comme équivalents
    const hasCtrlModifier = event.ctrlKey || event.metaKey;
    const needsCtrl = options.ctrlKey || false;
    
    const hasAltModifier = event.altKey;
    const needsAlt = options.altKey || false;
    
    const hasShiftModifier = event.shiftKey;
    const needsShift = options.shiftKey || false;

    // Tous les modificateurs demandés doivent être présents
    if (needsCtrl && !hasCtrlModifier) return false;
    if (needsAlt && !hasAltModifier) return false;
    if (needsShift && !hasShiftModifier) return false;

    // Pas de modificateurs supplémentaires ne doivent être présents
    if (!needsCtrl && hasCtrlModifier) return false;
    if (!needsAlt && hasAltModifier) return false;
    if (!needsShift && hasShiftModifier) return false;

    return true;
  }

  /**
   * Récupère le nom lisible d'une combinaison de touches
   */
  getReadableShortcut(key, options = {}) {
    const parts = [];
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

    if (options.ctrlKey) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (options.altKey) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (options.shiftKey) {
      parts.push(isMac ? '⇧' : 'Shift');
    }

    const displayKey = key === 'Escape' ? 'Esc' : key.toUpperCase();
    parts.push(displayKey);

    return parts.join(isMac ? '' : '+');
  }
}

// Instance singleton
const keyboardShortcutsService = new KeyboardShortcutsService();

export default keyboardShortcutsService;
