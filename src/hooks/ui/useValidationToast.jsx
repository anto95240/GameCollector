export const useValidationToast = () => {
  const showToast = (message, type = 'success', duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent('validationToast', {
        detail: {
          message,
          type, // 'success', 'error', 'info'
          duration,
        },
      })
    );
  };

  return {
    showSuccess: (message, duration = 3000) => showToast(message, 'success', duration),
    showError: (message, duration = 3500) => showToast(message, 'error', duration),
    showInfo: (message, duration = 3000) => showToast(message, 'info', duration),
    showCreated: (itemName, duration = 3000) => showToast(`✓ ${itemName} créé(e) avec succès`, 'success', duration),
    showUpdated: (itemName, duration = 3000) => showToast(`✓ ${itemName} mis(e) à jour avec succès`, 'success', duration),
    showDeleted: (itemName, duration = 3000) => showToast(`✓ ${itemName} supprimé(e) avec succès`, 'success', duration),
  };
};
