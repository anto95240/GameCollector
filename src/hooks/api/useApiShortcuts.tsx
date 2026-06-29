import { useCallback, useState } from 'react'

import { getHardcodedDefaults } from '@/hooks/api/useApiShortcutsDefaults'
import { supabase } from '@/lib/supabase'
import keyboardShortcutsService from '@/services/keyboardShortcutsService'

// Mapping BDD (snake_case) → Frontend (camelCase)
const mapRowToShortcut = (row: any) => ({
  action: row.action,
  key: row.key,
  ctrlKey: row.ctrl_key,
  altKey: row.alt_key,
  shiftKey: row.shift_key,
  isEnabled: row.is_enabled,
})

// Mapping Frontend (camelCase) → BDD (snake_case)
const mapShortcutToRow = (shortcut: any, userId: string) => ({
  user_id: userId,
  action: shortcut.action,
  key: shortcut.key,
  ctrl_key: shortcut.ctrlKey ?? false,
  alt_key: shortcut.altKey ?? false,
  shift_key: shortcut.shiftKey ?? false,
  is_enabled: shortcut.isEnabled !== false,
  updated_at: new Date().toISOString(),
})

export const useApiShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const getShortcuts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('shortcuts').select('*')

      if (error) throw error

      const userShortcuts = (data || []).map(mapRowToShortcut)
      setShortcuts(userShortcuts)
      return userShortcuts
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des raccourcis')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateShortcut = useCallback(
    async (actionId: any, newBinding: any) => {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Non connecté')

        const row = mapShortcutToRow(
          { action: actionId, ...newBinding, isEnabled: newBinding.isEnabled !== false },
          user.id
        )

        const { error } = await supabase
          .from('shortcuts')
          .upsert(row, { onConflict: 'user_id, action' })

        if (error) throw error

        // Refresh la liste locale après l'upsert
        const updatedShortcuts = await getShortcuts()
        keyboardShortcutsService.loadCustomBindings(updatedShortcuts)
        return updatedShortcuts
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getShortcuts]
  )

  const toggleShortcut = useCallback(
    async (actionId: any) => {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Non connecté')

        // Chercher si le raccourci existe déjà en BDD
        const existing = shortcuts.find((s: any) => s.action === actionId)

        if (existing) {
          // Inverser is_enabled directement en BDD
          const { error } = await supabase
            .from('shortcuts')
            .update({ is_enabled: !existing.isEnabled, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('action', actionId)

          if (error) throw error
        } else {
          // Récupération de la touche par défaut si elle n'existe pas en BDD
          const defaultShortcut = getHardcodedDefaults().find((d: any) => d.action === actionId)
          const row = mapShortcutToRow(
            {
              action: actionId,
              key: defaultShortcut?.key || '',
              ctrlKey: defaultShortcut?.ctrlKey || false,
              altKey: defaultShortcut?.altKey || false,
              shiftKey: defaultShortcut?.shiftKey || false,
              isEnabled: false,
            },
            user.id
          )

          const { error } = await supabase.from('shortcuts').insert(row)

          if (error) throw error
        }

        // Refresh la liste locale
        const updatedShortcuts = await getShortcuts()
        keyboardShortcutsService.loadCustomBindings(updatedShortcuts)
        return updatedShortcuts
      } catch (err: any) {
        setError(err.message || 'Erreur lors du toggle')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [shortcuts, getShortcuts]
  )

  const resetShortcut = useCallback(
    async (actionId: any) => {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Non connecté')

        const { error } = await supabase
          .from('shortcuts')
          .delete()
          .eq('user_id', user.id)
          .eq('action', actionId)

        if (error) throw error

        // Refresh la liste locale
        const updatedShortcuts = await getShortcuts()
        keyboardShortcutsService.loadCustomBindings(updatedShortcuts)
        return updatedShortcuts
      } catch (err: any) {
        setError(err.message || 'Erreur lors du reset')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getShortcuts]
  )

  const resetAllShortcuts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const { error } = await supabase.from('shortcuts').delete().eq('user_id', user.id)

      if (error) throw error

      setShortcuts([])
      keyboardShortcutsService.loadCustomBindings([])
      return []
    } catch (err: any) {
      setError(err.message || 'Erreur lors du reset total')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    shortcuts,
    loading,
    error,
    getShortcuts,
    updateShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
  }
}

export default useApiShortcuts
