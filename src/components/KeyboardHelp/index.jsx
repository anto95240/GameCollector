import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import './KeyboardHelp.css';

const KeyboardHelp = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleShowKeyboardHelp = () => {
      setIsVisible(true);
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isVisible) {
        event.preventDefault();
        setIsVisible(false);
      }
    };

    window.addEventListener('showKeyboardHelp', handleShowKeyboardHelp);
    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('showKeyboardHelp', handleShowKeyboardHelp);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible]);

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  const shortcuts = [
    // Navigation
    {
      category: 'Navigation',
      items: [
        { keys: isMac ? '⌘K' : 'Ctrl+K', description: 'Accéder à la barre de recherche' },
        { keys: isMac ? '⌘D' : 'Ctrl+D', description: 'Aller au dashboard' },
        { keys: isMac ? '⌘L' : 'Ctrl+L', description: 'Aller à la liste des jeux' },
        { keys: isMac ? '⌘C' : 'Ctrl+C', description: 'Aller aux catégories' },
        { keys: isMac ? '⌘P' : 'Ctrl+P', description: 'Aller au profil' },
        { keys: isMac ? '⌘S' : 'Ctrl+S', description: 'Aller aux statistiques' },
        { keys: isMac ? '⌘⌥T' : 'Ctrl+Alt+T', description: 'Aller aux trophées' },
      ]
    },
    // Actions
    {
      category: 'Actions',
      items: [
        { keys: isMac ? '⌘⌥N' : 'Ctrl+Alt+N', description: 'Ajouter un nouveau jeu' },
        { keys: isMac ? '⌘H' : 'Ctrl+H', description: 'Afficher cette aide' },
        { keys: 'Esc', description: 'Fermer un popup ou modal' },
      ]
    },
  ];

  if (!isVisible) return null;

  return (
    <div className="keyboard-help-overlay" onClick={() => setIsVisible(false)}>
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>Raccourcis clavier</h2>
          <button
            className="keyboard-help-close"
            onClick={() => setIsVisible(false)}
            title="Fermer (Esc)"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="keyboard-help-content">
          {shortcuts.map((category, idx) => (
            <div key={idx} className="keyboard-help-category">
              <h3>{category.category}</h3>
              <div className="keyboard-help-items">
                {category.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="keyboard-help-item">
                    <kbd className="keyboard-help-keys">{item.keys}</kbd>
                    <span className="keyboard-help-description">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-help-footer">
          <p>Appuyez sur <kbd>Esc</kbd> ou cliquez en dehors pour fermer</p>
        </div>
        <div className="keyboard-help-footer">
          💡 Conseil: Appuyez sur <kbd>Ctrl+H</kbd> (ou <kbd>⌘H</kbd> sur Mac) à tout moment pour afficher cette aide
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;
