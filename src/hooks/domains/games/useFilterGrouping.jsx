import { useMemo } from "react";
export const useFilterGrouping = (selectedFilters) => {
  return useMemo(() => {
    const map = new Map();

    // Grouper les filtres par catégorie
    for (const filterTag of selectedFilters) {
      const [categoryRaw, valueRaw] = filterTag.split(": ");
      const category = categoryRaw?.toLowerCase() || "";
      const value = valueRaw ?? "";

      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category).push(value);
    }

    // Convertir les valeurs groupées selon leur structure
    const result = {};
    for (const [cat, vals] of map.entries()) {
      if (vals.length === 1) {
        const v = vals[0];

        // Vérifier si c'est un tri (pipe-separated)
        if (v.includes("|")) {
          result[cat] = v.split("|");
        }
        // Vérifier si c'est une plage (tiret-separated)
        else if (
          v.includes("-") &&
          (cat.includes("year") || cat.includes("année") ||
           cat.includes("rating") || cat.includes("note"))
        ) {
          const [minStr, maxStr] = v.split("-");
          result[cat] = {
            min: Number(minStr) || 0,
            max: Number(maxStr) || Number.MAX_SAFE_INTEGER
          };
        }
        // Simple valeur
        else {
          result[cat] = v;
        }
      } else {
        // Multiples tags pour la même catégorie => liste OR
        const flat = vals.flatMap(v =>
          v.includes("|") ? v.split("|") : [v]
        );
        result[cat] = Array.from(new Set(flat.filter(Boolean)));
      }
    }

    return result;
  }, [selectedFilters]);
};
