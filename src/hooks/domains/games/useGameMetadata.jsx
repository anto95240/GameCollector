import { useMemo } from "react";

import { isWishlistStatusName } from "@/utils/formatters";

/**
 * Hook pour enrichir et looker les métadonnées du jeu
 * Responsabilité: Résolution des IDs métadonnées vers leurs noms/valeurs
 */
export const useGameMetadata = (game, metadata) => {
  /**
   * Récupère le nom du statut basé sur l'ID
   */
  const getStatusName = useMemo(() => {
    return (statusId) => {
      if (!statusId || !metadata?.statuses) return "Inconnu";
      const status = metadata.statuses.find(s => s._id === statusId);
      return status?.status_name || "Inconnu";
    };
  }, [metadata?.statuses]);

  /**
   * Enrichit le jeu avec les noms des statuts/genres/platforms
   * Utile pour l'affichage
   */
  const enrichedGame = useMemo(() => {
    if (!game) return null;

    // Résoudre une seule fois plutôt que 3 appels identiques
    const statusName = getStatusName(game.status_id?._id || game.status_id);

    return {
      ...game,
      statusName,
      isWishlistStatus: isWishlistStatusName(statusName),
    };
  }, [game, getStatusName]);

  /**
   * Récupère les options de rating disponibles
   */
  const ratingOptions = useMemo(() => {
    return metadata?.rating || [];
  }, [metadata?.rating]);

  /**
   * Récupère les statuses disponibles
   */
  const statusOptions = useMemo(() => {
    return metadata?.statuses || [];
  }, [metadata?.statuses]);

  return {
    enrichedGame,
    getStatusName,
    ratingOptions,
    statusOptions
  };
};
