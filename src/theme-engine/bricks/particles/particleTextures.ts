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

/** 1. Texture de disque doux avec atténuation gaussienne et halo doré (Poussière) */
export function getSoftCircleTexture(): THREE.CanvasTexture {
  return createTexture('soft_circle', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo atmosphérique chaud externe étendu et bien lumineux
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(255, 250, 210, 0.90)')
    halo.addColorStop(0.25, 'rgba(254, 240, 138, 0.65)')
    halo.addColorStop(0.55, 'rgba(250, 204, 21, 0.28)')
    halo.addColorStop(0.85, 'rgba(234, 179, 8, 0.08)')
    halo.addColorStop(1, 'rgba(202, 138, 4, 0.0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2)
    ctx.fill()

    // 2. Disque lumineux intermédiaire doré
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.28)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.35, 'rgba(254, 240, 138, 0.95)')
    grad.addColorStop(0.72, 'rgba(250, 204, 21, 0.75)')
    grad.addColorStop(1, 'rgba(234, 179, 8, 0.0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur radiant pur étincelant (mote captant un rayon de lumière)
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.14)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.65, 'rgba(255, 255, 255, 0.95)')
    core.addColorStop(1, 'rgba(254, 240, 138, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.14, 0, Math.PI * 2)
    ctx.fill()

    // 4. Aigrette / éclat lumineux en croix pour accrocher la lumière
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx - 24, cy)
    ctx.lineTo(cx + 24, cy)
    ctx.moveTo(cx, cy - 24)
    ctx.lineTo(cx + 24, cy)
    ctx.stroke()
  })
}

/** 1b. Texture de flocon de neige cotonneux et cristallin avec halo doux (Neige) */
export function getSnowTexture(): THREE.CanvasTexture {
  return createTexture('snow_flake', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo lumineux atmosphérique externe étendu et bien contrasté
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.49)
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
    halo.addColorStop(0.35, 'rgba(240, 248, 255, 0.42)')
    halo.addColorStop(0.7, 'rgba(215, 235, 255, 0.16)')
    halo.addColorStop(1, 'rgba(200, 230, 255, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    // 2. Disque cotonneux intermédiaire large et doux
    const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.38)
    body.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    body.addColorStop(0.55, 'rgba(255, 255, 255, 0.94)')
    body.addColorStop(0.85, 'rgba(245, 250, 255, 0.65)')
    body.addColorStop(1, 'rgba(235, 245, 255, 0.0)')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.38, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur radiant pur cristallin
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.2)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.75, 'rgba(255, 255, 255, 0.98)')
    core.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2)
    ctx.fill()

    // 4. Cristaux dendrites fins (6 branches hexagonales avec aiguillons)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const x1 = cx + cosA * (w * 0.35)
      const y1 = cy + sinA * (w * 0.35)
      ctx.moveTo(cx, cy)
      ctx.lineTo(x1, y1)

      // Micro-ramifications
      const midX = cx + cosA * (w * 0.22)
      const midY = cy + sinA * (w * 0.22)
      const barbAngle1 = angle + Math.PI / 4
      const barbAngle2 = angle - Math.PI / 4
      ctx.moveTo(midX, midY)
      ctx.lineTo(midX + Math.cos(barbAngle1) * 7, midY + Math.sin(barbAngle1) * 7)
      ctx.moveTo(midX, midY)
      ctx.lineTo(midX + Math.cos(barbAngle2) * 7, midY + Math.sin(barbAngle2) * 7)
    }
    ctx.stroke()
  })
}

/** 2. Texture de braise incandescente avec cœur chaud et halo thermique (Braises) */
export function getEmberTexture(): THREE.CanvasTexture {
  return createTexture('ember', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo thermique diffus ardent orange-rouge
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(249, 115, 22, 0.80)')
    halo.addColorStop(0.3, 'rgba(239, 68, 68, 0.50)')
    halo.addColorStop(0.7, 'rgba(220, 38, 38, 0.18)')
    halo.addColorStop(1, 'rgba(185, 28, 28, 0.0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2)
    ctx.fill()

    // 2. Manteau incandescent jaune d'or, orange vif et rouge braise
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.32)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.2, 'rgba(254, 240, 138, 1.0)')
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.95)')
    grad.addColorStop(0.85, 'rgba(220, 38, 38, 0.75)')
    grad.addColorStop(1, 'rgba(185, 28, 28, 0.0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur incandescent ponctuel super-brillant
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.15)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.7, 'rgba(255, 250, 210, 0.98)')
    core.addColorStop(1, 'rgba(254, 240, 138, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.15, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** 3. Texture de flocon de cendre asymétrique et calciné avec halo de rétro-éclairage (Cendres) */
export function getAshTexture(): THREE.CanvasTexture {
  return createTexture('ash_flake', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo lumineux de rétro-éclairage étendu pour détacher la cendre des fonds sombres
    const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, w * 0.49)
    halo.addColorStop(0, 'rgba(241, 245, 249, 0.68)')
    halo.addColorStop(0.35, 'rgba(226, 232, 240, 0.38)')
    halo.addColorStop(0.7, 'rgba(203, 213, 225, 0.14)')
    halo.addColorStop(1, 'rgba(148, 163, 184, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.beginPath()

    // Contour asymétrique et ciselé de flocon calciné agrandi (remplit bien le quad)
    const points = [
      [0, -54],
      [34, -40],
      [54, -8],
      [44, 38],
      [8, 54],
      [-34, 42],
      [-54, 8],
      [-40, -36],
    ]
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.closePath()

    // 2. Remplissage interne texturé : dégradé gris cendre clair avec cœur lumineux
    const grad = ctx.createRadialGradient(-8, -10, 4, 0, 0, 56)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.4, 'rgba(241, 245, 249, 0.95)')
    grad.addColorStop(0.75, 'rgba(226, 232, 240, 0.90)')
    grad.addColorStop(1, 'rgba(203, 213, 225, 0.82)')
    ctx.fillStyle = grad
    ctx.fill()

    // 3. Liseré lumineux / rim light franc pour garantir un contraste net
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)'
    ctx.lineWidth = 3.2
    ctx.stroke()

    // 4. Micro-détails internes calcinés et arêtes de rupture
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.70)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(-20, -14)
    ctx.lineTo(16, 18)
    ctx.moveTo(12, -26)
    ctx.lineTo(-10, 28)
    ctx.moveTo(-28, 4)
    ctx.lineTo(6, -8)
    ctx.stroke()

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
export function getBubbleTexture(bubbleColorHex: string = '#38bdf8'): THREE.CanvasTexture {
  const key = `bubble_${bubbleColorHex}`
  return createTexture(key, 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const r = w * 0.44

    // Parsing couleur du corps de la bulle
    const color = new THREE.Color(bubbleColorHex)
    const rCol = Math.round(color.r * 255)
    const gCol = Math.round(color.g * 255)
    const bCol = Math.round(color.b * 255)

    // 1. Léger halo externe diffus pour détacher la bulle
    const halo = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.06)
    halo.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, 0.0)`)
    halo.addColorStop(0.7, `rgba(${rCol}, ${gCol}, ${bCol}, 0.14)`)
    halo.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0.0)`)
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    // 2. Corps intérieur de la bulle : sphère translucide avec gradient volumétrique
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r)
    bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)')
    bodyGrad.addColorStop(0.55, `rgba(${rCol}, ${gCol}, ${bCol}, 0.12)`)
    bodyGrad.addColorStop(0.85, `rgba(${rCol}, ${gCol}, ${bCol}, 0.38)`)
    bodyGrad.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0.06)`)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // 3. Anneau de bordure lumineux (Fresnel rim) bien net et lisible
    ctx.strokeStyle = 'rgba(240, 250, 255, 0.95)'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(cx, cy, r - 1.8, 0, Math.PI * 2)
    ctx.stroke()

    // Deuxième contour teinté intérieur (liseré cyan irisé)
    ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, 0.75)`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(cx, cy, r - 3.8, 0, Math.PI * 2)
    ctx.stroke()

    // 4. Reflet spéculaire principal (arc lumineux blanc éclatant en haut à gauche)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-Math.PI * 0.25)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 4.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.7, -Math.PI * 0.35, Math.PI * 0.05)
    ctx.stroke()

    // Point focal spéculaire net (glint) sur le reflet
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    const dotX = Math.cos(-Math.PI * 0.15) * (r * 0.7)
    const dotY = Math.sin(-Math.PI * 0.15) * (r * 0.7)
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 5. Petit reflet secondaire spéculaire en bas à droite (lumière réfléchie)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(Math.PI * 0.75)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.72, -Math.PI * 0.15, Math.PI * 0.12)
    ctx.stroke()
    ctx.restore()
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

/** 9. Texture de pétale soyeux galbé avec échancrure sakura et liseré nacré (Sakura / Pétales) */
export function getPetalTexture(): THREE.CanvasTexture {
  return createTexture('petal', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    ctx.save()
    ctx.translate(cx, cy)

    // 1. Silhouette distinctive et généreuse de pétale sakura avec encoche en V au sommet
    ctx.beginPath()
    ctx.moveTo(0, 50)
    ctx.bezierCurveTo(-36, 32, -50, -4, -22, -50)
    ctx.quadraticCurveTo(-10, -46, 0, -34)
    ctx.quadraticCurveTo(10, -46, 22, -50)
    ctx.bezierCurveTo(50, -4, 36, 32, 0, 50)
    ctx.closePath()

    // 2. Dégradé soyeux nacré aux vraies teintes rosées (sakura authentique, jamais blanc délavé)
    const grad = ctx.createLinearGradient(0, 50, 0, -50)
    grad.addColorStop(0, 'rgba(225, 29, 72, 0.98)')
    grad.addColorStop(0.35, 'rgba(244, 63, 94, 0.96)')
    grad.addColorStop(0.7, 'rgba(244, 114, 182, 0.95)')
    grad.addColorStop(1, 'rgba(251, 207, 232, 0.92)')
    ctx.fillStyle = grad
    ctx.fill()

    // 3. Liseré soyeux nacré bien défini sur tout le contour pour détacher le pétale
    ctx.strokeStyle = 'rgba(255, 230, 242, 0.90)'
    ctx.lineWidth = 2.4
    ctx.stroke()

    // 4. Nervure et pliure axiale galbée pour le relief 3D
    ctx.strokeStyle = 'rgba(255, 240, 248, 0.65)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(0, 48)
    ctx.quadraticCurveTo(3, 4, 0, -30)
    ctx.stroke()

    ctx.restore()
  })
}

/** 10. Texture de confetti rectangulaire festif avec halo et biseau spéculaire (Confettis) */
export function getConfettiTexture(): THREE.CanvasTexture {
  return createTexture('confetti_rect', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const rw = 66
    const rh = 98

    // 1. Halo lumineux doux diffus tout autour du confetti
    const halo = ctx.createRadialGradient(cx, cy, 16, cx, cy, w * 0.49)
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.68)')
    halo.addColorStop(0.4, 'rgba(255, 255, 255, 0.32)')
    halo.addColorStop(0.8, 'rgba(255, 255, 255, 0.10)')
    halo.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)

    // 2. Corps principal du rectangle avec dégradé métallique spéculaire diagonal éclatant
    const sheen = ctx.createLinearGradient(-rw / 2, -rh / 2, rw / 2, rh / 2)
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    sheen.addColorStop(0.3, 'rgba(240, 240, 240, 0.90)')
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)') // Éclat spéculaire vif
    sheen.addColorStop(0.7, 'rgba(235, 235, 235, 0.90)')
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.98)')

    ctx.fillStyle = sheen
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh)

    // 3. Biseau métallique lumineux sur les arêtes pour préserver la netteté lors du spin
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 3.6
    ctx.strokeRect(-rw / 2 + 1.5, -rh / 2 + 1.5, rw - 3, rh - 3)

    // 4. Ligne d'éclat spéculaire traversante franche
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(-rw / 2 + 8, rh / 2 - 14)
    ctx.lineTo(rw / 2 - 8, -rh / 2 + 14)
    ctx.stroke()

    ctx.restore()
  })
}

/** 11. Texture de volute de fumée vaporeuse multi-lobes avec volutes et filaments (Fumée) */
export function getSmokeTexture(): THREE.CanvasTexture {
  return createTexture('smoke_puff', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // Lobes asymétriques superposés avec dégradés ultra-doux simulant un bouillon de fumée
    const lobes = [
      { x: cx, y: cy, r: 56, a: 0.75 },
      { x: cx - 18, y: cy + 10, r: 46, a: 0.62 },
      { x: cx + 22, y: cy - 12, r: 44, a: 0.58 },
      { x: cx - 14, y: cy - 22, r: 40, a: 0.52 },
      { x: cx + 18, y: cy + 18, r: 38, a: 0.52 },
      { x: cx - 2, y: cy - 16, r: 48, a: 0.65 },
    ]

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r)
      grad.addColorStop(0, 'rgba(255, 255, 255, ' + lobe.a + ')')
      grad.addColorStop(0.35, 'rgba(240, 245, 255, ' + lobe.a * 0.72 + ')')
      grad.addColorStop(0.65, 'rgba(220, 230, 245, ' + lobe.a * 0.3 + ')')
      grad.addColorStop(0.9, 'rgba(200, 215, 235, ' + lobe.a * 0.08 + ')')
      grad.addColorStop(1, 'rgba(190, 210, 230, 0.0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Filaments / volutes vaporeuses internes ondulantes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(cx - 8, cy + 6, 26, 0.2, Math.PI * 1.3)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.arc(cx + 10, cy - 8, 22, Math.PI * 0.6, Math.PI * 1.8)
    ctx.stroke()
  })
}

/**
 * Libère toutes les CanvasTexture mises en cache et vide la table.
 * À appeler lors de la libération du moteur (ThemeEngine.dispose).
 */
export function clearParticleTexturesCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose()
  }
  textureCache.clear()
}
