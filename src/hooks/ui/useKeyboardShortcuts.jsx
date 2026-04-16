import { useEffect, useRef } from 'react';
import keyboardShortcutsService from '@/services/keyboardShortcutsService';

/**
 * Hook pour gérer les raccourcis clavier
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     ctrlKey: true,
 *     callback: () => searchInput.focus(),
 *     description: 'Accéder à la recherche'
 *   },
 *   {
 *     key: 'Escape',
 *     callback: () => closeModal(),
 *     description: 'Fermer le popup'
 *   }
 * ]);
 */
export const useKeyboardShortcuts = (shortcuts = [], enabled = true) => {
  const shortcutsRef = useRef([]);

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return;
    }

    // Enregistrer tous les raccourcis
    shortcuts.forEach((shortcut) => {
      keyboardShortcutsService.register(
        shortcut.key,
        shortcut.callback,
        {
          ctrlKey: shortcut.ctrlKey,
          metaKey: shortcut.metaKey || shortcut.ctrlKey, // ctrlKey fonctionne aussi sur Mac
          altKey: shortcut.altKey,
          shiftKey: shortcut.shiftKey,
          preventDefault: shortcut.preventDefault !== false,
        }
      );
      shortcutsRef.current.push(shortcut.key);
    });

    // Ajouter l'écouteur global (une seule fois)
    window.addEventListener('keydown', keyboardShortcutsService.handleKeyDown);

    // Nettoyage: désenregistrer les raccourcis
    return () => {
      shortcuts.forEach((shortcut) => {
        keyboardShortcutsService.unregister(shortcut.key, {
          ctrlKey: shortcut.ctrlKey,
          metaKey: shortcut.metaKey || shortcut.ctrlKey,
          altKey: shortcut.altKey,
          shiftKey: shortcut.shiftKey,
        });
      });
      window.removeEventListener('keydown', keyboardShortcutsService.handleKeyDown);
    };
  }, [shortcuts, enabled]);

  return keyboardShortcutsService;
};

export default useKeyboardShortcuts;
