import './AchievementToast.css'

import React, { useEffect, useState } from 'react'

const AchievementToast = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [achievement, setAchievement] = useState(null)

  useEffect(() => {
    const handleAchievementUnlock = (event) => {
      const { detail } = event
      setAchievement(detail)
      setIsVisible(true)

      // Auto-hide après 3 secondes
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 3000)

      return () => clearTimeout(timer)
    }

    window.addEventListener('achievementUnlocked', handleAchievementUnlock)
    return () => window.removeEventListener('achievementUnlocked', handleAchievementUnlock)
  }, [])

  if (!isVisible || !achievement) return null

  return (
    <div className="achv-masterpiece">
      {/* Laser de scan cyber */}
      <div className="achv-laser-scan"></div>

      {/* Carte Statique (sans rotation) */}
      <div className="achv-card-static">
        <span className="achv-icon">{achievement.icon || '🏆'}</span>
      </div>

      {/* Textes OS */}
      <div className="achv-info-panel">
        <span className="achv-tag">SYSTÈME // ARCHIVE DÉVERROUILLÉE</span>
        <h3 className="achv-title">{achievement.title || 'Trophée'}</h3>
        <p className="achv-desc">
          {achievement.description || "Vous avez accompli quelque chose d'extraordinaire!"}
        </p>
      </div>
    </div>
  )
}

export default AchievementToast
