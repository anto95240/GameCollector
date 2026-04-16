import { useEffect } from 'react';

/**
 * Hook pour fermer les popups/modals avec la touche Escape
 * @param {function} onClose - Fonction à appeler pour fermer le popup
 * @param {boolean} isOpen - État d'ouverture du popup (optionnel)
 */
export const useEscapeKeyCloser = (onClose, isOpen = true) => {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose, isOpen]);
};

export default useEscapeKeyCloser;
