/**
 * src/theme-engine/bricks/index.ts
 *
 * Enregistrement central de toutes les briques disponibles dans le moteur.
 */

// Groupe "Fonds" (Background)
import './background/GradientSkyBrick'
import './background/FbmCloudsBrick'
import './background/NebulaBrick'
import './background/MultiLayerStarfieldBrick'
import './background/AuroraBrick'
import './background/WaterCausticsBrick'
import './background/WavesBrick'
import './background/LavaFlowBrick'
import './background/DunesBrick'

// Groupe "Intermédiaires & Parallaxe"
import './parallax/ParallaxPlaneBrick'
import './parallax/ParallaxForestBrick'
import './parallax/ParallaxMountainsBrick'
import './parallax/ParallaxCityBrick'
import './parallax/ParallaxCastleBrick'
import './parallax/ParallaxFleetBrick'
import './parallax/ParallaxPixelTilesBrick'

// Groupe "Particules"
import './particles/InstancedParticlesBrick'

// Groupe "Overlay"
import './overlay/PostProcessingOverlayBrick'

export * from './background/GradientSkyBrick'
export * from './background/FbmCloudsBrick'
export * from './background/NebulaBrick'
export * from './background/MultiLayerStarfieldBrick'
export * from './background/AuroraBrick'
export * from './background/WaterCausticsBrick'
export * from './background/WavesBrick'
export * from './background/LavaFlowBrick'
export * from './background/DunesBrick'

export * from './parallax/ParallaxPlaneBrick'
export * from './parallax/ParallaxForestBrick'
export * from './parallax/ParallaxMountainsBrick'
export * from './parallax/ParallaxCityBrick'
export * from './parallax/ParallaxCastleBrick'
export * from './parallax/ParallaxFleetBrick'
export * from './parallax/ParallaxPixelTilesBrick'

export * from './registry'

