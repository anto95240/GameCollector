import { useEffect, useRef } from 'react';
export const useSearchBarShortcuts = (inputRef) => {
  useEffect(() => {
    if (!inputRef?.current) return;

    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    };

    // Écouter l'événement personnalisé pour focus sur la recherche
    window.addEventListener('focusSearchBar', handleFocusSearch);

    return () => {
      window.removeEventListener('focusSearchBar', handleFocusSearch);
    };
  }, [inputRef]);
};

export default useSearchBarShortcuts;
