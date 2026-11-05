/**
 * src/theme-engine/bricks/overlay/index.ts
 *
 * Groupe "Overlay" du moteur d'animation.
 * Effets de post-traitement et de style optique plein écran :
 * - Overlay complet post-processing (post_processing_overlay)
 * - Grain argentique (film_grain / grain)
 * - Vignettage optique (vignette / vignettage)
 * - Scanlines CRT & rétro (crt_scanlines / scanlines)
 * - Trame Comics Halftone (halftone / comic_halftone)
 * - Pixellisation rétro (pixelation / pixelisation)
 * - Aberration chromatique (chromatic_aberration / aberration_chromatique)
 */

export * from './ChromaticAberrationBrick'
export * from './CrtScanlinesBrick'
export * from './FilmGrainBrick'
export * from './HalftoneBrick'
export * from './PixelationBrick'
export * from './PostProcessingOverlayBrick'
export * from './VignetteBrick'
