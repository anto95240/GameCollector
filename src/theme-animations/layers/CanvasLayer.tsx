/**
 * CanvasLayer.tsx — Moteur de rendu Canvas
 *
 * aurora_bands v7 — "Un rideau, pas des bandes"
 *
 *  PROBLÈME DE LA v6 : plusieurs bandes horizontales indépendantes empilées
 *  → l'œil perçoit des strates séparées, pas un rideau continu.
 *
 *  SOLUTION v7 :
 *  1 ARC PRINCIPAL dominant (brillant, grand amplitude de serpentement)
 *  + 1-2 arcs secondaires (plus discrets, décalés en altitude)
 *  + LUEUR DIFFUSE PERMANENTE entre et autour des arcs
 *    → même dans les zones sombres, une présence verte douce
 *  + PROFONDEUR 3D : les arcs secondaires sont légèrement décalés
 *    en temps/phase, donnant l'illusion de couches superposées
 *
 *  L'arc principal serpente fortement (waveAmplitude × 3)
 *  pour créer des boucles dramatiques comme dans la vidéo de référence.
 */

import { useEffect, useRef } from 'react'

import type {
  AuroraBandsLayerConfig,
  ParticleLayerConfig,
  RainLayerConfig,
  StarsLayerConfig,
} from '../themeAnimationConfig'

interface Particle {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  targetOpacity: number
  speedY: number
  phase: number
  drift: number
}
interface Star {
  x: number
  y: number
  radius: number
  baseOpacity: number
  opacity: number
  phase: number
  speed: number
}
interface Drop {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
}

interface ArcState {
  /** Y de référence (centre de la zone de cet arc) */
  refY: number
  /** Déphasage spatial unique */
  phase: number
  /** Temps macro lent (forme du rideau) */
  macroT: number
  /** Temps micro rapide (scintillement des rayons) */
  microT: number
  /** Vitesse macro individuelle */
  macroSpeed: number
  /** Vitesse micro individuelle */
  microSpeed: number
  /** Hauteur de base d'un rayon en zone plate */
  baseRayH: number
  /** Hauteur maximale d'un rayon à un pli */
  maxRayH: number
  /** Opacité de base */
  opacity: number
  /** Rôle : 'primary' | 'secondary' | 'tertiary' */
  role: 'primary' | 'secondary' | 'tertiary'
  /** Couleurs */
  colorMain: string
  colorMid: string
  colorTop: string
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min
function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function getPerf(): number {
  return window.innerWidth < 768 ||
    (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
    ? 0.4
    : 1
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  const n = parseInt(
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c,
    16
  )
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  t = clamp(t, 0, 1)
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

interface CanvasLayerProps {
  configs: (ParticleLayerConfig | StarsLayerConfig | AuroraBandsLayerConfig | RainLayerConfig)[]
  paused: boolean
}

export function CanvasLayer({ configs, paused }: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const perf = getPerf()
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []
    const stars: Star[] = []
    const drops: Drop[] = []
    const arcs: ArcState[] = []

    const pCfg = configs.find((c): c is ParticleLayerConfig => c.type === 'particles')
    const sCfg = configs.find((c): c is StarsLayerConfig => c.type === 'stars')
    const aCfg = configs.find((c): c is AuroraBandsLayerConfig => c.type === 'aurora_bands')
    const rCfg = configs.find((c): c is RainLayerConfig => c.type === 'rain')

    // ── Particules ────────────────────────────────────────────────────────
    if (pCfg) {
      const count = Math.floor(pCfg.maxParticles * perf)
      for (let i = 0; i < count; i++) {
        const color = pCfg.colors[Math.floor(Math.random() * pCfg.colors.length)]
        const v = pCfg.speedVariance ?? 0
        const sm = 1 + (Math.random() - 0.5) * 2 * v
        particles.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          radius: rand(pCfg.radiusRange[0], pCfg.radiusRange[1]),
          color,
          opacity: rand(pCfg.opacityRange[0], pCfg.opacityRange[1]),
          targetOpacity: rand(pCfg.opacityRange[0], pCfg.opacityRange[1]),
          speedY: pCfg.speedY * sm,
          phase: rand(0, Math.PI * 2),
          drift: rand(0.5, 1.5) * (Math.random() > 0.5 ? 1 : -1),
        })
      }
    }

    // ── Étoiles ───────────────────────────────────────────────────────────
    if (sCfg) {
      const count = Math.floor(sCfg.count * perf)
      for (let i = 0; i < count; i++) {
        const zone = sCfg.zone ?? 'full'
        const y =
          zone === 'top'
            ? rand(0, canvas.height * 0.5)
            : zone === 'bottom'
              ? rand(canvas.height * 0.5, canvas.height)
              : rand(0, canvas.height)
        const b = rand(0.2, 1.0)
        stars.push({
          x: rand(0, canvas.width),
          y,
          radius: rand(0.3, sCfg.maxSize),
          baseOpacity: b,
          opacity: b,
          phase: rand(0, Math.PI * 2),
          speed: rand(0.003, 0.016) * sCfg.twinkle,
        })
      }
    }

    // ── Construction des arcs ─────────────────────────────────────────────
    if (aCfg) {
      const maxH = canvas.height * aCfg.heightRatio
      const bw = aCfg.bandWidth

      // 1 arc primaire + 1 secondaire + 1 tertiaire
      // Répartis de façon à ce que le primaire soit dans le tiers inférieur
      // de la zone aurora (plus proche de l'horizon, comme dans la réalité)

      arcs.push({
        refY: maxH * 0.72, // Primaire — bas de la zone aurora
        phase: rand(0, Math.PI * 2),
        macroT: rand(0, 300),
        microT: rand(0, 100),
        macroSpeed: 1.0,
        microSpeed: 1.0,
        baseRayH: bw * 1.0,
        maxRayH: bw * 9.0,
        opacity: 0.95,
        role: 'primary',
        colorMain: '#00ff55',
        colorMid: '#00bbcc',
        colorTop: '#aa33ff',
      })

      arcs.push({
        refY: maxH * 0.4, // Secondaire — milieu
        phase: rand(0, Math.PI * 2),
        macroT: rand(0, 300),
        microT: rand(0, 100),
        macroSpeed: 0.75,
        microSpeed: 1.2,
        baseRayH: bw * 0.6,
        maxRayH: bw * 6.5,
        opacity: 0.65,
        role: 'secondary',
        colorMain: '#22ff77',
        colorMid: '#009ecc',
        colorTop: '#882edd',
      })

      arcs.push({
        refY: maxH * 0.16, // Tertiaire — haut, très discret
        phase: rand(0, Math.PI * 2),
        macroT: rand(0, 300),
        microT: rand(0, 100),
        macroSpeed: 0.5,
        microSpeed: 0.9,
        baseRayH: bw * 0.4,
        maxRayH: bw * 4.0,
        opacity: 0.35,
        role: 'tertiary',
        colorMain: '#55ffaa',
        colorMid: '#0077bb',
        colorTop: '#661bcc',
      })
    }

    // ── Pluie ─────────────────────────────────────────────────────────────
    if (rCfg) {
      const count = Math.floor(rCfg.count * perf)
      for (let i = 0; i < count; i++) {
        drops.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          length: rand(rCfg.length * 0.5, rCfg.length),
          speed: rand(rCfg.speed * 0.8, rCfg.speed * 1.3),
          opacity: rand(rCfg.opacity * 0.5, rCfg.opacity),
        })
      }
    }

    // Carte de luminance pour la transparence des étoiles
    const STAR_COLS = 64
    const auroraLumMap = new Float32Array(STAR_COLS)

    // ── RAF ───────────────────────────────────────────────────────────────
    const loop = () => {
      animRef.current = requestAnimationFrame(loop)
      if (pausedRef.current || document.hidden) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // ═══════════════════════════════════════════════════════════════════
      // AURORES BORÉALES v7 — Un rideau continu
      // ═══════════════════════════════════════════════════════════════════
      if (aCfg) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const STEP = perf < 1 ? 4 : 2
        auroraLumMap.fill(0)

        // ── Amplitudes macro selon le rôle de l'arc ──────────────────────
        // L'arc primaire serpente beaucoup plus que les secondaires
        // pour créer les grandes boucles dramatiques de la vidéo de référence.
        const roleConfig = {
          primary: { A: [3.0, 1.8, 0.8], F: [0.0013, 0.003, 0.0068] },
          secondary: { A: [2.0, 1.2, 0.5], F: [0.0016, 0.0037, 0.008] },
          tertiary: { A: [1.2, 0.7, 0.3], F: [0.002, 0.0045, 0.01] },
        }

        for (const arc of arcs) {
          // Avancer les deux horloges
          arc.macroT += aCfg.waveSpeed * arc.macroSpeed * 28
          arc.microT += aCfg.waveSpeed * arc.microSpeed * 350

          const cfg = roleConfig[arc.role]
          const [af1, af2, af3] = cfg.F
          const [aa1, aa2, aa3] = cfg.A.map((a) => a * aCfg.waveAmplitude)

          const MAX_DERIV = af1 * aa1 + af2 * aa2 + af3 * aa3

          const rgbMain = hexToRgb(arc.colorMain)
          const rgbHot: [number, number, number] = [215, 255, 165] // blanc-vert chaud
          const rgbMid = hexToRgb(arc.colorMid)
          const rgbTop = hexToRgb(arc.colorTop)

          for (let xi = 0; xi <= canvas.width; xi += STEP) {
            // ── Forme macro du rideau ─────────────────────────────────────
            const mT1 = xi * af1 + arc.macroT * 0.5 + arc.phase
            const mT2 = xi * af2 - arc.macroT * 0.85 + arc.phase * 1.41
            const mT3 = xi * af3 + arc.macroT * 1.55 + arc.phase * 0.73
            const baseY = arc.refY + Math.sin(mT1) * aa1 + Math.sin(mT2) * aa2 + Math.sin(mT3) * aa3

            // ── Pliure 3D (dérivée normalisée) ────────────────────────────
            const dy_dx =
              Math.cos(mT1) * aa1 * af1 + Math.cos(mT2) * aa2 * af2 + Math.cos(mT3) * aa3 * af3
            const normD = clamp(Math.abs(dy_dx) / MAX_DERIV, 0, 1)
            // Expo 1.0 → plus de plis d'intensité moyenne (moins brutaux, plus naturels)
            const foldIntensity = 1.0 + Math.pow(normD, 1.0) * 7.5

            // ── Scintillement micro (danse des rayons) ────────────────────
            const u1 = Math.sin(xi * 0.03 + arc.microT + arc.phase)
            const u2 = Math.sin(xi * 0.053 - arc.microT * 1.6 + arc.phase * 2.0)
            const micro = Math.pow(Math.max(0, u1 * u2), 1.4)

            // ── Pulsation de section (grandes zones qui s'embrasent) ──────
            const sectionPulse =
              0.5 + 0.5 * (0.5 + 0.5 * Math.sin(xi * 0.0007 + arc.macroT * 0.3 + arc.phase))

            // ── Lueur diffuse de fond (le rideau est toujours là) ─────────
            // Même dans les zones sombres entre les rayons, l'aurore émet un fond
            const baseGlow = arc.role === 'primary' ? 0.18 : 0.1
            const rawIntensity = (baseGlow + (1 - baseGlow) * micro) * foldIntensity * sectionPulse
            const intensity = clamp(rawIntensity, 0, 9)
            const maxAlpha = clamp(arc.opacity * aCfg.opacity * intensity * 0.5, 0, 1)

            // ── Couleur du bord bas : vire vers blanc-vert aux plis ───────
            const whiteBlend = clamp((foldIntensity - 1) / 6.5, 0, 1)
            const bottomColor = lerpColor(rgbMain, rgbHot, Math.pow(whiteBlend, 1.3))

            // ── Hauteur du rayon ──────────────────────────────────────────
            const heightFactor = clamp(intensity / 5.5, 0, 1)
            const rayH = arc.baseRayH + (arc.maxRayH - arc.baseRayH) * heightFactor
            const topY = Math.max(0, baseY - rayH)

            if (maxAlpha > 0.004 && topY < baseY) {
              // Gradient vers le haut — 6 stops pour transition douce
              const gradUp = ctx.createLinearGradient(0, baseY, 0, topY)
              gradUp.addColorStop(
                0,
                `rgba(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]},${maxAlpha})`
              )
              gradUp.addColorStop(
                0.1,
                `rgba(${rgbMain[0]},${rgbMain[1]},${rgbMain[2]},${maxAlpha * 0.88})`
              )
              gradUp.addColorStop(
                0.35,
                `rgba(${rgbMain[0]},${rgbMain[1]},${rgbMain[2]},${maxAlpha * 0.6})`
              )
              gradUp.addColorStop(
                0.6,
                `rgba(${rgbMid[0]},${rgbMid[1]},${rgbMid[2]},${maxAlpha * 0.22})`
              )
              gradUp.addColorStop(
                0.82,
                `rgba(${rgbTop[0]},${rgbTop[1]},${rgbTop[2]},${maxAlpha * 0.07})`
              )
              gradUp.addColorStop(1, `rgba(${rgbTop[0]},${rgbTop[1]},${rgbTop[2]},0)`)
              ctx.fillStyle = gradUp
              ctx.fillRect(xi, topY, STEP + 1, baseY - topY)

              // Bord inférieur ultra-net et lumineux
              const botH = 2 + 3.5 * clamp(intensity / 4.5, 0, 1)
              const gradDown = ctx.createLinearGradient(0, baseY, 0, baseY + botH)
              gradDown.addColorStop(
                0,
                `rgba(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]},${clamp(maxAlpha * 1.6, 0, 1)})`
              )
              gradDown.addColorStop(
                1,
                `rgba(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]},0)`
              )
              ctx.fillStyle = gradDown
              ctx.fillRect(xi, baseY, STEP + 1, botH)
            }

            // Mise à jour carte luminance
            const col = Math.floor((xi / canvas.width) * STAR_COLS)
            if (col >= 0 && col < STAR_COLS) {
              auroraLumMap[col] = Math.max(auroraLumMap[col], clamp(maxAlpha, 0, 1))
            }
          }
        }

        // ── Voile diffus permanent ────────────────────────────────────────
        // Une lueur verte douce remplit toute la zone aurora en arrière-plan.
        // Représente la luminescence atmosphérique générale de l'aurore.
        if (aCfg) {
          const [ar, ag, ab] = hexToRgb('#00ff55')
          const auroraH = canvas.height * aCfg.heightRatio
          const veilGrad = ctx.createLinearGradient(0, 0, 0, auroraH)
          veilGrad.addColorStop(0, `rgba(${ar},${ag},${ab},0.04)`)
          veilGrad.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.06)`)
          veilGrad.addColorStop(1, `rgba(${ar},${ag},${ab},0.01)`)
          ctx.fillStyle = veilGrad
          ctx.fillRect(0, 0, canvas.width, auroraH)
        }

        ctx.restore()
        ctx.globalCompositeOperation = 'source-over'
      }

      // ═══════════════════════════════════════════════════════════════════
      // ÉTOILES — translucides via carte de luminance
      // ═══════════════════════════════════════════════════════════════════
      if (sCfg) {
        for (const s of stars) {
          s.phase += s.speed
          s.opacity = s.baseOpacity * (0.3 + 0.7 * Math.abs(Math.sin(s.phase)))
          let op = s.opacity
          if (aCfg && s.y < canvas.height * aCfg.heightRatio * 1.15) {
            const col = Math.floor((s.x / canvas.width) * STAR_COLS)
            const lum = auroraLumMap[clamp(col, 0, STAR_COLS - 1)] ?? 0
            op *= 0.15 + 0.65 * (1 - lum)
          }
          ctx.globalAlpha = clamp(op, 0, 1)
          ctx.fillStyle = sCfg.color
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // ═══════════════════════════════════════════════════════════════════
      // PARTICULES + CONNEXIONS
      // ═══════════════════════════════════════════════════════════════════
      if (pCfg) {
        for (const p of particles) {
          p.phase += 0.014
          p.y += p.speedY
          p.x += Math.sin(p.phase) * p.drift * 0.35
          if (Math.random() < 0.007)
            p.targetOpacity = rand(pCfg.opacityRange[0], pCfg.opacityRange[1])
          p.opacity += (p.targetOpacity - p.opacity) * 0.018
          if (p.y < -10) {
            p.y = canvas.height + 10
            p.x = rand(0, canvas.width)
          }
          if (p.y > canvas.height + 10) {
            p.y = -10
            p.x = rand(0, canvas.width)
          }
          if (p.x < -20) p.x = canvas.width + 20
          if (p.x > canvas.width + 20) p.x = -20
        }

        if (pCfg.connections?.enabled) {
          const { maxDistance, color, width } = pCfg.connections
          ctx.lineWidth = width
          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x
              const dy = particles[i].y - particles[j].y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < maxDistance) {
                ctx.globalAlpha =
                  (1 - dist / maxDistance) *
                  Math.min(particles[i].opacity, particles[j].opacity) *
                  0.65
                ctx.strokeStyle = color
                ctx.beginPath()
                ctx.moveTo(particles[i].x, particles[i].y)
                ctx.lineTo(particles[j].x, particles[j].y)
                ctx.stroke()
              }
            }
          }
          ctx.globalAlpha = 1
        }

        for (const p of particles) {
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // ═══════════════════════════════════════════════════════════════════
      // PLUIE
      // ═══════════════════════════════════════════════════════════════════
      if (rCfg) {
        const angleRad = (rCfg.angle * Math.PI) / 180
        ctx.lineWidth = 1
        for (const d of drops) {
          d.y += d.speed
          d.x += Math.tan(angleRad) * d.speed
          if (d.y > canvas.height + d.length) {
            d.y = -d.length
            d.x = rand(0, canvas.width)
          }
          ctx.globalAlpha = d.opacity
          ctx.strokeStyle = rCfg.color
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - Math.tan(angleRad) * d.length, d.y - d.length)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
    }

    loop()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [configs])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  )
}
