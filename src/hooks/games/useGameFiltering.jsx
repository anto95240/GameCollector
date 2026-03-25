import { useState, useMemo } from "react";

export const useGameFiltering = (initialGames) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [page, setPage] = useState(1);
    
    // 1. On pré-calcule les filtres parsés UNE SEULE FOIS quand ils changent
    const parsedFilters = useMemo(() => {
        return selectedFilters.map(filterTag => {
            const [category, value] = filterTag.split(': ');
            return { category: category.toLowerCase(), value };
        });
    }, [selectedFilters]);

    const filteredGames = useMemo(() => {
        if (!initialGames) return [];

        return initialGames.filter(game => {
            if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            if (parsedFilters.length > 0) {
                // 2. On utilise les filtres déjà parsés
                const matchesAll = parsedFilters.every(({ category, value }) => {
                    switch(category) {
                        case "genre": return game.genre === value;
                        case "plateforme": return game.platform === value; 
                        case "année": return game.year?.toString() === value;
                        case "note": return game.rating === value;
                        case "statut": return game.status === value;
                        case "favoris": 
                            return value === "Nos favoris" ? game.isFavorite : !game.isFavorite;
                        case "prochainement": 
                            return value === "Prochainement" ? game.isSoon : !game.isSoon;
                        default: return true; 
                    }
                });
                
                if (!matchesAll) return false;
            }
            return true;
        });
    }, [initialGames, searchTerm, parsedFilters]); // On dépend de parsedFilters ici

    const handleSelectFilter = (category, option) => {
        const newTag = `${category}: ${option}`;
        if (!selectedFilters.includes(newTag)) {
            setSelectedFilters(prev => [...prev, newTag]);
            setPage(1); 
        }
    };

    const removeFilter = (tag) => setSelectedFilters(prev => prev.filter(t => t !== tag));
    
    const clearAllFilters = () => {
        setSelectedFilters([]);
        setPage(1);
    };

    return {
        searchTerm, setSearchTerm, selectedFilters, handleSelectFilter, 
        removeFilter, clearAllFilters, page, setPage, filteredGames
    };
};