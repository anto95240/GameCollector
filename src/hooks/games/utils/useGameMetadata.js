/**
 * Hook pour gérer les métadonnées d'un jeu
 */
import { useEffect, useState } from "react";

import { MOCK_OPTIONS } from "@/config/constants";

export const useGameMetadata = (getAllMetadata) => {
  const [optionsData, setOptionsData] = useState({
    genre: [],
    platform: [],
    status: [],
    rating: MOCK_OPTIONS.rating
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const meta = await getAllMetadata();
        setOptionsData({
          genre: [{ value: "", label: "Sélectionner un genre" }, ...meta.genres.map(g => ({ value: g._id, label: g.genre_name }))],
          platform: [{ value: "", label: "Sélectionner une plateforme" }, ...meta.platforms.map(p => ({ value: p._id, label: p.platform_name }))],
          status: [{ value: "", label: "Sélectionner un statut" }, ...meta.statuses.map(s => ({ value: s._id, label: s.status_name }))],
          rating: MOCK_OPTIONS.rating
        });
        return meta.tags || [];
      } catch (e) { 
        console.error("Erreur métadonnées :", e);
        return [];
      }
    };

    fetchMetadata();
  }, [getAllMetadata]);

  return { optionsData, setOptionsData };
};
