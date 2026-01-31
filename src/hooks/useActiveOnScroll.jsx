import { useEffect, useState } from "react";

export const useActiveOnScroll = (containerRef, selector, items = []) => {
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        const container = containerRef.current;
        // On retire la limite de 1024px ici pour laisser le développeur décider dans le composant
        if (!container || items.length === 0) return;

        const options = {
            root: container,
            // Zone de détection : 20% au centre de l'écran (horizontal ou vertical)
            rootMargin: "-20% -20% -20% -20%", 
            threshold: 0.2, 
        };

        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("data-id");
                    if (id) setActiveId(id);
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);
        
        // On attend que le DOM soit stable
        const timeoutId = setTimeout(() => {
            const elements = container.querySelectorAll(selector);
            elements.forEach((el) => observer.observe(el));
            
            // Si rien n'est actif, on active le premier par défaut
            if (elements.length > 0 && !activeId) {
                setActiveId(elements[0].getAttribute("data-id"));
            }
        }, 150);

        return () => {
            observer.disconnect();
            clearTimeout(timeoutId);
        };
    }, [containerRef, selector, items]); // Re-déclenche si les items (filtres) changent

    return activeId;
};