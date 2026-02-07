import { useEffect, useState } from "react";

export const useActiveOnScroll = (containerRef, selector, items = []) => {
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || items.length === 0) return;

        const handleScroll = () => {
            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;
            
            if (container.scrollLeft < 50) {
                const firstElement = container.querySelector(selector);
                if (firstElement) {
                    const id = firstElement.getAttribute("data-id");
                    if (id) {
                        setActiveId(id);
                        return; 
                    }
                }
            }

            const elements = container.querySelectorAll(selector);
            let closestId = null;
            let minDiff = Infinity;

            elements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                const elCenter = rect.left + rect.width / 2;
                const diff = Math.abs(elCenter - containerCenter);

                if (diff < minDiff) {
                    minDiff = diff;
                    closestId = el.getAttribute("data-id");
                }
            });

            if (closestId) {
                setActiveId(closestId);
            }
        };

        container.addEventListener("scroll", handleScroll);
        
        const timeoutId = setTimeout(handleScroll, 100);

        return () => {
            container.removeEventListener("scroll", handleScroll);
            clearTimeout(timeoutId);
        };
    }, [containerRef, selector, items]);

    return activeId;
};