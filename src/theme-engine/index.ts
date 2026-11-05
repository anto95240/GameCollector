/**
 * src/theme-engine/index.ts
 *
 * Point d'entrée public du nouveau moteur d'animation ThemeEngine.
 */

import { lazy } from 'react'

export * from './bricks'
export { ContentShield } from './components/ContentShield'
export { FallbackStatic } from './components/FallbackStatic'
export { getThemeConfig } from './configs'
export { TEST_THEME_CONFIG } from './configs/testTheme'
export type { ThemeEngineVersion } from './featureFlag'
export { getThemeEngineVersion, setThemeEngineVersion, useThemeEngineVersion } from './featureFlag'
export type { ThemeEngine } from './runtime/ThemeEngine'
export {
  getGlobalThemeEngine,
  setGlobalThemeEngine,
  ThemeEngineProvider,
  useActiveThemeEngine,
} from './ThemeEngineContext'
export const ThemeEngineHost = lazy(() => import('./ThemeEngineHost'))
export type { ThemeEngineHostProps } from './ThemeEngineHost'
export * from './types'
