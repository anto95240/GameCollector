import { useState, useMemo } from "react";

export const useGameFiltering = (initialGames) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [page, setPage] = useState(1);
    
    // Logique de filtrage optimisée via useMemo
    const filteredGames = useMemo(() => {
        if (!initialGames) return [];

        return initialGames.filter(game => {
            // 1. Recherche Textuelle
            if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // 2. Filtres par Tags (Catégorie: Option)
            if (selectedFilters.length > 0) {
                // On vérifie si le jeu correspond à TOUS les filtres sélectionnés (Logique AND)
                // Ou au moins un (Logique OR). Ici je propose une logique hybride : 
                // Si on a plusieurs filtres, le jeu doit correspondre aux critères.
                
                // Exemple simple : on vérifie que pour chaque filtre actif, le jeu possède la propriété
                const matchesAll = selectedFilters.every(filterTag => {
                    const [category, value] = filterTag.split(': ');
                    
                    switch(category.toLowerCase()) {
                        case "genre": return game.genre === value;
                        case "plateforme": return game.platform === value; // Attention à l'orthographe "platform" vs "Plateforme"
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

    // Actions
    const handleSelectFilter = (category, option) => {
        const newTag = `${category}: ${option}`;
        if (!selectedFilters.includes(newTag)) {
            setSelectedFilters(prev => [...prev, newTag]);
            setPage(1); // Retour à la page 1 si on change les filtres
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