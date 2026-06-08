export const ACHIEVEMENT_EVENT = 'checkAchievements'
export const triggerAchievementCheck = () => {
  window.dispatchEvent(new Event(ACHIEVEMENT_EVENT))
}
