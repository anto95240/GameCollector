import { useCallback, useState } from 'react'

import { getHardcodedDefaults } from '@/hooks/api/useApiShortcutsDefaults'
import { supabase } from '@/lib/supabase'
import keyboardShortcutsService from '@/services/keyboardShortcutsService'

export const useApiShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const getShortcuts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('shortcuts')
        .select('shortcuts')
        .single()
      
      if (error && error.code !== 'PGRST116') throw error

      const userShortcuts = data?.shortcuts || []
      setShortcuts(userShortcuts)
      return userShortcuts
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des raccourcis')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const saveShortcutsToDb = async (updatedShortcuts: any[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    const { error } = await supabase
      .from('shortcuts')
      .upsert(
        { user_id: user.id, shortcuts: updatedShortcuts, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (error) throw error

    setShortcuts(updatedShortcuts)
    keyboardShortcutsService.loadCustomBindings(updatedShortcuts)
    return updatedShortcuts
  }

  const updateShortcut = useCallback(
    async (actionId: any, newBinding: any) => {
      setLoading(true)
      setError(null)
      try {
        const currentShortcuts = shortcuts || []
        const existingIndex = currentShortcuts.findIndex((s: any) => s.action === actionId)

        const updatedShortcuts = [...currentShortcuts]
        if (existingIndex >= 0) {
          updatedShortcuts[existingIndex] = {
            ...updatedShortcuts[existingIndex],
            ...newBinding,
          }
        } else {
          updatedShortcuts.push({
            action: actionId,
            ...newBinding,
            isEnabled: true,
          })
        }

        return await saveShortcutsToDb(updatedShortcuts)
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [shortcuts]
  )

  const toggleShortcut = useCallback(
    async (actionId: any) => {
      setLoading(true)
      setError(null)
      try {
        const currentShortcuts = shortcuts || []
        const existingIndex = currentShortcuts.findIndex((s: any) => s.action === actionId)
        const updatedShortcuts = [...currentShortcuts]

        if (existingIndex >= 0) {
          updatedShortcuts[existingIndex].isEnabled = !updatedShortcuts[existingIndex].isEnabled
        } else {
          // Récupération de la touche par défaut si elle n'existe pas en BDD
          const defaultShortcut = getHardcodedDefaults().find((d: any) => d.action === actionId)
          updatedShortcuts.push({
            action: actionId,
            key: defaultShortcut?.key || '',
            ctrlKey: defaultShortcut?.ctrlKey || false,
            altKey: defaultShortcut?.altKey || false,
            shiftKey: defaultShortcut?.shiftKey || false,
            isEnabled: false,
          })
        }

        return await saveShortcutsToDb(updatedShortcuts)
      } catch (err: any) {
        setError(err.message || 'Erreur lors du toggle')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [shortcuts]
  )

  const resetShortcut = useCallback(
    async (actionId: any) => {
      setLoading(true)
      setError(null)
      try {
        const updatedShortcuts = (shortcuts || []).filter((s: any) => s.action !== actionId)
        return await saveShortcutsToDb(updatedShortcuts)
      } catch (err: any) {
        setError(err.message || 'Erreur lors du reset')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [shortcuts]
  )

  const resetAllShortcuts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await saveShortcutsToDb([])
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
