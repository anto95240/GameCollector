/**
 * src/theme-engine/ThemeEngineHost.tsx
 *
 * Composant hôte persistant du nouveau moteur d'animation ThemeEngine.
 * Monté via ReactDOM.createPortal vers document.body (derrière #app-container).
 * Garde le canvas WebGL monté de manière permanente et permute les thèmes par configuration.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from '@/context/ThemeContext'

import { ContentShield } from './components/ContentShield'
import { FallbackStatic } from './components/FallbackStatic'
import { getThemeConfig } from './configs'
import { ThemeEngine } from './runtime/ThemeEngine'
import { setGlobalThemeEngine } from './ThemeEngineContext'
import type { ThemeEngineConfig } from './types'

export interface ThemeEngineHostProps {
  overridePreset?: string | null
}

export const ThemeEngineHost: React.FC<ThemeEngineHostProps> = ({ overridePreset }) => {
  const { activePreset, isPreviewMode } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<ThemeEngine | null>(null)

  const [currentConfig, setCurrentConfig] = useState<ThemeEngineConfig | null>(null)
  const [isContextLost, setIsContextLost] = useState(false)

  // Déterminer le preset effectif
  const isGlobalMode = overridePreset === undefined
  const effectivePreset = useMemo(() => {
    return isGlobalMode ? activePreset : (overridePreset ?? 'test_ambient')
  }, [isGlobalMode, activePreset, overridePreset])

  // 1. Initialisation unique du ThemeEngine sur le canvas monté
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Vérifier le support de WebGL avant initialisation
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) {
      console.warn('[ThemeEngineHost] WebGL indisponible, bascule vers FallbackStatic.')
      setIsContextLost(true)
      return
    }

    const engine = new ThemeEngine({
      canvas,
      onContextLost: () => setIsContextLost(true),
      onContextRestored: () => setIsContextLost(false),
    })

    engineRef.current = engine
    setGlobalThemeEngine(engine)

    return () => {
      setGlobalThemeEngine(null)
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  // 2. Chargement réactif de la configuration de thème
  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      const config = await getThemeConfig(effectivePreset)
      if (isCancelled) return

      setCurrentConfig(config)
      if (engineRef.current && !isContextLost) {
        engineRef.current.loadTheme(config)
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [effectivePreset, isContextLost])

  // Si on est en mode global et que la page de preview est active,
  // ne pas doubler les animations (ThemePreview monte son propre Host)
  if (isGlobalMode && isPreviewMode) {
    return null
  }

  const content = (
    <>
      {/* 1. Canvas WebGL unique persistant (z-index: 0, pointer-events: none) */}
      <div
        className="theme-engine-canvas-layer"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: isContextLost ? 'none' : 'block',
          }}
        />
        {/* Rendu de secours si WebGL perdu ou non supporté */}
        {isContextLost && <FallbackStatic palette={currentConfig?.palette} />}
      </div>

      {/* 2. Voile de protection WCAG AA intercalé (z-index: 1) entre l'animation (0) et l'UI (#app-container à 2) */}
      <ContentShield config={currentConfig?.contentShield} palette={currentConfig?.palette} />
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
