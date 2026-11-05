/**
 * src/theme-engine/components/FallbackStatic.tsx
 *
 * Rendu de secours ultra-léger sans WebGL (CSS Gradient + Canvas 2D minimal)
 * activé si WebGL n'est pas disponible sur le terminal ou en cas de crash graphique.
 */

import React, { useEffect, useRef } from 'react'

import type { PaletteConfig } from '../types'

interface FallbackStaticProps {
  palette?: PaletteConfig
}

export const FallbackStatic: React.FC<FallbackStaticProps> = ({ palette }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const primary = palette?.primary || '#00f0ff'
  const secondary = palette?.secondary || '#0f172a'

  // Boucle Canvas 2D ultra-légère (24 particules simples, 0 allocation en boucle)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number | null = null
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random() * 2,
      vy: -0.2 - Math.random() * 0.3,
      alpha: 0.1 + Math.random() * 0.3,
    }))

    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    let prefersReduced = mediaQuery ? mediaQuery.matches : false

    const drawFrame = (advance: boolean) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = primary
      for (const p of particles) {
        if (advance) {
          p.y += p.vy
          if (p.y < 0) p.y = h
        }
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const startLoop = () => {
      if (animId !== null || prefersReduced || document.hidden) return
      const loop = () => {
        drawFrame(true)
        animId = requestAnimationFrame(loop)
      }
      animId = requestAnimationFrame(loop)
    }

    const stopLoop = () => {
      if (animId !== null) {
        cancelAnimationFrame(animId)
        animId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
      } else if (!prefersReduced) {
        startLoop()
      }
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReduced = e.matches
      if (prefersReduced) {
        stopLoop()
        drawFrame(false)
      } else if (!document.hidden) {
        startLoop()
      }
    }

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      if (prefersReduced || document.hidden) {
        drawFrame(false)
      }
    }

    // Premier rendu statique
    drawFrame(false)

    if (!prefersReduced && !document.hidden) {
      startLoop()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('resize', handleResize)
    mediaQuery?.addEventListener('change', handleMotionChange)

    return () => {
      stopLoop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('resize', handleResize)
      mediaQuery?.removeEventListener('change', handleMotionChange)
    }
  }, [primary])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: `radial-gradient(circle at 50% 30%, ${primary}15 0%, ${secondary} 80%)`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
