/**
 * ThemeAnimationLayer.tsx
 *
 * Composant orchestrateur rendu via ReactDOM.createPortal vers document.body.
 * Ceci est ESSENTIEL car #app-container a overflow:hidden qui capture
 * les position:fixed enfants et les rend invisibles.
 * En montant le layer directement dans body, les animations s'affichent
 * sur TOUTE la page, derriere #app-container.
 *
 * Props :
 *   overridePreset - si fourni, utilise ce preset au lieu de activePreset
 *                    (utile pour la page de preview admin).
 *
 * BUG FIX : tous les useMemo sont AVANT les early returns pour respecter
 * les règles des hooks React. Les tableaux filtrés sont mémoïsés pour
 * éviter que setIsPaused() (déclenché par visibilitychange) ne cause
 * une réinitialisation de CanvasLayer via useEffect([configs]).
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from '@/context/ThemeContext'

import { CanvasLayer } from './layers/CanvasLayer'
import { CssLayer } from './layers/CssLayer'
import type {
  AuroraBandsLayerConfig,
  FogLayerConfig,
  GlowLayerConfig,
  ParticleLayerConfig,
  RainLayerConfig,
  ScanlinesLayerConfig,
  StarsLayerConfig,
} from './themeAnimationConfig'
import { THEME_ANIMATION_CONFIG } from './themeAnimationConfig'

interface ThemeAnimationLayerProps {
  overridePreset?: string | null
}

export function ThemeAnimationLayer({ overridePreset }: ThemeAnimationLayerProps = {}) {
  const { activePreset, isPreviewMode } = useTheme()
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  // -- prefers-reduced-motion --
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    setIsPaused(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches)
      setIsPaused(e.matches || document.hidden)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // -- Visibilite onglet --
  // NOTE : on utilise isPaused comme PROP vers CanvasLayer (qui met en pause le RAF)
  // mais on NE recrée PAS les configs pour ne pas réinitialiser l'animation.
  useEffect(() => {
    const handler = () => setIsPaused(document.hidden || prefersReduced)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [prefersReduced])

  // -- Preset effectif --
  const isGlobalMode = overridePreset === undefined
  const effectivePreset = isGlobalMode ? activePreset : (overridePreset ?? '')

  // -- Config --
  const config = useMemo(() => THEME_ANIMATION_CONFIG[effectivePreset] ?? null, [effectivePreset])

  // -- Trier les configs par type --
  // TOUS les useMemo sont AVANT les early returns (règles des hooks React).
  // Mémoïsés sur [config] uniquement → ne changent PAS quand isPaused change,
  // donc CanvasLayer ne se réinitialise pas au changement de visibilité d'onglet.
  const canvasConfigs = useMemo(
    () =>
      (config?.layers ?? []).filter(
        (
          l
        ): l is ParticleLayerConfig | StarsLayerConfig | RainLayerConfig | AuroraBandsLayerConfig =>
          l.type === 'particles' ||
          l.type === 'stars' ||
          l.type === 'rain' ||
          l.type === 'aurora_bands'
      ),
    [config]
  )
  const fogConfigs = useMemo(
    () => (config?.layers ?? []).filter((l): l is FogLayerConfig => l.type === 'fog'),
    [config]
  )
  const glowConfigs = useMemo(
    () => (config?.layers ?? []).filter((l): l is GlowLayerConfig => l.type === 'glow'),
    [config]
  )
  const scanlineConfigs = useMemo(
    () => (config?.layers ?? []).filter((l): l is ScanlinesLayerConfig => l.type === 'scanlines'),
    [config]
  )

  // -- Early returns APRES tous les hooks --
  if (isGlobalMode && isPreviewMode) return null
  if (!config) return null
  if (prefersReduced) return null

  const shield = config.contentShield

  // z-index: 0 pour rester derriere #app-container
  // Le portal monte dans body donc pas affecte par overflow:hidden de #app-container
  const layerContent = (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Calques Canvas */}
      {canvasConfigs.length > 0 && <CanvasLayer configs={canvasConfigs} paused={isPaused} />}
      {/* Calques CSS */}
      {(fogConfigs.length > 0 || glowConfigs.length > 0 || scanlineConfigs.length > 0) && (
        <CssLayer
          fogConfigs={fogConfigs}
          glowConfigs={glowConfigs}
          scanlineConfigs={scanlineConfigs}
          paused={isPaused}
        />
      )}
      {/* Voile de protection lisibilite WCAG */}
      {shield?.enabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: shield.color,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )

  return createPortal(layerContent, document.body)
}
