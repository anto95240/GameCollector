/**
 * src/theme-engine/runtime/ResourcePool.ts
 *
 * Gestionnaire de libération contrôlée et propre des ressources WebGL (VRAM).
 * Empêche les fuites mémoire lors des changements de thèmes.
 */

import * as THREE from 'three'

export class ResourcePool {
  /**
   * Libère récursivement tous les objets 3D, géométries, matériaux et textures d'une scène.
   */
  public static disposeObject(obj: THREE.Object3D): void {
    if (!obj) return

    // Nettoyer les enfants d'abord
    while (obj.children && obj.children.length > 0) {
      const child = obj.children[0]
      obj.remove(child)
      ResourcePool.disposeObject(child)
    }

    // Nettoyer géométries et matériaux des meshes
    if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
      if (obj.geometry) {
        obj.geometry.dispose()
      }

      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => ResourcePool.disposeMaterial(mat))
      } else if (obj.material) {
        ResourcePool.disposeMaterial(obj.material)
      }
    }
  }

  /**
   * Libère un matériau Three.js et toutes les textures qui lui sont attachées.
   */
  public static disposeMaterial(material: THREE.Material): void {
    if (!material) return

    // Parcourir les propriétés pour trouver les textures
    const record = material as unknown as Record<string, unknown>
    for (const key of Object.keys(record)) {
      const val = record[key]
      if (val instanceof THREE.Texture) {
        val.dispose()
      }
    }

    material.dispose()
  }

  /**
   * Vide complètement une scène Three.js.
   */
  public static clearScene(scene: THREE.Scene): void {
    while (scene.children.length > 0) {
      const obj = scene.children[0]
      scene.remove(obj)
      ResourcePool.disposeObject(obj)
    }
  }
}
