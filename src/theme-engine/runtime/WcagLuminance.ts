/**
 * src/theme-engine/runtime/WcagLuminance.ts
 *
 * Algorithmes mathématiques de luminance relative normalisés WCAG 2.1
 * et régulateur automatique d'opacité pour le composant ContentShield.
 */

export interface RGB {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

/**
 * Convertit un code HEX (#fff, #ffffff, #00ffcc88) en composantes RGB.
 */
export function hexToRgb(hex: string): RGB {
  if (!hex || hex === 'transparent') {
    return { r: 15, g: 23, b: 42 } // Valeur par défaut slate-900
  }
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  const num = parseInt(clean.slice(0, 6), 16)
  if (isNaN(num)) {
    return { r: 15, g: 23, b: 42 }
  }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  }
}

/**
 * Calcule la luminance relative normalisée WCAG 2.1 (0.0 = noir, 1.0 = blanc pur).
 * Formule : L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */
export function getRelativeLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255
  const gsRGB = rgb.g / 255
  const bsRGB = rgb.b / 255

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calcule le ratio de contraste WCAG entre deux luminances relatives.
 * Formule : (L1 + 0.05) / (L2 + 0.05) avec L1 >= L2
 * Retourne une valeur entre 1.0 et 21.0.
 */
export function getContrastRatio(lumA: number, lumB: number): number {
  const l1 = Math.max(lumA, lumB)
  const l2 = Math.min(lumA, lumB)
  return (l1 + 0.05) / (l2 + 0.05)
}

/**
 * Mélange deux couleurs RGB selon une opacité alpha (0 = fond pur, 1 = voile pur).
 */
export function blendRgb(base: RGB, overlay: RGB, alpha: number): RGB {
  const a = Math.min(Math.max(alpha, 0), 1)
  return {
    r: Math.round(base.r * (1 - a) + overlay.r * a),
    g: Math.round(base.g * (1 - a) + overlay.g * a),
    b: Math.round(base.b * (1 - a) + overlay.b * a),
  }
}

/**
 * Calcule automatiquement l'opacité minimale que le ContentShield doit appliquer
 * pour garantir un contraste cible (par défaut 4.5:1 pour WCAG AA).
 *
 * @param themeBgHex Couleur de fond du thème (ou lumière de l'animation)
 * @param textHex Couleur principale du texte
 * @param shieldTintHex Couleur du voile protecteur (défaut #020617 sombre)
 * @param targetRatio Contraste cible (4.5 pour AA)
 */
export function calculateShieldOpacity(
  themeBgHex: string,
  textHex: string = '#f8fafc',
  shieldTintHex: string = '#020617',
  targetRatio: number = 4.5
): number {
  const bg = hexToRgb(themeBgHex)
  const text = hexToRgb(textHex)
  const shield = hexToRgb(shieldTintHex)

  const textLum = getRelativeLuminance(text)
  const bgLum = getRelativeLuminance(bg)
  const currentRatio = getContrastRatio(textLum, bgLum)

  // Si le contraste naturel est déjà excellent (>= 6:1), un léger voile d'ambiance suffit (15%)
  if (currentRatio >= 6.0) {
    return 0.15
  }

  // Recherche par dichotomie de l'opacité minimale (entre 0.15 et 0.65)
  let minAlpha = 0.15
  let maxAlpha = 0.75
  let bestAlpha = maxAlpha

  for (let step = 0; step < 8; step++) {
    const mid = (minAlpha + maxAlpha) / 2
    const blended = blendRgb(bg, shield, mid)
    const blendedLum = getRelativeLuminance(blended)
    const ratio = getContrastRatio(textLum, blendedLum)

    if (ratio >= targetRatio) {
      bestAlpha = mid
      maxAlpha = mid // Essayer de trouver une opacité plus faible pour laisser respirer l'animation
    } else {
      minAlpha = mid
    }
  }

  return Math.round(bestAlpha * 100) / 100
}
