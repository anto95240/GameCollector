import { createContext, useCallback,useContext, useState } from "react";

const FiltersContext = createContext(null);

export const FiltersProvider = ({ children }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [page, setPage] = useState(1);

    const removeFilter = useCallback((tag) => {
        setSelectedFilters(prev => prev.filter(t => t !== tag));
    }, []);

    const clearAllFilters = useCallback(() => {
        setSelectedFilters([]);
        setPage(1);
        setSearchTerm("");
    }, []);

    // La logique de handleSelectFilter de useGameFiltering peut être laissée
    // dans le hook ou ramenée ici, mais comme elle est spécifique aux jeux,
    // on peut juste exposer setSelectedFilters.

    return (
        <FiltersContext.Provider value={{
            searchTerm,
            setSearchTerm,
            selectedFilters,
            setSelectedFilters,
            page,
            setPage,
            removeFilter,
            clearAllFilters
        }}>
            {children}
        </FiltersContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FiltersContext);
    if (!context) {
        throw new Error("useFilters doit être utilisé à l'intérieur d'un FiltersProvider");
    }
    return context;
};
