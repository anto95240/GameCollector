class KeyboardShortcutsService {
  constructor() {
    this.shortcuts = new Map();
    this.customBindings = new Map();
    this.isEnabled = true;
    this.listenerAttached = false;
  }

  register(action, defaultKey, callback, options = {}) {
    this.shortcuts.set(action, {
      action,
      defaultKey: defaultKey.toLowerCase(),
      callback,
      defaultOptions: options,
    });
    this._initializeListener();
  }

  loadCustomBindings(userShortcuts) {
    this.customBindings.clear();
    if (Array.isArray(userShortcuts)) {
      userShortcuts.forEach((shortcut) => {
        this.customBindings.set(shortcut.action, {
          key: shortcut.key,
          ctrlKey: shortcut.ctrlKey || false,
          altKey: shortcut.altKey || false,
          shiftKey: shortcut.shiftKey || false,
          isEnabled: shortcut.isEnabled !== false,
        });
      });
    }
  }

  _getActiveBinding(action) {
    const defaultBinding = this.shortcuts.get(action);
    if (!defaultBinding) return null;
    
    const custom = this.customBindings.get(action);
    
    // Si l'utilisateur a une entrée pour ce raccourci en BDD
    if (custom) {
      // CORRECTION : S'il est désactivé, on coupe tout en retournant null
      if (!custom.isEnabled) {
        return null;
      }

      // S'il est activé, on retourne sa version personnalisée
      return {
        key: custom.key.toLowerCase(),
        options: {
          ctrlKey: custom.ctrlKey,
          altKey: custom.altKey,
          shiftKey: custom.shiftKey,
          preventDefault: defaultBinding.defaultOptions.preventDefault,
        },
        callback: defaultBinding.callback,
      };
    }

    // S'il n'y a aucune personnalisation en BDD, on retourne le défaut
    return {
      key: defaultBinding.defaultKey,
      options: defaultBinding.defaultOptions,
      callback: defaultBinding.callback,
    };
  }

  _initializeListener() {
    if (this.listenerAttached) return;
    window.addEventListener("keydown", this.handleKeyDown);
    this.listenerAttached = true;
  }

  unregister(action) {
    this.shortcuts.delete(action);
  }

  clearAll() {
    this.shortcuts.clear();
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  handleKeyDown = (event) => {
    if (!this.isEnabled) return;
    for (const [action, shortcut] of this.shortcuts.entries()) {
      const activeBinding = this._getActiveBinding(action);
      
      // Si c'est null (désactivé ou inexistant), on l'ignore complètement
      if (!activeBinding) continue;
      
      if (
        this._matchesShortcut(event, activeBinding.key, activeBinding.options)
      ) {
        if (activeBinding.options.preventDefault !== false) {
          event.preventDefault();
        }
        activeBinding.callback(event);
        return;
      }
    }
  };

  _matchesShortcut(event, targetKey, options) {
    const eventKey = event.key.toLowerCase();
    if (eventKey !== targetKey) return false;
    const hasCtrlModifier = event.ctrlKey || event.metaKey;
    const needsCtrl = options.ctrlKey || false;
    const hasAltModifier = event.altKey || false;
    const needsAlt = options.altKey || false;
    const hasShiftModifier = event.shiftKey || false;
    const needsShift = options.shiftKey || false;
    if (needsCtrl !== hasCtrlModifier) return false;
    if (needsAlt !== hasAltModifier) return false;
    if (needsShift !== hasShiftModifier) return false;
    return true;
  }

  getReadableShortcut(action) {
    const binding = this._getActiveBinding(action);
    if (!binding) return "";
    const parts = [];
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    if (binding.options.ctrlKey) parts.push(isMac ? "⌘" : "Ctrl");
    if (binding.options.altKey) parts.push(isMac ? "⌥" : "Alt");
    if (binding.options.shiftKey) parts.push(isMac ? "⇧" : "Shift");
    const displayKey =
      binding.key === "escape" ? "Esc" : binding.key.toUpperCase();
    parts.push(displayKey);
    return parts.join(isMac ? "" : "+");
  }
}

const keyboardShortcutsService = new KeyboardShortcutsService();
export default keyboardShortcutsService;