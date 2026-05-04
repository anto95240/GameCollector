import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPencilAlt, faToggleOn, faToggleOff, faUndo } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useApiShortcutsDefaults, getHardcodedDefaults } from '@/hooks/api/useApiShortcutsDefaults';
import { useApiShortcuts } from '@/hooks/api/useApiShortcuts';
import keyboardShortcutsService from '@/services/keyboardShortcutsService';
import './KeyboardHelp.css';

const KeyboardHelp = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();
  const { defaults, getDefaults } = useApiShortcutsDefaults();
  const { toggleShortcut, updateShortcut } = useApiShortcuts();
  const [shortcuts, setShortcuts] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [editingAction, setEditingAction] = useState(null);
  const [recordingKeys, setRecordingKeys] = useState(null);
  const [message, setMessage] = useState(null);
  const recordingInputRef = useRef(null);

  useEffect(() => {
    if (!defaults) {
      getDefaults();
    }
  }, []);

  useEffect(() => {
    if (!recordingKeys) return;
    const handleKeyDown = (e) => {
      e.preventDefault();
      setRecordingKeys(prev => ({
        ...prev,
        keys: {
          key: e.key.toLowerCase(),
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey
        }
      }));
    };
    if (recordingInputRef.current) {
      recordingInputRef.current.focus();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [recordingKeys]);

  useEffect(() => {
    if (!defaults) return;
    const shortcutList = (defaults.length > 0 ? defaults : getHardcodedDefaults()).map(defaultShortcut => {
      const userCustom = user?.shortcuts?.find(s => s.action === defaultShortcut.action);
      
      return {
        ...defaultShortcut,
        isCustomized: !!userCustom,
        isEnabled: userCustom?.isEnabled !== false,
        customBinding: (userCustom && userCustom.key) ? {
          key: userCustom.key,
          ctrlKey: userCustom.ctrlKey,
          altKey: userCustom.altKey,
          shiftKey: userCustom.shiftKey
        } : null
      };
    });
    setShortcuts(shortcutList);
  }, [defaults, user?.shortcuts]);

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

  const categories = [...new Set(shortcuts.map(s => s.category))];
  const shortcutsByCategory = categories.map(cat => ({
    category: cat,
    items: shortcuts.filter(s => s.category === cat)
  }));

  const handleStartEditing = (shortcut) => {
    setEditingAction(shortcut.action);
    setRecordingKeys({ shortcutId: shortcut.action, keys: {} });
    setMessage(null);
  };

  const handleSaveShortcut = async () => {
    if (!recordingKeys?.keys?.key) {
      setMessage({ type: 'error', text: 'Aucune touche capturée' });
      return;
    }
    try {
      await updateShortcut(recordingKeys.shortcutId, recordingKeys.keys);
      const updated = shortcuts.map(s =>
        s.action === recordingKeys.shortcutId
          ? { ...s, ...recordingKeys.keys, isCustomized: true }
          : s
      );
      setShortcuts(updated);
      keyboardShortcutsService.loadCustomBindings(updated);
      setRecordingKeys(null);
      setEditingAction(null);
      setMessage({ type: 'success', text: 'Raccourci mis à jour!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    }
  };

  const handleResetShortcut = async (shortcutAction) => {
    const defaultShortcut = defaults?.find(d => d.action === shortcutAction);
    if (!defaultShortcut) {
      setMessage({ type: 'error', text: 'Raccourci par défaut non trouvé' });
      return;
    }
    try {
      await updateShortcut(shortcutAction, {
        key: defaultShortcut.key,
        ctrlKey: defaultShortcut.ctrlKey,
        altKey: defaultShortcut.altKey,
        shiftKey: defaultShortcut.shiftKey
      });
      const updated = shortcuts.map(s =>
        s.action === shortcutAction
          ? { ...s, ...defaultShortcut, isCustomized: false }
          : s
      );
      setShortcuts(updated);
      keyboardShortcutsService.loadCustomBindings(updated);
      setEditingAction(null);
      setRecordingKeys(null);
      setMessage({ type: 'success', text: 'Raccourci réinitialisé!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la réinitialisation' });
    }
  };

  const handleToggle = async (actionId) => {
    setTogglingId(actionId);
    try {
      await toggleShortcut(actionId);
    } catch (err) {
      console.error('Erreur lors du toggle:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const formatKeys = (shortcut) => {
    const binding = shortcut.customBinding || shortcut;
    const parts = [];
    
    if (!binding || !binding.key) return '';

    if (binding.ctrlKey) parts.push(isMac ? '⌘' : 'Ctrl');
    if (binding.altKey) parts.push(isMac ? '⌥' : 'Alt');
    if (binding.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
    
    const displayKey = binding.key === 'Escape' ? 'Esc' : binding.key.toUpperCase();
    parts.push(displayKey);
    
    return parts.join(isMac ? '' : '+');
  };

  if (!isVisible) return null;

  return (
    <div className="keyboard-help-overlay" onClick={() => setIsVisible(false)}>
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>Raccourcis clavier</h2>
          <div className="keyboard-help-header-actions">
            <button
              className="keyboard-help-close"
              onClick={() => setIsVisible(false)}
              title="Fermer (Esc)"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
        {message && (
          <div className={`keyboard-help-message ${message.type}`}>
            {message.text}
          </div>
        )}
        <div className="keyboard-help-content">
          {shortcutsByCategory.length > 0 ? (
            shortcutsByCategory.map((categoryObj, idx) => (
              <div key={idx} className="keyboard-help-category">
                <h3>{categoryObj.category}</h3>
                <div className="keyboard-help-items">
                  {categoryObj.items.map((item) => (
                    <div 
                      key={item._id} 
                      className={`keyboard-help-item ${item.isCustomized ? 'customized' : ''} ${!item.isEnabled ? 'disabled' : ''} ${editingAction === item.action ? 'editing' : ''}`}
                    >
                      <div className="keyboard-help-item-content">
                        {editingAction === item.action ? (
                          <>
                            <input
                              ref={recordingInputRef}
                              type="text"
                              className="keyboard-help-recording-input"
                              value={
                                recordingKeys?.keys?.key
                                  ? `${recordingKeys.keys.ctrlKey ? 'Ctrl+' : ''}${recordingKeys.keys.altKey ? 'Alt+' : ''}${recordingKeys.keys.shiftKey ? 'Shift+' : ''}${recordingKeys.keys.key?.toUpperCase()}`
                                  : 'En attente...'
                              }
                              readOnly
                            />
                            <span className="keyboard-help-recording-hint">
                              Appuyez sur les touches pour enregistrer...
                            </span>
                          </>
                        ) : (
                          <>
                            <kbd className="keyboard-help-keys">{formatKeys(item)}</kbd>
                            <span className="keyboard-help-description">
                              {item.description}
                              {item.isCustomized && <span className="custom-badge">Personnalisé</span>}
                              {!item.isEnabled && <span className="disabled-badge">Désactivé</span>}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="keyboard-help-actions">
                        {editingAction === item.action ? (
                          <>
                            <button
                              className="keyboard-help-btn save"
                              onClick={handleSaveShortcut}
                              disabled={!recordingKeys?.keys?.key}
                            >
                              Valider
                            </button>
                            <button
                              className="keyboard-help-btn cancel"
                              onClick={() => {
                                setRecordingKeys(null);
                                setEditingAction(null);
                              }}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="keyboard-help-btn modify"
                              onClick={() => handleStartEditing(item)}
                              title="Modifier ce raccourci"
                            >
                              <FontAwesomeIcon icon={faPencilAlt} />
                            </button>
                            <button
                              className="keyboard-help-btn reset"
                              onClick={() => handleResetShortcut(item.action)}
                              title="Réinitialiser ce raccourci"
                            >
                              <FontAwesomeIcon icon={faUndo} />
                            </button>
                            <button
                              className={`keyboard-help-btn toggle ${item.isEnabled ? 'enabled' : 'disabled'}`}
                              onClick={() => handleToggle(item.action)}
                              disabled={togglingId === item.action}
                              title={item.isEnabled ? 'Désactiver ce raccourci' : 'Activer ce raccourci'}
                            >
                              <FontAwesomeIcon icon={item.isEnabled ? faToggleOn : faToggleOff} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p>Chargement des raccourcis...</p>
          )}
        </div>
        <div className="keyboard-help-footer">
          <p>Appuyez sur <kbd>Esc</kbd> ou cliquez en dehors pour fermer</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;