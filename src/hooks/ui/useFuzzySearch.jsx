import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import axios from "@/config/interceptor";
// Hook UI: Gère la recherche intelligente (tolérance aux fautes) avec Fuse.js et fallback API
export const useFuzzySearch = (itemsList, searchKeys = ['title']) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const safeItemsList = Array.isArray(itemsList) ? itemsList : [];
  const isDev = import.meta.env.DEV;
  const backendDisabledRef = useRef(false);

  const resolveLocalMatches = (candidateItems) => {
    const candidates = Array.isArray(candidateItems) ? candidateItems : [];

    if (candidates.length === 0) {
      return [];
    }

    const candidateKeys = new Set();

    for (const item of candidates) {
      candidateKeys.add(String(item?.id ?? item?._id ?? "").toLowerCase());
      candidateKeys.add(String(item?.name ?? item?.title ?? "").toLowerCase());
    }

    return safeItemsList.filter((item) => {
      const itemId = String(item?.id ?? item?._id ?? "").toLowerCase();
      const itemName = String(item?.name ?? item?.title ?? "").toLowerCase();
      return candidateKeys.has(itemId) || candidateKeys.has(itemName);
    });
  };

  // Initialisation de Fuse avec mémorisation pour les performances
  const fuse = useMemo(() => new Fuse(safeItemsList, {
    keys: searchKeys,
    threshold: 0.3, // 0.3 = bon équilibre (tolère quelques fautes, mais pas trop)
    ignoreLocation: true, // Trouve le mot même s'il est à la fin du titre
    includeScore: true,
  }), [safeItemsList, searchKeys]);

  useEffect(() => {
    let isActive = true;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults(safeItemsList);
      return () => {
        isActive = false;
      };
    }

    // Exécution de la recherche: Priorité backend, fallback Fuse.js local si échec
    const runSearch = async () => {
      if (backendDisabledRef.current) {
        const fallbackResults = fuse.search(trimmedQuery).map((result) => result.item);

        if (!isActive) return;

        setResults(fallbackResults);
        return;
      }

      try {
        const response = await axios.get("/api/games/search/fuzzy", {
          params: {
            search: trimmedQuery,
            q: trimmedQuery,
            query: trimmedQuery,
            term: trimmedQuery,
          },
        });

        const apiResponse = response?.data;

        const normalizedResults = Array.isArray(apiResponse)
          ? apiResponse
          : apiResponse?.data || apiResponse?.games || [];

        if (!isActive) return;

        const nextResults = Array.isArray(normalizedResults) ? normalizedResults : [];

        if (nextResults.length > 0) {
          setResults(nextResults);
          return;
        }
      } catch (error) {
        backendDisabledRef.current = error?.response?.status === 404;
      }

      const fallbackResults = fuse.search(trimmedQuery).map((result) => result.item);

      if (!isActive) return;

      setResults(fallbackResults);
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [query, fuse, safeItemsList, searchKeys, isDev]);

  return { query, setQuery, results };
};