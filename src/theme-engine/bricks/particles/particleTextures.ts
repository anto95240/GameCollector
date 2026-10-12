/**
 * src/theme-engine/bricks/particles/particleTextures.ts
 *
 * Générateur et cache de textures procédurales haute fidélité pour les particules.
 * Génère des textures optimisées en mémoire via Canvas 2D (64x64 ou 128x128).
 * Zéro asset image externe, rendu anti-aliasé, zéro banding.
 */

import * as THREE from 'three'

const textureCache = new Map<string, THREE.CanvasTexture>()

function createTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    draw(ctx, width, height)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  textureCache.set(key, texture)
  return texture
}

/** 1. Texture de disque doux avec atténuation gaussienne (Neige, Poussière) */
export function getSoftCircleTexture(): THREE.CanvasTexture {
  return createTexture('soft_circle', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)')
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  })
}

/** 2. Texture de braise incandescente avec cœur chaud et halo thermique (Braises) */
export function getEmberTexture(): THREE.CanvasTexture {
  return createTexture('ember', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.2, 'rgba(255, 235, 160, 0.95)')
    grad.addColorStop(0.5, 'rgba(255, 140, 40, 0.65)')
    grad.addColorStop(0.8, 'rgba(230, 50, 10, 0.25)')
    grad.addColorStop(1, 'rgba(180, 20, 0, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  })
}

/** 3. Texture de flocon de cendre asymétrique et calciné (Cendres) */
export function getAshTexture(): THREE.CanvasTexture {
  return createTexture('ash_flake', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.beginPath()
    // Contour asymétrique de fragment de cendre
    const points = [
      [0, -22],
      [14, -16],
      [22, -2],
      [18, 16],
      [2, 22],
      [-14, 18],
      [-22, 2],
      [-16, -14],
    ]
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.closePath()

    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    grad.addColorStop(0.6, 'rgba(200, 210, 225, 0.75)')
    grad.addColorStop(1, 'rgba(140, 150, 170, 0.0)')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  })
}

/** 4. Texture de trait de pluie fuselé (Pluie) */
export function getRainStreakTexture(): THREE.CanvasTexture {
  return createTexture('rain_streak', 32, 128, (ctx, w, h) => {
    const cx = w / 2
    const grad = ctx.createLinearGradient(cx, 0, cx, h)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)')
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.35)')
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.95)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)')

    ctx.fillStyle = grad
    ctx.beginPath()
    // Trait fuselé : très fin au sommet, légèrement évasé en bas
    ctx.moveTo(cx - 1.5, 0)
    ctx.lineTo(cx + 1.5, 0)
    ctx.lineTo(cx + 3.0, h * 0.9)
    ctx.arc(cx, h * 0.9, 3.0, 0, Math.PI)
    ctx.lineTo(cx - 1.5, 0)
    ctx.closePath()
    ctx.fill()
  })
}

/** 5. Texture de luciole avec bioluminescence et halo doux (Lucioles) */
export function getFireflyTexture(): THREE.CanvasTexture {
  return createTexture('firefly', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // Couronne diffuse externe
    const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    outerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    outerGrad.addColorStop(0.2, 'rgba(230, 255, 120, 0.75)')
    outerGrad.addColorStop(0.55, 'rgba(160, 240, 50, 0.25)')
    outerGrad.addColorStop(1, 'rgba(100, 200, 30, 0.0)')
    ctx.fillStyle = outerGrad
    ctx.fillRect(0, 0, w, h)

    // Cœur ultra-lumineux
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6)
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    coreGrad.addColorStop(0.6, 'rgba(255, 255, 200, 0.9)')
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = coreGrad
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** 6. Texture de bulle irisée avec reflet spéculaire (Bulles) */
export function getBubbleTexture(): THREE.CanvasTexture {
  return createTexture('bubble', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const r = w * 0.42

    // Fond interne légèrement vaporeux
    const bodyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)')
    bodyGrad.addColorStop(0.7, 'rgba(200, 240, 255, 0.08)')
    bodyGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.65)')
    bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // Bordure fine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(cx, cy, r - 1.0, 0, Math.PI * 2)
    ctx.stroke()

    // Reflet spéculaire principal (arc supérieur gauche)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.22, 0, Math.PI * 2)
    ctx.fill()

    // Micro-reflet secondaire opposé
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.arc(cx + r * 0.35, cy + r * 0.35, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** 7. Texture de feuille d'arbre automnale stylisée (Feuilles) */
export function getLeafTexture(): THREE.CanvasTexture {
  return createTexture('leaf', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    ctx.save()
    ctx.translate(cx, cy)

    // Forme de feuille galbée
    ctx.beginPath()
    ctx.moveTo(0, 24) // Base tige
    ctx.bezierCurveTo(18, 12, 22, -10, 0, -25) // Bord droit vers pointe
    ctx.bezierCurveTo(-22, -10, -18, 12, 0, 24) // Bord gauche vers base
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, 24, 0, -25)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.95)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.75)')
    ctx.fillStyle = grad
    ctx.fill()

    // Nervure centrale
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, 24)
    ctx.lineTo(0, -20)
    ctx.stroke()
    ctx.restore()
  })
}

/** 8. Texture d'étincelle en étoile vive à 4 branches (Étincelles) */
export function getSparkTexture(): THREE.CanvasTexture {
  return createTexture('spark', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // Halo central
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.3, 'rgba(255, 245, 180, 0.8)')
    grad.addColorStop(1, 'rgba(255, 200, 50, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Rayons en croix acérée
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    // Rayon horizontal
    ctx.beginPath()
    ctx.moveTo(cx - 28, cy)
    ctx.quadraticCurveTo(cx, cy - 2, cx, cy)
    ctx.quadraticCurveTo(cx, cy + 2, cx - 28, cy)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + 28, cy)
    ctx.quadraticCurveTo(cx, cy - 2, cx, cy)
    ctx.quadraticCurveTo(cx, cy + 2, cx + 28, cy)
    ctx.fill()

    // Rayon vertical
    ctx.beginPath()
    ctx.moveTo(cx, cy - 28)
    ctx.quadraticCurveTo(cx - 2, cy, cx, cy)
    ctx.quadraticCurveTo(cx + 2, cy, cx, cy - 28)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx, cy + 28)
    ctx.quadraticCurveTo(cx - 2, cy, cx, cy)
    ctx.quadraticCurveTo(cx + 2, cy, cx, cy + 28)
    ctx.fill()
  })
}

/** 9. Texture de pétale soyeux (Sakura / Pétales) */
export function getPetalTexture(): THREE.CanvasTexture {
  return createTexture('petal', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    ctx.save()
    ctx.translate(cx, cy)

    // Forme de pétale ovale galbé avec petite encoche douce au sommet
    ctx.beginPath()
    ctx.moveTo(0, 22)
    ctx.bezierCurveTo(16, 15, 20, -8, 8, -22)
    ctx.quadraticCurveTo(0, -18, -8, -22)
    ctx.bezierCurveTo(-20, -8, -16, 15, 0, 22)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, 22, 0, -22)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    grad.addColorStop(0.5, 'rgba(255, 240, 245, 0.9)')
    grad.addColorStop(1, 'rgba(255, 215, 230, 0.75)')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  })
}

/** 10. Texture de confetti rectangulaire avec biseau net (Confettis) */
export function getConfettiTexture(): THREE.CanvasTexture {
  return createTexture('confetti_rect', 64, 64, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const rw = 22
    const rh = 40

    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh)

    // Bordure subtile de réflexion
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh)
    ctx.restore()
  })
}

/** 11. Texture de volute de fumée vaporeuse multi-lobes (Fumée) */
export function getSmokeTexture(): THREE.CanvasTexture {
  return createTexture('smoke_puff', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 3 lobes de bruit vaporeux superposés pour casser la symétrie circulaire
    const lobes = [
      { x: cx, y: cy, r: 48, a: 0.5 },
      { x: cx - 12, y: cy + 10, r: 40, a: 0.35 },
      { x: cx + 14, y: cy - 10, r: 36, a: 0.35 },
    ]

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r)
      grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`)
      grad.addColorStop(0.4, `rgba(255, 255, 255, ${lobe.a * 0.7})`)
      grad.addColorStop(0.75, `rgba(255, 255, 255, ${lobe.a * 0.25})`)
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}
