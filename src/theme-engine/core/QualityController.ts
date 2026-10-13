/**
 * src/theme-engine/core/QualityController.ts
 *
 * Gestionnaire dynamique de performance et d'adaptation du framerate.
 * Mesure l'EMA FPS, gère les paliers (HIGH, MEDIUM, LOW) et plafonne le DPR.
 */

import type { QualityTier } from '../types'

export type QualityMode = 'AUTO' | QualityTier

export interface PerformanceStats {
  fps: number
  avgFps: number
  minFps: number
  frameTimeMs: number
  tier: QualityTier
  effectiveDpr: number
  particleScale: number
}

export type QualityChangeListener = (tier: QualityTier, stats: PerformanceStats) => void

export class QualityController {
  private mode: QualityMode = 'AUTO'
  private currentTier: QualityTier = 'HIGH'

  // Métriques temporelles
  private frameCount = 0
  private lastTime = performance.now()
  private fpsBuffer: number[] = []
  private fpsBufferMax = 60
  private emaFps = 60
  private minFps = 60
  private lastFrameDuration = 16.6

  // Détection de sous-performance
  private lowFpsDuration = 0 // En secondes cumulées
  private highFpsDuration = 0

  private isMobile = false
  private listeners: Set<QualityChangeListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMobile =
        window.innerWidth < 768 ||
        (typeof navigator !== 'undefined' &&
          (navigator.maxTouchPoints > 1 || /Android|iPhone|iPad/i.test(navigator.userAgent)))
      // Détermination du palier initial
      if (this.isMobile) {
        this.currentTier = 'MEDIUM'
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.hardwareConcurrency &&
        navigator.hardwareConcurrency <= 2
      ) {
        this.currentTier = 'MEDIUM'
      } else {
        this.currentTier = 'HIGH'
      }
    }
  }

  public setMode(mode: QualityMode): void {
    this.mode = mode
    if (mode !== 'AUTO') {
      this.currentTier = mode
      this.notifyListeners()
    }
  }

  public getMode(): QualityMode {
    return this.mode
  }

  public getTier(): QualityTier {
    return this.currentTier
  }

  public getIsMobile(): boolean {
    return this.isMobile
  }

  /**
   * Retourne le DPR plafonné selon le palier actif et la plateforme.
   * HIGH : min(window.dpr, 1.5)
   * MEDIUM : 1.0 (ou 1.25 sur desktop)
   * LOW : 1.0
   */
  public getEffectiveDpr(): number {
    if (typeof window === 'undefined') return 1.0
    const rawDpr = window.devicePixelRatio || 1.0

    if (this.isMobile) {
      return 1.0 // Toujours bridé à 1.0 sur mobile pour préserver la batterie
    }

    switch (this.currentTier) {
      case 'HIGH':
        return Math.min(rawDpr, 1.5)
      case 'MEDIUM':
        return Math.min(rawDpr, 1.25)
      case 'LOW':
        return 1.0
    }
  }

  /**
   * Facteur d'échelle pour la quantité de particules instanciées (0 à 1.0).
   */
  public getParticleScale(): number {
    const mobileRatio = this.isMobile ? 0.35 : 1.0

    switch (this.currentTier) {
      case 'HIGH':
        return 1.0 * mobileRatio
      case 'MEDIUM':
        return 0.5 * mobileRatio
      case 'LOW':
        return 0.25 * mobileRatio
    }
  }

  /**
   * Doit être appelé à chaque frame dans la boucle de rendu.
   */
  public onFrame(currentTime: number): void {
    let deltaMs = currentTime - this.lastTime
    this.lastTime = currentTime

    if (deltaMs <= 0 || deltaMs > 250) {
      deltaMs = 16.6
    }
    this.lastFrameDuration = deltaMs

    const instantFps = 1000 / deltaMs
    // Filtre moyenne exponentielle (EMA) pour un FPS lisse
    this.emaFps = this.emaFps * 0.92 + instantFps * 0.08

    this.fpsBuffer.push(instantFps)
    if (this.fpsBuffer.length > this.fpsBufferMax) {
      this.fpsBuffer.shift()
    }

    this.frameCount++
    if (this.frameCount % 30 === 0) {
      this.minFps = Math.min(...this.fpsBuffer)
    }

    // Asservissement automatique si mode = 'AUTO'
    if (this.mode === 'AUTO') {
      const deltaSec = deltaMs / 1000
      const thresholdDown = this.isMobile ? 26 : 48
      const thresholdUp = this.isMobile ? 32 : 58

      if (this.emaFps < thresholdDown) {
        this.lowFpsDuration += deltaSec
        this.highFpsDuration = 0
        // Si le framerate s'effondre pendant plus de 2.0 secondes
        if (this.lowFpsDuration > 2.0) {
          this.downgradeTier()
          this.lowFpsDuration = 0
        }
      } else if (this.emaFps > thresholdUp) {
        this.highFpsDuration += deltaSec
        this.lowFpsDuration = 0
        // Récupération progressive si très stable pendant 10 secondes
        if (this.highFpsDuration > 10.0) {
          this.upgradeTier()
          this.highFpsDuration = 0
        }
      } else {
        this.lowFpsDuration = Math.max(0, this.lowFpsDuration - deltaSec * 0.5)
        this.highFpsDuration = Math.max(0, this.highFpsDuration - deltaSec * 0.5)
      }
    }
  }

  private downgradeTier(): void {
    if (this.currentTier === 'HIGH') {
      this.currentTier = 'MEDIUM'
      this.notifyListeners()
    } else if (this.currentTier === 'MEDIUM') {
      this.currentTier = 'LOW'
      this.notifyListeners()
    }
  }

  private upgradeTier(): void {
    if (this.currentTier === 'LOW') {
      this.currentTier = 'MEDIUM'
      this.notifyListeners()
    } else if (this.currentTier === 'MEDIUM' && !this.isMobile) {
      this.currentTier = 'HIGH'
      this.notifyListeners()
    }
  }

  public getStats(): PerformanceStats {
    let avg = 0
    if (this.fpsBuffer.length > 0) {
      const sum = this.fpsBuffer.reduce((a, b) => a + b, 0)
      avg = sum / this.fpsBuffer.length
    }
    return {
      fps: Math.round(this.emaFps * 10) / 10,
      avgFps: Math.round(avg * 10) / 10,
      minFps: Math.round(this.minFps * 10) / 10,
      frameTimeMs: Math.round(this.lastFrameDuration * 10) / 10,
      tier: this.currentTier,
      effectiveDpr: this.getEffectiveDpr(),
      particleScale: this.getParticleScale(),
    }
  }

  public subscribe(listener: QualityChangeListener): () => void {
    this.listeners.add(listener)
    listener(this.currentTier, this.getStats())
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const stats = this.getStats()
    this.listeners.forEach((fn) => fn(this.currentTier, stats))
  }
}
