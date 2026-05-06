import { useState, useMemo } from "react";

export const useGameFiltering = (initialGames) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]); // format string tags
    const [page, setPage] = useState(1);

    // Group selectedFilters by category to allow OR behavior within a category
    const groupedFilters = useMemo(() => {
        const map = new Map();
        for (const filterTag of selectedFilters) {
            const [categoryRaw, valueRaw] = filterTag.split(": ");
            const category = categoryRaw?.toLowerCase() || "";
            const value = valueRaw ?? "";

            if (!map.has(category)) map.set(category, []);
            map.get(category).push(value);
        }

        // convert values: if multiple values -> array; if single with range -> object
        const result = {};
        for (const [cat, vals] of map.entries()) {
            if (vals.length === 1) {
                const v = vals[0];
                if (v.includes("|") ) {
                    result[cat] = v.split("|");
                } else if (v.includes("-") && (cat.includes("year") || cat.includes("année") || cat.includes("rating") || cat.includes("note"))) {
                    const [minStr, maxStr] = v.split("-");
                    result[cat] = { min: Number(minStr) || 0, max: Number(maxStr) || Number.MAX_SAFE_INTEGER };
                } else {
                    result[cat] = v;
                }
            } else {
                // multiple tags for same category => OR list
                const flat = vals.flatMap((v) => v.includes("|") ? v.split("|") : [v]);
                result[cat] = Array.from(new Set(flat.filter(Boolean)));
            }
        }

        return result;
    }, [selectedFilters]);

    const filteredGames = useMemo(() => {
        if (!initialGames) return [];

        return initialGames.filter((game) => {
            if (searchTerm && !game.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            // apply grouped filters: OR within category, AND across categories
            for (const [category, value] of Object.entries(groupedFilters)) {
                if (!category) continue;

                switch (true) {
                    case category.includes("genre"): {
                        if (Array.isArray(value)) {
                            if (!value.includes(game.genre)) return false;
                        } else if (value && game.genre !== value) return false;
                        break;
                    }
                    case category.includes("platform") || category.includes("plateforme"): {
                        if (Array.isArray(value)) {
                            if (!value.includes(game.platform)) return false;
                        } else if (value && game.platform !== value) return false;
                        break;
                    }
                    case category.includes("year") || category.includes("année") || category.includes("year_range") || category.includes("année_range"): {
                        if (typeof value === "object" && value.min !== undefined) {
                            const y = Number(game.year) || 0;
                            if (y < value.min || y > value.max) return false;
                        } else if (Array.isArray(value)) {
                            if (!value.includes(String(game.year))) return false;
                        } else if (value && String(game.year) !== String(value)) return false;
                        break;
                    }
                    case category.includes("rating") || category.includes("note") || category.includes("rating_range") || category.includes("note_range"): {
                        if (typeof value === "object" && value.min !== undefined) {
                            const r = Number(game.rating) || 0;
                            if (r < value.min || r > value.max) return false;
                        } else if (Array.isArray(value)) {
                            if (!value.includes(String(game.rating))) return false;
                        } else if (value && Number(game.rating) !== Number(value)) return false;
                        break;
                    }
                    case category.includes("status") || category.includes("statut"): {
                        if (Array.isArray(value)) {
                            if (!value.includes(game.status)) return false;
                        } else if (value && game.status !== value) return false;
                        break;
                    }
                    case category.includes("favorite") || category.includes("favoris") || category.includes("favorites"): {
                        if (Array.isArray(value)) {
                            // support selecting Nos favoris or Non favoris as list
                            if (value.includes("Nos favoris") && !game.isFavorite) return false;
                            if (value.includes("Non favoris") && game.isFavorite) return false;
                        } else {
                            if (value === "Nos favoris") {
                                if (!game.isFavorite) return false;
                            } else if (value === "Non favoris") {
                                if (game.isFavorite) return false;
                            }
                        }
                        break;
                    }
                    case category.includes("soon") || category.includes("prochainement"): {
                        if (Array.isArray(value)) {
                            if (value.includes("Prochainement") && !game.isSoon) return false;
                            if (value.includes("Pas prochainement") && game.isSoon) return false;
                        } else {
                            if (value === "Prochainement") {
                                if (!game.isSoon) return false;
                            } else if (value === "Pas prochainement") {
                                if (game.isSoon) return false;
                            }
                        }
                        break;
                    }
                    default:
                        break;
                }
            }

            return true;
        });
    }, [initialGames, searchTerm, groupedFilters]);

    const handleSelectFilter = (category, option, mergeMulti = false) => {
        // category as label e.g. "Genre" or "year_range"
        const cat = String(category).trim();
        const normalized = cat.toLowerCase();
        const isSingleValueFilter = normalized.includes("trier") || normalized.includes("sort") || normalized.includes("range") || normalized.includes("plage") || normalized.includes("intervalle") || option.includes("-") || option.includes("|");

        if (isSingleValueFilter) {
            const prefix = `${cat}: `;
            const nextFilters = selectedFilters.filter((s) => !s.startsWith(prefix));
            setSelectedFilters([...nextFilters, `${cat}: ${option}`]);
            setPage(1);
            return;
        }

        // For multi-select options, allow passing array or single option
        if (mergeMulti) {
            // find existing tag for category
            const prefix = `${cat}: `;
            const existing = selectedFilters.find((s) => s.startsWith(prefix));
            if (existing) {
                const existingValue = existing.split(": ")[1] || "";
                const set = new Set(existingValue.split("|").filter(Boolean));
                if (Array.isArray(option)) option.forEach((o) => set.add(o));
                else set.add(option);
                const newTag = `${cat}: ${Array.from(set).join("|")}`;
                setSelectedFilters((prev) => prev.map((p) => (p.startsWith(prefix) ? newTag : p)));
                setPage(1);
                return;
            }
            // add new multi tag
            const val = Array.isArray(option) ? option.join("|") : option;
            setSelectedFilters((prev) => [...prev, `${cat}: ${val}`]);
            setPage(1);
            return;
        }

        const newTag = `${cat}: ${option}`;
        if (!selectedFilters.includes(newTag)) {
            setSelectedFilters((prev) => [...prev, newTag]);
            setPage(1);
        }
    };

    const removeFilter = (tag) => setSelectedFilters((prev) => prev.filter((t) => t !== tag));

    const clearAllFilters = () => {
        setSelectedFilters([]);
        setPage(1);
    };

    return {
        searchTerm,
        setSearchTerm,
        selectedFilters,
        handleSelectFilter,
        removeFilter,
        clearAllFilters,
        page,
        setPage,
        setSelectedFilters,
        filteredGames,
    };
};