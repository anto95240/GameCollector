import { useEffect, useRef } from 'react';
import keyboardShortcutsService from '@/services/keyboardShortcutsService';

/**
 * Composant pour gérer les raccourcis clavier globaux de l'application
 */
const KeyboardShortcutsProvider = () => {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Initialiser les raccourcis une seule fois
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Raccourci: Ctrl+K (Cmd+K sur Mac) - Focus sur la recherche
    keyboardShortcutsService.register(
      'k',
      () => {
        // Dispatcher un événement personnalisé pour que les composants puissent l'écouter
        window.dispatchEvent(new CustomEvent('focusSearchBar'));
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+Alt+N (Cmd+Alt+N sur Mac) - Ajouter un nouveau jeu
    keyboardShortcutsService.register(
      'n',
      () => {
        // Ne pas naviguer si on est déjà sur la page d'ajout de jeu
        if (!window.location.pathname.includes('add')) {
          window.location.href = '/game/add-edit-game';
        }
      },
      { ctrlKey: true, altKey: true }
    );

    // Raccourci: Ctrl+D (Cmd+D sur Mac) - Aller au dashboard
    keyboardShortcutsService.register(
      'd',
      () => {
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard';
        }
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+L - Aller à la liste des jeux
    keyboardShortcutsService.register(
      'l',
      () => {
        if (window.location.pathname !== '/list') {
          window.location.href = '/list';
        }
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+P - Aller au profil
    keyboardShortcutsService.register(
      'p',
      () => {
        if (window.location.pathname !== '/profile') {
          window.location.href = '/profile';
        }
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+C - Aller aux catégories
    keyboardShortcutsService.register(
      'c',
      () => {
        if (window.location.pathname !== '/categories') {
          window.location.href = '/categories';
        }
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+S - Aller aux statistiques
    keyboardShortcutsService.register(
      's',
      () => {
        if (window.location.pathname !== '/statistics') {
          window.location.href = '/statistics';
        }
      },
      { ctrlKey: true }
    );

    // Raccourci: Ctrl+Alt+T - Aller aux trophées
    keyboardShortcutsService.register(
      't',
      () => {
        if (window.location.pathname !== '/trophies') {
          window.location.href = '/trophies';
        }
      },
      { ctrlKey: true, altKey: true }
    );

    // Raccourci: Ctrl+H - Afficher l'aide (liste des raccourcis)
    keyboardShortcutsService.register(
      'h',
      () => {
        window.dispatchEvent(new CustomEvent('showKeyboardHelp'));
      },
      { ctrlKey: true }
    );
  }, []);

  return null;
};

export default KeyboardShortcutsProvider;
