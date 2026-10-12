/**
 * src/theme-engine/featureFlag.ts
 *
 * Flag de sélection du moteur d'animation (V1 Ancien vs V2 Nouveau).
 * Permet de basculer en temps réel sans modifier l'ancien code.
 */

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'gc_theme_engine_version'

export type ThemeEngineVersion = 'v1' | 'v2'

export function getThemeEngineVersion(): ThemeEngineVersion {
  if (typeof window === 'undefined') return 'v2'
  const val = localStorage.getItem(STORAGE_KEY)
  if (val === 'v1') return 'v1'
  return 'v2' // V2 activé par défaut
}

export function setThemeEngineVersion(version: ThemeEngineVersion): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, version)
  window.dispatchEvent(new CustomEvent('gc-theme-engine-change', { detail: version }))
}

export function useThemeEngineVersion(): [ThemeEngineVersion, (v: ThemeEngineVersion) => void] {
  const [version, setVersion] = useState<ThemeEngineVersion>(getThemeEngineVersion)

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<ThemeEngineVersion>
      setVersion(custom.detail || getThemeEngineVersion())
    }
    window.addEventListener('gc-theme-engine-change', handler)
    return () => window.removeEventListener('gc-theme-engine-change', handler)
  }, [])

  return [version, setThemeEngineVersion]
}
