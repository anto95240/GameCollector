import { useState, useMemo } from "react";

export const useGameFiltering = (initialGames) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [page, setPage] = useState(1);
    
    const filteredGames = useMemo(() => {
        if (!initialGames) return [];

        return initialGames.filter(game => {
            if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            if (selectedFilters.length > 0) {
                const matchesAll = selectedFilters.every(filterTag => {
                    const [category, value] = filterTag.split(': ');
                    
                    switch(category.toLowerCase()) {
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
    }, [initialGames, searchTerm, selectedFilters]);

    const handleSelectFilter = (category, option) => {
        const newTag = `${category}: ${option}`;
        if (!selectedFilters.includes(newTag)) {
            setSelectedFilters(prev => [...prev, newTag]);
            setPage(1); 
        }
    };

    const removeFilter = (tag) => {
        setSelectedFilters(prev => prev.filter(t => t !== tag));
    };

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
        filteredGames
    };
};