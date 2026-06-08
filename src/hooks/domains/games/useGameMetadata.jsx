import { useMemo } from "react";

import { isWishlistStatusName } from "@/utils/formatters";
export const useGameMetadata = (game, metadata) => {
  const getStatusName = useMemo(() => {
    return (statusId) => {
      if (!statusId || !metadata?.statuses) return "Inconnu";
      const status = metadata.statuses.find(s => s._id === statusId);
      return status?.status_name || "Inconnu";
    };
  }, [metadata?.statuses]);
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
  const ratingOptions = useMemo(() => {
    return metadata?.rating || [];
  }, [metadata?.rating]);
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
