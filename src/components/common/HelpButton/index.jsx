import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import './HelpButton.css';

/**
 * Bouton d'aide pour afficher les raccourcis clavier
 */
const HelpButton = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('showKeyboardHelp'));
  };

  return (
    <button
      className="help-button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Afficher les raccourcis clavier (Ctrl+H)"
      aria-label="Afficher l'aide des raccourcis clavier"
    >
      <FontAwesomeIcon icon={faQuestion} className="help-button-icon" />
      <span className="help-button-label">Ctrl+H</span>
      {isHovered && <div className="help-button-tooltip">Raccourcis clavier</div>}
    </button>
  );
};

export default HelpButton;
