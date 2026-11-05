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

    // 1. Halo atmosphérique chaud externe
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(254, 240, 138, 0.45)')
    halo.addColorStop(0.3, 'rgba(253, 224, 71, 0.20)')
    halo.addColorStop(0.7, 'rgba(234, 179, 8, 0.05)')
    halo.addColorStop(1, 'rgba(202, 138, 4, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    // 2. Disque lumineux intermédiaire
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.35, 'rgba(254, 240, 138, 0.95)')
    grad.addColorStop(0.72, 'rgba(250, 204, 21, 0.55)')
    grad.addColorStop(1, 'rgba(234, 179, 8, 0.0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur radiant pur et ponctuel
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.12)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.65, 'rgba(255, 255, 255, 0.92)')
    core.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.12, 0, Math.PI * 2)
    ctx.fill()

    // 4. Aigrette / éclat en croix subtil pour motes captant un rai de lumière
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx - 20, cy)
    ctx.lineTo(cx + 20, cy)
    ctx.moveTo(cx, cy - 20)
    ctx.lineTo(cx, cy + 20)
    ctx.stroke()
  })
}

/** 1b. Texture de flocon de neige cotonneux et cristallin avec halo doux (Neige) */
export function getSnowTexture(): THREE.CanvasTexture {
  return createTexture('snow_flake', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo lumineux atmosphérique externe
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.42)')
    halo.addColorStop(0.4, 'rgba(240, 248, 255, 0.22)')
    halo.addColorStop(0.75, 'rgba(220, 240, 255, 0.06)')
    halo.addColorStop(1, 'rgba(200, 230, 255, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    // 2. Disque cotonneux intermédiaire
    const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.34)
    body.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    body.addColorStop(0.5, 'rgba(255, 255, 255, 0.92)')
    body.addColorStop(0.82, 'rgba(245, 250, 255, 0.55)')
    body.addColorStop(1, 'rgba(235, 245, 255, 0.0)')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur radiant pur cristallin
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.16)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.7, 'rgba(255, 255, 255, 0.95)')
    core.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.16, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** 2. Texture de braise incandescente avec cœur chaud et halo thermique (Braises) */
export function getEmberTexture(): THREE.CanvasTexture {
  return createTexture('ember', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo thermique diffus rougeoyant
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(239, 68, 68, 0.45)')
    halo.addColorStop(0.35, 'rgba(220, 38, 38, 0.22)')
    halo.addColorStop(0.75, 'rgba(185, 28, 28, 0.06)')
    halo.addColorStop(1, 'rgba(153, 27, 27, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    // 2. Manteau incandescent orange et rouge
    const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, w * 0.34)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)') // Cœur blanc-chaud
    grad.addColorStop(0.22, 'rgba(254, 240, 138, 0.98)') // Jaune étincelant
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.92)') // Orange vif
    grad.addColorStop(0.85, 'rgba(220, 38, 38, 0.65)') // Rouge braise
    grad.addColorStop(1, 'rgba(185, 28, 28, 0.0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2)
    ctx.fill()

    // 3. Cœur incandescent ponctuel super-brillant
    const core = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, w * 0.14)
    core.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    core.addColorStop(0.7, 'rgba(255, 250, 200, 0.95)')
    core.addColorStop(1, 'rgba(254, 240, 138, 0.0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.14, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** 3. Texture de flocon de cendre asymétrique et calciné avec halo de rétro-éclairage (Cendres) */
export function getAshTexture(): THREE.CanvasTexture {
  return createTexture('ash_flake', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo doux de rétro-éclairage pour détacher les particules sombres des arrière-plans nocturnes
    const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.46)
    halo.addColorStop(0, 'rgba(235, 245, 255, 0.40)')
    halo.addColorStop(0.4, 'rgba(205, 225, 250, 0.18)')
    halo.addColorStop(0.75, 'rgba(180, 205, 235, 0.05)')
    halo.addColorStop(1, 'rgba(160, 185, 220, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.beginPath()

    // Contour asymétrique et ciselé de flocon calciné
    const points = [
      [0, -46],
      [28, -34],
      [46, -6],
      [38, 32],
      [6, 46],
      [-28, 36],
      [-46, 6],
      [-34, -30],
    ]
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.closePath()

    // 2. Remplissage interne texturé : dégradé clair avec cœur cendreux
    const grad = ctx.createRadialGradient(-6, -8, 2, 0, 0, 48)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    grad.addColorStop(0.4, 'rgba(230, 240, 250, 0.92)')
    grad.addColorStop(0.75, 'rgba(190, 205, 225, 0.85)')
    grad.addColorStop(1, 'rgba(150, 170, 190, 0.75)')
    ctx.fillStyle = grad
    ctx.fill()

    // 3. Liseré lumineux / rim light pour faire ressortir les silhouettes de suie
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.lineWidth = 2.2
    ctx.stroke()

    // 4. Micro-détails internes calcinés
    ctx.strokeStyle = 'rgba(140, 160, 180, 0.50)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-16, -10)
    ctx.lineTo(12, 14)
    ctx.moveTo(8, -20)
    ctx.lineTo(-6, 22)
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

    // 1. Corps intérieur de la bulle : translucide avec léger voile sphérique
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, r)
    bodyGrad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, 0.03)`)
    bodyGrad.addColorStop(0.65, `rgba(${rCol}, ${gCol}, ${bCol}, 0.10)`)
    bodyGrad.addColorStop(0.88, `rgba(${rCol}, ${gCol}, ${bCol}, 0.32)`)
    bodyGrad.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0.0)`)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // 2. Anneau de bordure lumineux (Fresnel rim)
    ctx.strokeStyle = 'rgba(235, 248, 255, 0.88)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(cx, cy, r - 1.2, 0, Math.PI * 2)
    ctx.stroke()

    // Deuxième contour subtil teinté intérieur
    ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, 0.65)`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, r - 2.8, 0, Math.PI * 2)
    ctx.stroke()

    // 3. Reflet spéculaire principal (arc courbe éclatant blanc pur en haut à gauche)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-Math.PI * 0.22)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 3.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.72, -Math.PI * 0.32, Math.PI * 0.05)
    ctx.stroke()

    // Point focal spéculaire plus intense au centre de l'arc
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)'
    ctx.beginPath()
    const dotX = Math.cos(-Math.PI * 0.14) * (r * 0.72)
    const dotY = Math.sin(-Math.PI * 0.14) * (r * 0.72)
    ctx.arc(dotX, dotY, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 4. Micro-reflet secondaire opposé (bas à droite)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.beginPath()
    ctx.arc(cx + r * 0.42, cy + r * 0.42, r * 0.12, 0, Math.PI * 2)
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

/** 9. Texture de pétale soyeux galbé avec échancrure sakura et liseré nacré (Sakura / Pétales) */
export function getPetalTexture(): THREE.CanvasTexture {
  return createTexture('petal', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Halo lumineux doux atmosphérique rosé
    const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.48)
    halo.addColorStop(0, 'rgba(255, 240, 248, 0.42)')
    halo.addColorStop(0.5, 'rgba(244, 114, 182, 0.16)')
    halo.addColorStop(1, 'rgba(236, 72, 153, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)

    // 2. Silhouette distinctive de pétale sakura avec échancrure / encoche en V au sommet
    ctx.beginPath()
    ctx.moveTo(0, 46) // Base / attache tige
    ctx.bezierCurveTo(-32, 28, -46, -4, -20, -46) // Flanc gauche vers lobe supérieur gauche
    ctx.quadraticCurveTo(-10, -44, 0, -32) // Encoche sakura descendant au centre
    ctx.quadraticCurveTo(10, -44, 20, -46) // Remontée vers lobe supérieur droit
    ctx.bezierCurveTo(46, -4, 32, 28, 0, 46) // Flanc droit descendant vers la base
    ctx.closePath()

    // 3. Dégradé soyeux nacré : rose vif à la base vers rose pastel et liseré clair
    const grad = ctx.createLinearGradient(0, 46, 0, -46)
    grad.addColorStop(0, 'rgba(244, 114, 182, 0.96)') // Base rose profond
    grad.addColorStop(0.35, 'rgba(251, 207, 232, 0.94)') // Corps satiné rose doux
    grad.addColorStop(0.8, 'rgba(255, 240, 248, 0.96)') // Haut du pétale clair
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.98)') // Pointe nacrée
    ctx.fillStyle = grad
    ctx.fill()

    // 4. Liseré délicat nacré sur tout le pourtour pour une excellente lisibilité
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 2.2
    ctx.stroke()

    // 5. Nervure / pliure centrale délicate pour donner du volume 3D
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(0, 44)
    ctx.quadraticCurveTo(2, 6, 0, -28)
    ctx.stroke()

    ctx.restore()
  })
}

/** 10. Texture de confetti rectangulaire festif avec halo et biseau spéculaire (Confettis) */
export function getConfettiTexture(): THREE.CanvasTexture {
  return createTexture('confetti_rect', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const rw = 46
    const rh = 78

    // 1. Halo lumineux doux diffus tout autour du confetti
    const halo = ctx.createRadialGradient(cx, cy, 14, cx, cy, w * 0.46)
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.42)')
    halo.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)')
    halo.addColorStop(0.85, 'rgba(255, 255, 255, 0.04)')
    halo.addColorStop(1, 'rgba(255, 255, 255, 0.0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)

    // 2. Corps principal du rectangle de confetti avec dégradé métallique spéculaire diagonal
    const sheen = ctx.createLinearGradient(-rw / 2, -rh / 2, rw / 2, rh / 2)
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    sheen.addColorStop(0.35, 'rgba(242, 242, 242, 0.88)')
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)') // Reflet spéculaire vif
    sheen.addColorStop(0.65, 'rgba(238, 238, 238, 0.88)')
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.96)')

    ctx.fillStyle = sheen
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh)

    // 3. Biseau métallique lumineux sur les arêtes pour préserver la lisibilité lors du spin
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.lineWidth = 2.4
    ctx.strokeRect(-rw / 2 + 1, -rh / 2 + 1, rw - 2, rh - 2)

    // 4. Ligne d'éclat spéculaire traversante
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-rw / 2 + 5, rh / 2 - 10)
    ctx.lineTo(rw / 2 - 5, -rh / 2 + 10)
    ctx.stroke()

    ctx.restore()
  })
}

/** 11. Texture de volute de fumée vaporeuse multi-lobes avec volutes et filaments (Fumée) */
export function getSmokeTexture(): THREE.CanvasTexture {
  return createTexture('smoke_puff', 128, 128, (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2

    // 1. Lobes asymétriques superposés pour créer un panache vaporeux organique
    const lobes = [
      { x: cx, y: cy, r: 52, a: 0.62 },
      { x: cx - 18, y: cy + 12, r: 44, a: 0.45 },
      { x: cx + 20, y: cy - 10, r: 42, a: 0.45 },
      { x: cx - 14, y: cy - 20, r: 38, a: 0.38 },
      { x: cx + 18, y: cy + 18, r: 36, a: 0.38 },
      { x: cx, y: cy - 14, r: 46, a: 0.5 },
    ]

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r)
      grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`)
      grad.addColorStop(0.35, `rgba(245, 248, 255, ${lobe.a * 0.75})`)
      grad.addColorStop(0.7, `rgba(225, 235, 250, ${lobe.a * 0.28})`)
      grad.addColorStop(1, 'rgba(210, 225, 245, 0.0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Micro-tourbillons / filaments vaporeux internes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
    ctx.lineWidth = 3.0
    ctx.beginPath()
    ctx.arc(cx - 6, cy + 4, 22, 0.2, Math.PI * 1.3)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(cx + 8, cy - 6, 18, Math.PI * 0.6, Math.PI * 1.8)
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
