/**
 * Nom de l'événement global de vérification des achievements.
 * Constante exportée pour éviter la répétition du magic string partout.
 */
export const ACHIEVEMENT_EVENT = 'checkAchievements';

/**
 * Déclenche la vérification des achievements.
 * Utiliser cette fonction plutôt que dispatchEvent directement.
 */
export const triggerAchievementCheck = () => {
  window.dispatchEvent(new Event(ACHIEVEMENT_EVENT));
};
