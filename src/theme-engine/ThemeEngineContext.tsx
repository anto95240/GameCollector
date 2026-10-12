/**
 * src/theme-engine/ThemeEngineContext.tsx
 *
 * Contexte React permettant d'exposer l'instance du moteur d'animation ThemeEngine
 * aux composants qui en ont besoin (ThemePreview, banc d'essai, télémétrie FPS).
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react'

import type { ThemeEngine } from './runtime/ThemeEngine'

interface ThemeEngineContextValue {
  engine: ThemeEngine | null
}

const ThemeEngineContext = createContext<ThemeEngineContextValue>({ engine: null })

let globalEngineInstance: ThemeEngine | null = null
const engineListeners: Set<(engine: ThemeEngine | null) => void> = new Set()

export function setGlobalThemeEngine(engine: ThemeEngine | null): void {
  globalEngineInstance = engine
  engineListeners.forEach((fn) => fn(engine))
}

export function getGlobalThemeEngine(): ThemeEngine | null {
  return globalEngineInstance
}

export function useActiveThemeEngine(): ThemeEngine | null {
  const [engine, setEngine] = useState<ThemeEngine | null>(() => getGlobalThemeEngine())

  useEffect(() => {
    const handler = (inst: ThemeEngine | null) => setEngine(inst)
    engineListeners.add(handler)
    setEngine(getGlobalThemeEngine())
    return () => {
      engineListeners.delete(handler)
    }
  }, [])

  return engine
}

export const ThemeEngineProvider: React.FC<{
  engine: ThemeEngine | null
  children: React.ReactNode
}> = ({ engine, children }) => {
  return (
    <ThemeEngineContext.Provider value={{ engine }}>
      {children}
    </ThemeEngineContext.Provider>
  )
}
