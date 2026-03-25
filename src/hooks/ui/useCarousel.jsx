import { useRef } from "react";

export const useCarousel = () => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const itemNode = current.querySelector('.observer-item');
      const scrollAmount = itemNode ? itemNode.offsetWidth + (window.innerWidth <= 768 ? 15 : 20) : 230;
      
      current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return { scrollRef, scroll };
};