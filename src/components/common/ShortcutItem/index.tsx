import './ShortcutItem.css'

import { faPencilAlt, faToggleOff, faToggleOn, faUndo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface ShortcutItemProps {
  item: any;
  onSave: (action: string, keys: any) => void;
  onReset: (action: string) => void;
  onToggle: (action: string) => void;
  isMac: boolean;
  isToggling: boolean;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ item, onSave, onReset, onToggle, isMac, isToggling }: any) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [recordedKeys, setRecordedKeys] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Capture des touches uniquement quand ce raccourci précis est en édition
  useEffect(() => {
    if (!isEditing) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      setRecordedKeys({
        key: e.key.toLowerCase(),
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      })
    }

    inputRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing])

  const handleSaveClick = () => {
    if (recordedKeys?.key) {
      onSave(item.action, recordedKeys)
      setIsEditing(false)
    }
  }

  const formatKeys = (binding: any) => {
    if (!binding || !binding.key) return ''
    const parts = []
    if (binding.ctrlKey) parts.push(isMac ? '⌘' : 'Ctrl')
    if (binding.altKey) parts.push(isMac ? '⌥' : 'Alt')
    if (binding.shiftKey) parts.push(isMac ? '⇧' : 'Shift')

    parts.push(binding.key === 'Escape' ? 'Esc' : binding.key.toUpperCase())
    return parts.join(isMac ? '' : '+')
  }

  const displayKeys =
    isEditing && recordedKeys ? formatKeys(recordedKeys) : formatKeys(item.customBinding || item)

  return (
    <div
      className={`keyboard-help-item ${item.isCustomized ? 'customized' : ''} ${!item.isEnabled ? 'disabled' : ''} ${isEditing ? 'editing' : ''}`}
    >
      <div className="keyboard-help-item-content">
        {isEditing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              className="keyboard-help-recording-input"
              value={displayKeys || t('keyboardShortcuts.waiting')}
              readOnly
            />
            <span className="keyboard-help-recording-hint">{t('keyboardShortcuts.recording')}</span>
          </>
        ) : (
          <>
            <kbd className="keyboard-help-keys">{displayKeys}</kbd>
            <span className="keyboard-help-description">
              {item.description}
              {item.isCustomized && (
                <span className="custom-badge">{t('keyboardShortcuts.customBadge')}</span>
              )}
              {!item.isEnabled && (
                <span className="disabled-badge">{t('keyboardShortcuts.disabledBadge')}</span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="keyboard-help-actions">
        {isEditing ? (
          <>
            <button
              className="keyboard-help-btn save"
              onClick={handleSaveClick}
              disabled={!recordedKeys?.key}
            >
              {t('keyboardShortcuts.save')}
            </button>
            <button
              className="keyboard-help-btn cancel"
              onClick={() => {
                setIsEditing(false)
                setRecordedKeys(null)
              }}
            >
              {t('keyboardShortcuts.cancel')}
            </button>
          </>
        ) : (
          <>
            <button
              className="keyboard-help-btn modify"
              onClick={() => {
                setIsEditing(true)
                setRecordedKeys(null)
              }}
              title={t('keyboardShortcuts.modify')}
            >
              <FontAwesomeIcon icon={faPencilAlt} />
            </button>
            <button
              className="keyboard-help-btn reset"
              onClick={() => onReset(item.action)}
              title={t('keyboardShortcuts.reset')}
            >
              <FontAwesomeIcon icon={faUndo} />
            </button>
            <button
              className={`keyboard-help-btn toggle ${item.isEnabled ? 'enabled' : 'disabled'}`}
              onClick={() => onToggle(item.action)}
              disabled={isToggling}
              title={
                item.isEnabled ? t('keyboardShortcuts.disable') : t('keyboardShortcuts.enable')
              }
            >
              <FontAwesomeIcon icon={item.isEnabled ? faToggleOn : faToggleOff} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ShortcutItem
