/**
 * src/theme-engine/index.ts
 *
 * Point d'entrée public du nouveau moteur d'animation ThemeEngine.
 */

export * from './bricks'
export { ContentShield } from './components/ContentShield'
export { FallbackStatic } from './components/FallbackStatic'
export { getThemeConfig } from './configs'
export { TEST_THEME_CONFIG } from './configs/testTheme'
export type { ThemeEngineVersion } from './featureFlag'
export {
  getThemeEngineVersion,
  setThemeEngineVersion,
  useThemeEngineVersion,
} from './featureFlag'
export { ThemeEngine } from './runtime/ThemeEngine'
export {
  getGlobalThemeEngine,
  setGlobalThemeEngine,
  ThemeEngineProvider,
  useActiveThemeEngine,
} from './ThemeEngineContext'
export { ThemeEngineHost } from './ThemeEngineHost'
export * from './types'
