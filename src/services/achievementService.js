// Placeholder - Les achievements sont gérés par useAchievementTracker.jsx
// via des events window.dispatchEvent('checkAchievements')

export const triggerAchievementCheck = () => {
  window.dispatchEvent(new Event('checkAchievements'));
};

