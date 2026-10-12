/**
 * src/theme-engine/bricks/registry.ts
 *
 * Registre central des briques (Plugins).
 * Permet l'enregistrement, l'instanciation déclarative et la validation des briques.
 */

import type { BrickConfig, BrickContext, IBrickDefinition, IBrickInstance } from '../types'

class BrickRegistryImpl {
  private definitions: Map<string, IBrickDefinition> = new Map()

  /**
   * Enregistre une brique dans le catalogue.
   */
  public register(definition: IBrickDefinition): void {
    if (this.definitions.has(definition.type)) {
      console.warn(`[BrickRegistry] La brique '${definition.type}' est déjà enregistrée. Remplacement.`)
    }
    this.definitions.set(definition.type, definition)
  }

  /**
   * Vérifie si une brique existe dans le registre.
   */
  public has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * Récupère la définition d'une brique.
   */
  public get(type: string): IBrickDefinition | undefined {
    return this.definitions.get(type)
  }

  /**
   * Instancie une brique à partir de sa configuration déclarative.
   */
  public create(config: BrickConfig, context: BrickContext): IBrickInstance | null {
    const def = this.definitions.get(config.brickType)
    if (!def) {
      console.error(`[BrickRegistry] Type de brique inconnu : '${config.brickType}'`)
      return null
    }

    try {
      return def.create(config.id, config.props, context)
    } catch (err) {
      console.error(`[BrickRegistry] Erreur lors de l'instanciation de la brique '${config.id}' (${config.brickType}):`, err)
      return null
    }
  }

  /**
   * Retourne la liste de tous les types de briques enregistrés.
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.definitions.keys())
  }
}

export const BrickRegistry = new BrickRegistryImpl()
