/**
 * src/theme-engine/bricks/background/index.ts
 *
 * Groupe "Fonds" (Background) du moteur d'animation.
 * Shaders procéduraux plein écran GPU :
 * - Ciel Dégradé (gradient_sky)
 * - Nuages FBM (fbm_clouds)
 * - Nébuleuse Cosmique (nebula)
 * - Champ d'Étoiles Multi-Couches (multilayer_starfield)
 * - Aurore Boréale (aurora)
 * - Eau & Caustiques (water_caustics)
 * - Vagues & Houle (waves)
 * - Coulée de Lave (lava_flow)
 * - Dunes Désertiques (dunes)
 */

export * from './AuroraBrick'
export * from './DunesBrick'
export * from './FbmCloudsBrick'
export * from './GradientSkyBrick'
export * from './LavaFlowBrick'
export * from './MultiLayerStarfieldBrick'
export * from './NebulaBrick'
export * from './WaterCausticsBrick'
export * from './WavesBrick'
