import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faToggleOn, faToggleOff, faUndo } from '@fortawesome/free-solid-svg-icons';
import './ShortcutItem.css';

const ShortcutItem = ({ item, onSave, onReset, onToggle, isMac, isToggling }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState(null);
  const inputRef = useRef(null);

  // Capture des touches uniquement quand ce raccourci précis est en édition
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e) => {
      e.preventDefault();
      setRecordedKeys({
        key: e.key.toLowerCase(),
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });
    };
    
    inputRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  const handleSaveClick = () => {
    if (recordedKeys?.key) {
      onSave(item.action, recordedKeys);
      setIsEditing(false);
    }
  };

  const formatKeys = (binding) => {
    if (!binding || !binding.key) return '';
    const parts = [];
    if (binding.ctrlKey) parts.push(isMac ? '⌘' : 'Ctrl');
    if (binding.altKey) parts.push(isMac ? '⌥' : 'Alt');
    if (binding.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
    
    parts.push(binding.key === 'Escape' ? 'Esc' : binding.key.toUpperCase());
    return parts.join(isMac ? '' : '+');
  };

  const displayKeys = isEditing && recordedKeys 
    ? formatKeys(recordedKeys) 
    : formatKeys(item.customBinding || item);

  return (
    <div className={`keyboard-help-item ${item.isCustomized ? 'customized' : ''} ${!item.isEnabled ? 'disabled' : ''} ${isEditing ? 'editing' : ''}`}>
      <div className="keyboard-help-item-content">
        {isEditing ? (
          <>
            <input 
              ref={inputRef} 
              type="text" 
              className="keyboard-help-recording-input" 
              value={displayKeys || 'En attente...'} 
              readOnly 
            />
            <span className="keyboard-help-recording-hint">Appuyez sur les touches...</span>
          </>
        ) : (
          <>
            <kbd className="keyboard-help-keys">{displayKeys}</kbd>
            <span className="keyboard-help-description">
              {item.description}
              {item.isCustomized && <span className="custom-badge">Personnalisé</span>}
              {!item.isEnabled && <span className="disabled-badge">Désactivé</span>}
            </span>
          </>
        )}
      </div>
      <div className="keyboard-help-actions">
        {isEditing ? (
          <>
            <button className="keyboard-help-btn save" onClick={handleSaveClick} disabled={!recordedKeys?.key}>Valider</button>
            <button className="keyboard-help-btn cancel" onClick={() => { setIsEditing(false); setRecordedKeys(null); }}>Annuler</button>
          </>
        ) : (
          <>
            <button className="keyboard-help-btn modify" onClick={() => { setIsEditing(true); setRecordedKeys(null); }} title="Modifier">
              <FontAwesomeIcon icon={faPencilAlt} />
            </button>
            <button className="keyboard-help-btn reset" onClick={() => onReset(item.action)} title="Réinitialiser">
              <FontAwesomeIcon icon={faUndo} />
            </button>
            <button 
              className={`keyboard-help-btn toggle ${item.isEnabled ? 'enabled' : 'disabled'}`} 
              onClick={() => onToggle(item.action)} 
              disabled={isToggling}
              title={item.isEnabled ? 'Désactiver' : 'Activer'}
            >
              <FontAwesomeIcon icon={item.isEnabled ? faToggleOn : faToggleOff} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ShortcutItem;