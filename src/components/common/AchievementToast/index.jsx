import React, { useState } from 'react';
import './AchievementToast.css';

const AchievementDemo = () => {
  const [isVisible, setIsVisible] = useState(false);

  const triggerAchievement = () => {
    setIsVisible(false);
    
    setTimeout(() => {
      setIsVisible(true);
      
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }, 100);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '50px' }}>
      
      {/* --- BOUTON DE TEST --- */}
      <button 
        onClick={triggerAchievement}
        style={{
          padding: '12px 24px',
          background: 'var(--gradient-blue)', 
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-title)',
          boxShadow: 'var(--shadow-btn)'
        }}
      >
        Débloquer un Succès (Statique)
      </button>

      {/* --- COMPOSANT D'ACHÈVEMENT MODIFIÉ --- */}
      {isVisible && (
        <div className="achv-masterpiece">
          {/* Laser de scan cyber */}
          <div className="achv-laser-scan"></div>

          {/* Carte Statique (sans rotation) */}
          <div className="achv-card-static">
            <span className="achv-icon">💎</span>
          </div>

          {/* Textes OS */}
          <div className="achv-info-panel">
            <span className="achv-tag">SYSTÈME // ARCHIVE DÉVERROUILLÉE</span>
            <h3 className="achv-title">Le Saint Graal</h3>
            <p className="achv-desc">Vous avez ajouté un jeu côté à plus de 1000€ dans votre collection.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default AchievementDemo;