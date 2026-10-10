/**
 * CssLayer.tsx
 *
 * Calques CSS purs : fog, glow, scanlines
 * Aucun Canvas, aucune manipulation du DOM en dehors du rendu React.
 * Anim� via @keyframes CSS inject�es dynamiquement une seule fois.
 */

import { useEffect, useRef } from 'react'

import type { FogLayerConfig, GlowLayerConfig, ScanlinesLayerConfig } from '../themeAnimationConfig'

// Injecter les keyframes une seule fois dans le document
let keyframesInjected = false
function ensureKeyframes() {
  if (keyframesInjected) return
  keyframesInjected = true
  const style = document.createElement('style')
  style.id = 'theme-animation-keyframes'
  style.textContent = `
    @keyframes ta-fog-drift-1 {
      0%   { transform: translateX(0%) translateY(0) scaleX(1); opacity: 1; }
      50%  { transform: translateX(-8%) translateY(2%) scaleX(1.05); opacity: 0.6; }
      100% { transform: translateX(0%) translateY(0) scaleX(1); opacity: 1; }
    }
    @keyframes ta-fog-drift-2 {
      0%   { transform: translateX(0%) translateY(0) scaleX(1); opacity: 0.8; }
      50%  { transform: translateX(6%) translateY(-3%) scaleX(0.97); opacity: 0.4; }
      100% { transform: translateX(0%) translateY(0) scaleX(1); opacity: 0.8; }
    }
    @keyframes ta-fog-drift-3 {
      0%   { transform: translateX(0%) translateY(0); opacity: 0.5; }
      50%  { transform: translateX(-4%) translateY(4%); opacity: 0.3; }
      100% { transform: translateX(0%) translateY(0); opacity: 0.5; }
    }
    @keyframes ta-glow-pulse {
      0%, 100% { opacity: 0.3; }
      50%       { opacity: 1; }
    }
    @keyframes ta-scanlines-scroll {
      0%   { background-position: 0 0; }
      100% { background-position: 0 100px; }
    }
  `
  document.head.appendChild(style)
}

// ------------------------------------------------------------------------------

interface CssLayerProps {
  fogConfigs: FogLayerConfig[]
  glowConfigs: GlowLayerConfig[]
  scanlineConfigs: ScanlinesLayerConfig[]
  paused: boolean
}

export function CssLayer({ fogConfigs, glowConfigs, scanlineConfigs, paused }: CssLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ensureKeyframes()
  }, [])

  // Contr�le pause : animation-play-state
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const state = paused ? 'paused' : 'running'
    // Appliquer � tous les enfants anim�s
    el.querySelectorAll<HTMLElement>('[data-ta-animated]').forEach((child) => {
      child.style.animationPlayState = state
    })
  }, [paused])

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      {/* -- FOG -- */}
      {fogConfigs.map((cfg, i) => {
        const anims = ['ta-fog-drift-1', 'ta-fog-drift-2', 'ta-fog-drift-3']
        return Array.from({ length: cfg.layers }).map((_, li) => (
          <div
            key={`fog-${i}-${li}`}
            data-ta-animated="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 80% 40% at ${50 + li * 10}% ${30 + li * 20}%, ${cfg.color}, transparent)`,
              opacity: cfg.opacity * (1 - li * 0.2),
              animation: `${anims[li % anims.length]} ${cfg.duration + li * 3}s ease-in-out infinite alternate`,
              willChange: 'transform, opacity',
              mixBlendMode: 'screen',
            }}
          />
        ))
      })}

      {/* -- GLOW -- */}
      {glowConfigs.map((cfg, i) => {
        const gradients: Record<GlowLayerConfig['position'], string> = {
          top: `radial-gradient(ellipse ${cfg.size}vw 20vh at 50% 0%, ${cfg.color}, transparent)`,
          bottom: `radial-gradient(ellipse ${cfg.size}vw 20vh at 50% 100%, ${cfg.color}, transparent)`,
          all: `radial-gradient(ellipse ${cfg.size}vw ${cfg.size}vh at 50% 50%, ${cfg.color}, transparent)`,
          corners: `
            radial-gradient(ellipse 20vw 20vh at 0% 0%, ${cfg.color}, transparent),
            radial-gradient(ellipse 20vw 20vh at 100% 0%, ${cfg.color}, transparent),
            radial-gradient(ellipse 20vw 20vh at 0% 100%, ${cfg.color}, transparent),
            radial-gradient(ellipse 20vw 20vh at 100% 100%, ${cfg.color}, transparent)
          `,
        }
        return (
          <div
            key={`glow-${i}`}
            data-ta-animated="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: gradients[cfg.position],
              opacity: cfg.opacity,
              animation: `ta-glow-pulse ${cfg.duration}s ease-in-out infinite`,
              willChange: 'opacity',
              pointerEvents: 'none',
            }}
          />
        )
      })}

      {/* -- SCANLINES -- */}
      {scanlineConfigs.map((cfg, i) => (
        <div
          key={`scanlines-${i}`}
          data-ta-animated={cfg.speed > 0 ? 'true' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${cfg.spacing - 1}px,
              ${cfg.color} ${cfg.spacing - 1}px,
              ${cfg.color} ${cfg.spacing}px
            )`,
            opacity: cfg.opacity,
            animation:
              cfg.speed > 0 ? `ta-scanlines-scroll ${10 / cfg.speed}s linear infinite` : undefined,
            willChange: cfg.speed > 0 ? 'background-position' : undefined,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  )
}
