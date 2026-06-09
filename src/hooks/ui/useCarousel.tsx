import { useRef } from 'react'

export const useCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef
      const itemNode = current.querySelector<HTMLElement>('.observer-item')
      const scrollAmount = itemNode
        ? itemNode.offsetWidth + (window.innerWidth <= 768 ? 15 : 20)
        : 230

      current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return { scrollRef, scroll }
}
