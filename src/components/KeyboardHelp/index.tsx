import './KeyboardHelp.css'

import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ShortcutItem from '@/components/common/ShortcutItem'
import { useApiShortcuts } from '@/hooks/api/useApiShortcuts'
import { getHardcodedDefaults, useApiShortcutsDefaults } from '@/hooks/api/useApiShortcutsDefaults'

const KeyboardHelp = () => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const { defaults, getDefaults } = useApiShortcutsDefaults()
  const {
    shortcuts: apiShortcuts,
    getShortcuts,
    toggleShortcut,
    updateShortcut,
  } = useApiShortcuts()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  // Fetch API shortcuts when modal opens
  useEffect(() => {
    if (isVisible) {
      getShortcuts().catch(console.error)
    }
  }, [isVisible, getShortcuts])

  // Charger les valeurs par défaut
  useEffect(() => {
    if (!defaults) getDefaults()
  }, [defaults, getDefaults])

  // Gérer l'ouverture/fermeture de la modale
  useEffect(() => {
    const handleShow = () => setIsVisible(true)
    const handleHide = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        e.preventDefault()
        setIsVisible(false)
      }
    }

    window.addEventListener('showKeyboardHelp', handleShow)
    window.addEventListener('keydown', handleHide)
    return () => {
      window.removeEventListener('showKeyboardHelp', handleShow)
      window.removeEventListener('keydown', handleHide)
    }
  }, [isVisible])

  const customShortcuts = apiShortcuts || []
  const activeDefaults = defaults && defaults.length > 0 ? defaults : getHardcodedDefaults()

  const displayShortcuts = activeDefaults.map((def: any) => {
    const custom = customShortcuts.find((s: any) => s.action === def.action)
    return {
      ...def,
      isCustomized: !!custom,
      isEnabled: custom?.isEnabled !== false,
      customBinding: custom?.key
        ? {
            key: custom.key,
            ctrlKey: custom.ctrlKey,
            altKey: custom.altKey,
            shiftKey: custom.shiftKey,
          }
        : null,
    }
  })

  const showNotification = (type: string, text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 2500)
  }

  const handleSave = async (actionId: string, keys: any) => {
    try {
      await updateShortcut(actionId, keys)
      getShortcuts() // Refresh local list
      // Note: useApiShortcuts updates keyboardShortcutsService inside saveShortcutsToDb
      showNotification('success', t('keyboardShortcuts.savedSuccess'))
    } catch {
      showNotification('error', t('keyboardShortcuts.saveError'))
    }
  }

  const handleReset = async (actionId: string) => {
    const def = defaults?.find((d: any) => d.action === actionId)
    if (!def) return showNotification('error', t('keyboardShortcuts.defaultNotFound'))
    try {
      await updateShortcut(actionId, {
        key: def.key,
        ctrlKey: def.ctrlKey,
        altKey: def.altKey,
        shiftKey: def.shiftKey,
      })
      getShortcuts() // Refresh local list
      showNotification('success', t('keyboardShortcuts.resetSuccess'))
    } catch {
      showNotification('error', t('keyboardShortcuts.resetError'))
    }
  }

  const handleToggle = async (actionId: string) => {
    setTogglingId(actionId)
    try {
      await toggleShortcut(actionId)
      getShortcuts()
    } catch (err: any) {
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  if (!isVisible) return null

  const categories = [...new Set(displayShortcuts.map((s: any) => s.category))]

  return (
    <div className="keyboard-help-overlay" onClick={() => setIsVisible(false)}>
      <div className="keyboard-help-modal" onClick={(e: any) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>{t('keyboardShortcuts.title')}</h2>
          <button
            className="keyboard-help-close"
            onClick={() => setIsVisible(false)}
            title={`${t('keyboardShortcuts.footer')} Esc`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {message && <div className={`keyboard-help-message ${message.type}`}>{message.text}</div>}

        <div className="keyboard-help-content">
          {categories.map((cat: any) => (
            <div key={cat} className="keyboard-help-category">
              <h3>{cat}</h3>
              <div className="keyboard-help-items">
                {displayShortcuts
                  .filter((s: any) => s.category === cat)
                  .map((item: any) => (
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
          <p>
            {t('keyboardShortcuts.footer')} <kbd>Esc</kbd> {t('keyboardShortcuts.footerClose')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardHelp
