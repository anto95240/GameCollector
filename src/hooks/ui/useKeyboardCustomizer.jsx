import { useState, useCallback } from "react";

/**
 * Hook pour gérer l'état du personnaliseur de raccourcis
 */
export const useKeyboardCustomizer = () => {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState(null);

  const openCustomizer = useCallback((shortcut = null) => {
    setSelectedShortcut(shortcut);
    setIsCustomizerOpen(true);
  }, []);

  const closeCustomizer = useCallback(() => {
    setIsCustomizerOpen(false);
    setSelectedShortcut(null);
  }, []);

  return {
    isCustomizerOpen,
    selectedShortcut,
    openCustomizer,
    closeCustomizer,
  };
};

export default useKeyboardCustomizer;
