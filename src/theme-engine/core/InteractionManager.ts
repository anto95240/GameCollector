/**
 * src/theme-engine/core/InteractionManager.ts
 *
 * Gestionnaire d'interactions utilisateur (souris, inclinaison mobile/gyroscope, défilement)
 * avec amorti fluide par interpolation linéaire (lerp) sans aucun re-render React.
 */

import type { InteractionProfile, InteractionState } from '../types'

export class InteractionManager {
  private state: InteractionState = {
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    scrollY: 0,
    tiltX: 0,
    tiltY: 0,
  }

  private profile: InteractionProfile = {
    mouseParallaxStrength: 0.15,
    scrollDepthFactor: 0.1,
    gyroscopeEnabled: true,
  }

  private isListening = false
  private targetScrollY = 0
  private targetTiltX = 0
  private targetTiltY = 0

  // Bindings des événements
  private onPointerMoveBound = this.onPointerMove.bind(this)
  private onScrollBound = this.onScroll.bind(this)
  private onOrientationBound = this.onOrientation.bind(this)

  constructor() {
    this.startListening()
  }

  public setProfile(profile: InteractionProfile): void {
    this.profile = { ...this.profile, ...profile }
  }

  public getState(): InteractionState {
    return this.state
  }

  public startListening(): void {
    if (this.isListening || typeof window === 'undefined') return
    window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true })
    window.addEventListener('scroll', this.onScrollBound, { passive: true })
    if (this.profile.gyroscopeEnabled && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', this.onOrientationBound, { passive: true })
    }
    this.isListening = true
  }

  public stopListening(): void {
    if (!this.isListening || typeof window === 'undefined') return
    window.removeEventListener('pointermove', this.onPointerMoveBound)
    window.removeEventListener('scroll', this.onScrollBound)
    window.removeEventListener('deviceorientation', this.onOrientationBound)
    this.isListening = false
  }

  private onPointerMove(e: PointerEvent): void {
    const halfW = window.innerWidth / 2
    const halfH = window.innerHeight / 2
    // Normalisation [-1.0, 1.0]
    this.state.targetMouseX = (e.clientX - halfW) / halfW
    this.state.targetMouseY = (e.clientY - halfH) / halfH
  }

  private onScroll(): void {
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    )
    this.targetScrollY = window.scrollY / maxScroll
  }

  private onOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma !== null && e.beta !== null) {
      // gamma : inclinaison gauche/droite [-90, 90]
      // beta : inclinaison avant/arrière [-180, 180]
      this.targetTiltX = Math.max(-1, Math.min(1, e.gamma / 45))
      this.targetTiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 45))
    }
  }

  /**
   * Appelé à chaque frame d'animation pour lisser les valeurs via lerp.
   * delta est en secondes.
   */
  public update(delta: number): void {
    const lerpFactor = Math.min(1.0, delta * 5.0) // Amorti dynamique fluide

    // Si le gyroscope envoie des valeurs, il complète ou remplace la souris
    const targetX = Math.abs(this.targetTiltX) > 0.05 ? this.targetTiltX : this.state.targetMouseX
    const targetY = Math.abs(this.targetTiltY) > 0.05 ? this.targetTiltY : this.state.targetMouseY

    this.state.mouseX += (targetX - this.state.mouseX) * lerpFactor
    this.state.mouseY += (targetY - this.state.mouseY) * lerpFactor
    this.state.scrollY += (this.targetScrollY - this.state.scrollY) * lerpFactor
    this.state.tiltX += (this.targetTiltX - this.state.tiltX) * lerpFactor
    this.state.tiltY += (this.targetTiltY - this.state.tiltY) * lerpFactor
  }

  public dispose(): void {
    this.stopListening()
  }
}
