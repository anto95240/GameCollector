/**
 * src/theme-engine/runtime/ThemeEngine.ts
 *
 * Moteur central d'animation Three.js Vanilla.
 * Gère le canvas unique, le WebGLRenderer persistant, la caméra, la scène,
 * la boucle d'animation avec coupure stricte en arrière-plan, les uniformes partagés,
 * le cycle de vie (perte de contexte, reduced motion, cleanup) et la permutation des thèmes.
 */

import * as THREE from 'three'

import { BrickRegistry } from '../bricks'
import { InteractionManager } from '../core/InteractionManager'
import { QualityController } from '../core/QualityController'
import { RareEventManager } from '../rare-events/RareEventManager'
import type {
  BrickContext,
  IBrickInstance,
  QualityTier,
  SharedUniforms,
  ThemeEngineConfig,
} from '../types'
import { ResourcePool } from './ResourcePool'

export interface ThemeEngineOptions {
  canvas: HTMLCanvasElement
  onContextLost?: () => void
  onContextRestored?: () => void
  onQualityChange?: (tier: QualityTier) => void
}

export class ThemeEngine {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera

  // Contrôleurs
  public readonly quality: QualityController
  public readonly interaction: InteractionManager
  public readonly rareEvents: RareEventManager

  // État de l'animation
  private animFrameId: number | null = null
  private isRunning = false
  private isPaused = false
  private prefersReducedMotion = false
  private timeScale = 1.0 // Contrôle temporel (curseur de temps)
  private clock = new THREE.Clock(false)
  private totalAccumulatedTime = 0

  // Briques actives
  private activeBricks: IBrickInstance[] = []
  private currentConfig: ThemeEngineConfig | null = null

  // Uniformes partagés centralisés
  public readonly sharedUniforms: SharedUniforms

  // Callbacks
  private onContextLostCb?: () => void
  private onContextRestoredCb?: () => void

  // Écouteurs d'événements
  private boundVisibilityHandler = this.onVisibilityChange.bind(this)
  private boundResizeHandler = this.onWindowResize.bind(this)
  private boundContextLostHandler = this.onContextLost.bind(this)
  private boundContextRestoredHandler = this.onContextRestored.bind(this)

  constructor(options: ThemeEngineOptions) {
    this.canvas = options.canvas
    this.onContextLostCb = options.onContextLost
    this.onContextRestoredCb = options.onContextRestored

    this.quality = new QualityController()
    this.interaction = new InteractionManager()
    this.rareEvents = new RareEventManager()

    // 1. Initialisation du WebGLRenderer avec alpha pour transparence si nécessaire
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Pas d'antialiasing lourd sur plein écran
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true, // Requis pour captureFrame()
    })

    // 2. Scène et Caméra perspective
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    this.camera.position.set(0, 0, 5)

    // 3. Initialisation des uniformes partagés
    this.sharedUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uPalettePrimary: { value: new THREE.Color('#00f0ff') },
      uPaletteSecondary: { value: new THREE.Color('#0f172a') },
      uPaletteAccent: { value: new THREE.Color('#ec4899') },
      uQualityTier: { value: 2 },
      uTimeScale: { value: 1.0 },
      uTransitionProgress: { value: 1.0 },
    }

    // 4. Détection prefers-reduced-motion
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    // 5. Configurer la taille et le DPR
    this.updateDimensions()

    // 6. Enregistrement des écouteurs globaux
    this.setupListeners()

    // 7. Brancher l'asservissement qualité
    this.quality.subscribe((tier) => {
      this.sharedUniforms.uQualityTier.value = tier === 'HIGH' ? 2 : tier === 'MEDIUM' ? 1 : 0
      this.renderer.setPixelRatio(this.quality.getEffectiveDpr())
      for (const brick of this.activeBricks) {
        if (brick.onQualityChange) {
          brick.onQualityChange(tier)
        }
      }
      if (options.onQualityChange) {
        options.onQualityChange(tier)
      }
    })
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', this.boundResizeHandler, { passive: true })
    document.addEventListener('visibilitychange', this.boundVisibilityHandler)
    this.canvas.addEventListener('webglcontextlost', this.boundContextLostHandler)
    this.canvas.addEventListener('webglcontextrestored', this.boundContextRestoredHandler)
  }

  private teardownListeners(): void {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', this.boundResizeHandler)
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler)
    this.canvas.removeEventListener('webglcontextlost', this.boundContextLostHandler)
    this.canvas.removeEventListener('webglcontextrestored', this.boundContextRestoredHandler)
  }

  private onWindowResize(): void {
    this.updateDimensions()
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = this.quality.getEffectiveDpr()
    for (const brick of this.activeBricks) {
      if (brick.onResize) {
        brick.onResize(w, h, dpr)
      }
    }
  }

  private updateDimensions(): void {
    if (typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.renderer.setPixelRatio(this.quality.getEffectiveDpr())
    this.sharedUniforms.uResolution.value.set(w, h)
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.stopLoop()
    } else if (!this.isPaused) {
      this.startLoop()
    }
  }

  private onContextLost(e: Event): void {
    e.preventDefault()
    console.warn('[ThemeEngine] Contexte WebGL perdu (webglcontextlost).')
    this.stopLoop()
    if (this.onContextLostCb) this.onContextLostCb()
  }

  private onContextRestored(): void {
    console.debug('[ThemeEngine] Contexte WebGL restauré (webglcontextrestored). Réinitialisation.')
    this.updateDimensions()
    if (this.currentConfig) {
      this.loadTheme(this.currentConfig)
    }
    if (this.onContextRestoredCb) this.onContextRestoredCb()
    this.startLoop()
  }

  /**
   * Charge une nouvelle configuration de thème.
   * Nettoie les ressources précédentes sans détruire le contexte WebGL.
   */
  public async loadTheme(config: ThemeEngineConfig): Promise<void> {
    this.currentConfig = config

    // 1. Démonter et libérer les briques actuelles
    for (const brick of this.activeBricks) {
      brick.dispose()
    }
    this.activeBricks = []

    // 2. Nettoyer la scène Three.js
    ResourcePool.clearScene(this.scene)

    // 3. Mettre à jour les palettes d'uniformes
    this.sharedUniforms.uPalettePrimary.value.set(config.palette.primary)
    this.sharedUniforms.uPaletteSecondary.value.set(config.palette.secondary)
    this.sharedUniforms.uPaletteAccent.value.set(config.palette.accent)

    // 4. Mettre à jour le profil d'interaction
    this.interaction.setProfile(config.interaction)

    // 5. Configurer les événements rares
    this.rareEvents.setEvents(config.rareEvents || [])

    // 6. Instancier les briques déclarées
    const context: BrickContext = {
      id: '',
      scene: this.scene,
      camera: this.camera,
      sharedUniforms: this.sharedUniforms,
      quality: this.quality.getTier(),
    }

    for (const layer of config.layers) {
      for (const brickCfg of layer.bricks) {
        if (brickCfg.enabled === false) continue

        context.id = brickCfg.id
        const instance = BrickRegistry.create(brickCfg, context)
        if (instance) {
          instance.init(this.scene, this.camera, this.sharedUniforms)
          this.activeBricks.push(instance)
        }
      }
    }

    // Connecter les briques cibles aux événements rares
    this.rareEvents.setTargetBricks(this.activeBricks)

    // Rendu d'une première image
    this.renderFrame(0)

    // Si prefers-reduced-motion, ne pas boucler indéfiniment
    if (this.prefersReducedMotion) {
      this.renderFrame(0)
    } else {
      this.startLoop()
    }
  }

  /**
   * Boucle principale de rendu RAF.
   */
  private loop = (timestamp: number): void => {
    if (!this.isRunning) return

    // Mesure de performance
    this.quality.onFrame(timestamp)

    const rawDelta = this.clock.getDelta()
    // Limiter le delta pour éviter les sauts temporels après suspension
    const delta = Math.min(rawDelta, 0.1) * this.timeScale
    this.totalAccumulatedTime += delta

    this.renderFrame(delta)

    this.animFrameId = requestAnimationFrame(this.loop)
  }

  private renderFrame(delta: number): void {
    // 1. Mettre à jour l'interaction amortie (lerp)
    this.interaction.update(delta)
    const interactionState = this.interaction.getState()

    // 2. Mettre à jour les uniformes partagés
    this.sharedUniforms.uTime.value = this.totalAccumulatedTime
    this.sharedUniforms.uMouse.value.set(interactionState.mouseX, interactionState.mouseY)
    this.sharedUniforms.uScroll.value = interactionState.scrollY

    // 3. Déplacer légèrement la caméra en perspective selon la souris (parallaxe globale)
    const parallaxStrength = this.currentConfig?.interaction.mouseParallaxStrength ?? 0.15
    this.camera.position.x = interactionState.mouseX * parallaxStrength * 2.0
    this.camera.position.y = -interactionState.mouseY * parallaxStrength * 1.5
    this.camera.lookAt(0, 0, 0)

    // 4. Mettre à jour les événements rares
    this.rareEvents.update(this.totalAccumulatedTime)

    // 5. Mettre à jour chaque brique active
    const qualityTier = this.quality.getTier()
    for (const brick of this.activeBricks) {
      brick.update(delta, this.totalAccumulatedTime, interactionState, qualityTier)
    }

    // 6. Dessin GPU
    this.renderer.render(this.scene, this.camera)
  }

  public startLoop(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.clock.start()
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  public stopLoop(): void {
    this.isRunning = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.clock.stop()
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused
    if (paused) {
      this.stopLoop()
    } else if (!document.hidden && !this.prefersReducedMotion) {
      this.startLoop()
    }
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
    this.sharedUniforms.uTimeScale.value = this.timeScale
  }

  public getTimeScale(): number {
    return this.timeScale
  }

  /**
   * Capture une image PNG du canvas en direct.
   */
  public captureFrame(): string {
    // Force un rendu immédiat pour rafraîchir le buffer
    this.renderFrame(0)
    return this.canvas.toDataURL('image/png')
  }

  /**
   * Déclenche une séquence Welcome thématique.
   */
  public triggerIntroSequence(introType: string): void {
    for (const brick of this.activeBricks) {
      if (brick.triggerIntro) {
        brick.triggerIntro(introType, 0)
      }
    }
  }

  public getCurrentConfig(): ThemeEngineConfig | null {
    return this.currentConfig
  }

  public getActiveBricks(): IBrickInstance[] {
    return this.activeBricks
  }

  public updateBrickProps(brickId: string, props: Record<string, unknown>): void {
    const brick = this.activeBricks.find((b) => b.id === brickId)
    if (brick && brick.updateProps) {
      brick.updateProps(props)
    }
  }

  public dispose(): void {
    this.stopLoop()
    this.teardownListeners()

    for (const brick of this.activeBricks) {
      brick.dispose()
    }
    this.activeBricks = []

    ResourcePool.clearScene(this.scene)
    this.interaction.dispose()
    this.rareEvents.dispose()
    this.renderer.dispose()
  }
}
