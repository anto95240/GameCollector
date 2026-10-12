/**
 * src/theme-engine/components/ContentShield.tsx
 *
 * Voile de protection et de lisibilité WCAG AA intercalé entre
 * le canvas WebGL (z-index: 0) et le contenu de l'application (z-index: 2+).
 * Utilise le module mathématique WcagLuminance pour réguler dynamiquement son opacité.
 */

import React, { useMemo } from 'react'

import { calculateShieldOpacity } from '../runtime/WcagLuminance'
import type { ContentShieldConfig, PaletteConfig } from '../types'

interface ContentShieldProps {
  config?: ContentShieldConfig
  palette?: PaletteConfig
}

export const ContentShield: React.FC<ContentShieldProps> = ({ config, palette }) => {
  const opacity = useMemo(() => {
    if (!config) return 0.25

    if (config.autoRegulateWcag && palette) {
      // Calcul mathématique basé sur la couleur de fond et l'ambiance du thème
      return calculateShieldOpacity(
        palette.secondary || palette.ambientLight || '#0f172a',
        '#f8fafc', // Texte blanc/clair standard
        config.tintColor || palette.secondary || '#020617',
        config.minContrastRatio || 4.5
      )
    }

    return config.baseOpacity ?? 0.25
  }, [config, palette])

  const backgroundColor = config?.tintColor || palette?.secondary || '#020617'
  const backdropFilter = config?.blurRadiusPx ? `blur(${config.blurRadiusPx}px)` : undefined

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1, // Devant le WebGL (0) et derrière l'UI (#app-container à 2)
        pointerEvents: 'none',
        backgroundColor,
        opacity,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        transition: 'opacity 0.4s ease, background-color 0.4s ease',
      }}
    />
  )
}
