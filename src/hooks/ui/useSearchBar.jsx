import { useState, useEffect } from 'react';

export const useSearchBar = (initialValue = '', delay = 300) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);
    
    const [debouncedTerm, setDebouncedTerm] = useState(initialValue);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, delay);

        return () => clearTimeout(timer);
    }, [searchTerm, delay]);

    const clearSearch = () => {
        setSearchTerm('');
    };

    return {
        searchTerm,
        setSearchTerm,
        debouncedTerm,
        clearSearch
    };
};