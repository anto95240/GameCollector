import { useEffect, useRef } from 'react'

import keyboardShortcutsService from '@/services/keyboardShortcutsService'

export const useKeyboardShortcuts = (shortcuts = [], enabled = true) => {
  const shortcutsRef = useRef<any[]>([])

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return
    }

    shortcuts.forEach((shortcut: any) => {
      // Utilise shortcut.action s'il existe, sinon utilise la touche comme identifiant par défaut
      const actionId = shortcut.action || shortcut.key

      keyboardShortcutsService.register(actionId, shortcut.key, shortcut.callback, {
        ctrlKey: shortcut.ctrlKey,
        metaKey: shortcut.metaKey || shortcut.ctrlKey,
        altKey: shortcut.altKey,
        shiftKey: shortcut.shiftKey,
        preventDefault: shortcut.preventDefault !== false,
      })
      shortcutsRef.current.push(actionId)
    })

    return () => {
      shortcutsRef.current.forEach((actionId: any) => {
        keyboardShortcutsService.unregister(actionId)
      })
      shortcutsRef.current = [] // Nettoyage
    }
  }, [shortcuts, enabled])

  return keyboardShortcutsService
}

export default useKeyboardShortcuts
