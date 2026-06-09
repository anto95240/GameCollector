import { useEffect, useRef } from "react";

//Hook pour gérer le focus trap dans les modales pour l'accessibilité.

export const useFocusTrap = (isActive = true) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Sauvegarder l'élément actif précédent
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus la modale par défaut pour que la lecture commence
    if (modalRef.current) {
      // On met un petit délai pour s'assurer que l'élément est bien dans le DOM
      setTimeout(() => {
        if (modalRef.current) modalRef.current.focus();
      }, 0);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restaurer le focus à la fermeture
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return modalRef;
};
