// src/hooks/api/useApiUserSettings.tsx
import { useCallback } from 'react'

import { supabase } from '@/lib/supabase'
import type { UserSettings } from '@/types/dashboardSettings'

import cacheManager from './utils/cacheManager'

const SETTINGS_TTL = 10 * 60 * 1000 // 10 minutes

export const useApiUserSettings = () => {
  // ── GET USER SETTINGS ───────────────────────────────────────────────
  const getUserSettings = useCallback(async (): Promise<UserSettings | null> => {
    const cacheKey = 'user:settings'
    const cached = cacheManager.get(cacheKey)
    if (cached) return cached

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // PGRST116 = no rows found — l'utilisateur n'a pas encore de settings
    if (error && error.code !== 'PGRST116') {
      console.error('Erreur chargement user_settings:', error)
      return null
    }

    if (data) {
      cacheManager.set(cacheKey, data, SETTINGS_TTL)
    }

    return data
  }, [])

  // ── UPSERT USER SETTINGS ────────────────────────────────────────────
  const upsertUserSettings = useCallback(
    async (settings: Partial<UserSettings>): Promise<UserSettings | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const payload = {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error

      // Invalider le cache
      cacheManager.delete('user:settings')

      return data
    },
    []
  )

  return {
    getUserSettings,
    upsertUserSettings,
  }
}
