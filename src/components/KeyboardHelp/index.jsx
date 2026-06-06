import './KeyboardHelp.css';

import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';

import ShortcutItem from '@/components/common/ShortcutItem';
import { useAuth } from '@/context/AuthContext';
import { useApiShortcuts } from '@/hooks/api/useApiShortcuts';
import { getHardcodedDefaults,useApiShortcutsDefaults } from '@/hooks/api/useApiShortcutsDefaults';
import keyboardShortcutsService from '@/services/keyboardShortcutsService';

const KeyboardHelp = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();
  const { defaults, getDefaults } = useApiShortcutsDefaults();
  const { toggleShortcut, updateShortcut } = useApiShortcuts();
  const [shortcuts, setShortcuts] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [message, setMessage] = useState(null);

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  // Charger les valeurs par défaut
  useEffect(() => {
    if (!defaults) getDefaults();
  }, [defaults, getDefaults]);

  // Gérer l'ouverture/fermeture de la modale
  useEffect(() => {
    const handleShow = () => setIsVisible(true);
    const handleHide = (e) => { 
      if (e.key === 'Escape' && isVisible) { 
        e.preventDefault(); 
        setIsVisible(false); 
      } 
    };
    
    window.addEventListener('showKeyboardHelp', handleShow);
    window.addEventListener('keydown', handleHide);
    return () => {
      window.removeEventListener('showKeyboardHelp', handleShow);
      window.removeEventListener('keydown', handleHide);
    };
  }, [isVisible]);

  // Fusionner les raccourcis par défaut avec ceux de l'utilisateur
  useEffect(() => {
    if (!defaults) return;
    const shortcutList = (defaults.length > 0 ? defaults : getHardcodedDefaults()).map(def => {
      const custom = user?.shortcuts?.find(s => s.action === def.action);
      return {
        ...def,
        isCustomized: !!custom,
        isEnabled: custom?.isEnabled !== false,
        customBinding: (custom && custom.key) ? { 
          key: custom.key, 
          ctrlKey: custom.ctrlKey, 
          altKey: custom.altKey, 
          shiftKey: custom.shiftKey 
        } : null
      };
    });
    setShortcuts(shortcutList);
  }, [defaults, user?.shortcuts]);

  const showNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 2500);
  };

  const handleSave = async (actionId, keys) => {
    try {
      await updateShortcut(actionId, keys);
      const updated = shortcuts.map(s => s.action === actionId ? { ...s, ...keys, isCustomized: true } : s);
      setShortcuts(updated);
      keyboardShortcutsService.loadCustomBindings(updated);
      showNotification('success', t('keyboardShortcuts.savedSuccess'));
    } catch {
      showNotification('error', t('keyboardShortcuts.saveError'));
    }
  };

  const handleReset = async (actionId) => {
    const def = defaults?.find(d => d.action === actionId);
    if (!def) return showNotification('error', t('keyboardShortcuts.defaultNotFound'));
    try {
      await updateShortcut(actionId, { key: def.key, ctrlKey: def.ctrlKey, altKey: def.altKey, shiftKey: def.shiftKey });
      const updated = shortcuts.map(s => s.action === actionId ? { ...s, ...def, isCustomized: false } : s);
      setShortcuts(updated);
      keyboardShortcutsService.loadCustomBindings(updated);
      showNotification('success', t('keyboardShortcuts.resetSuccess'));
    } catch {
      showNotification('error', t('keyboardShortcuts.resetError'));
    }
  };

  const handleToggle = async (actionId) => {
    setTogglingId(actionId);
    try {
      await toggleShortcut(actionId);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  if (!isVisible) return null;

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <div className="keyboard-help-overlay" onClick={() => setIsVisible(false)}>
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>{t('keyboardShortcuts.title')}</h2>
          <button className="keyboard-help-close" onClick={() => setIsVisible(false)} title={`${t('keyboardShortcuts.footer')} Esc`}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {message && <div className={`keyboard-help-message ${message.type}`}>{message.text}</div>}
        
        <div className="keyboard-help-content">
          {categories.map(cat => (
            <div key={cat} className="keyboard-help-category">
              <h3>{cat}</h3>
              <div className="keyboard-help-items">
                {shortcuts.filter(s => s.category === cat).map(item => (
                  <ShortcutItem 
                    key={item._id || item.action} 
                    item={item} 
                    onSave={handleSave} 
                    onReset={handleReset} 
                    onToggle={handleToggle} 
                    isMac={isMac} 
                    isToggling={togglingId === item.action} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="keyboard-help-footer">
          <p>{t('keyboardShortcuts.footer')} <kbd>Esc</kbd> {t('keyboardShortcuts.footerClose')}</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;