import { useEffect } from 'react';
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
