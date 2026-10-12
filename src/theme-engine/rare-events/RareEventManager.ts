/**
 * src/theme-engine/rare-events/RareEventManager.ts
 *
 * Moteur probabiliste d'événements rares et irréguliers (éclairs, météores, rafales, pulsations).
 * Assure un comportement organique et évite les boucles d'animation visibles et répétitives.
 */

import type { IBrickInstance, RareEventTrigger } from '../types'

interface ActiveEventState {
  config: RareEventTrigger
  nextTriggerTime: number // en secondes
  activeUntil: number     // en secondes
  isActive: boolean
}

export type EventTriggerListener = (event: RareEventTrigger, progress: number) => void

export class RareEventManager {
  private eventStates: Map<string, ActiveEventState> = new Map()
  private targetBricks: IBrickInstance[] = []
  private listeners: Set<EventTriggerListener> = new Set()

  public setEvents(events: RareEventTrigger[] = []): void {
    this.eventStates.clear()
    const nowSec = performance.now() / 1000

    for (const evt of events) {
      // Déterminer la première occurrence avec un décalage aléatoire
      const initialDelay =
        evt.minIntervalSeconds +
        Math.random() * (evt.maxIntervalSeconds - evt.minIntervalSeconds)

      this.eventStates.set(evt.id, {
        config: evt,
        nextTriggerTime: nowSec + initialDelay,
        activeUntil: 0,
        isActive: false,
      })
    }
  }

  public setTargetBricks(bricks: IBrickInstance[]): void {
    this.targetBricks = bricks
  }

  /**
   * Appelé à chaque frame avec le temps écoulé en secondes.
   */
  public update(currentTimeSec: number): void {
    for (const state of this.eventStates.values()) {
      const cfg = state.config

      // Cas 1 : L'événement est en cours d'exécution
      if (state.isActive) {
        if (currentTimeSec >= state.activeUntil) {
          // Fin de l'événement
          state.isActive = false
          // Planification de la prochaine occurrence
          const nextInterval =
            cfg.minIntervalSeconds +
            Math.random() * (cfg.maxIntervalSeconds - cfg.minIntervalSeconds)
          state.nextTriggerTime = currentTimeSec + nextInterval
          this.notifyProgress(cfg, 1.0)
        } else {
          // Progression normalisée [0.0 - 1.0]
          const elapsed = currentTimeSec - (state.activeUntil - cfg.durationSeconds)
          const progress = Math.min(1.0, Math.max(0.0, elapsed / cfg.durationSeconds))
          this.notifyProgress(cfg, progress)
        }
      }
      // Cas 2 : En attente du déclenchement
      else if (currentTimeSec >= state.nextTriggerTime) {
        // Test probabiliste
        const roll = Math.random()
        if (roll <= cfg.probability) {
          state.isActive = true
          state.activeUntil = currentTimeSec + cfg.durationSeconds

          // Déclencher sur les briques
          for (const brick of this.targetBricks) {
            if (brick.triggerEvent) {
              brick.triggerEvent(cfg)
            }
          }
          this.notifyProgress(cfg, 0.0)
        } else {
          // Re-tester un peu plus tard (après 20% de l'intervalle)
          const retryDelay = Math.max(2.0, cfg.minIntervalSeconds * 0.2)
          state.nextTriggerTime = currentTimeSec + retryDelay
        }
      }
    }
  }

  /**
   * Déclenche manuellement un événement rare pour les tests visuels.
   */
  public triggerManually(eventId: string): void {
    const state = this.eventStates.get(eventId)
    if (!state) return

    const nowSec = performance.now() / 1000
    state.isActive = true
    state.activeUntil = nowSec + state.config.durationSeconds

    for (const brick of this.targetBricks) {
      if (brick.triggerEvent) {
        brick.triggerEvent(state.config)
      }
    }
    this.notifyProgress(state.config, 0.0)
  }

  public subscribe(listener: EventTriggerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyProgress(event: RareEventTrigger, progress: number): void {
    this.listeners.forEach((fn) => fn(event, progress))
  }

  public dispose(): void {
    this.eventStates.clear()
    this.targetBricks = []
    this.listeners.clear()
  }
}
