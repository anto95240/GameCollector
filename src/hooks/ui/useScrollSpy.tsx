import { useEffect, useRef, useState } from 'react'

export const useScrollSpy = (initialSection: any, selector: any) => {
  const [activeSection, setActiveSection] = useState(initialSection)
  const isClickScrolling = useRef(false)

  useEffect(() => {
    const handleIntersect = (entries: any) => {
      if (isClickScrolling.current) return
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      })
    }

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0,
    })

    const sections = document.querySelectorAll(selector)
    sections.forEach((section: any) => observer.observe(section))

    return () => sections.forEach((section: any) => observer.unobserve(section))
  }, [selector])

  const scrollToSection = (id: any, callback = () => {}) => {
    const element = document.getElementById(id)
    if (element) {
      isClickScrolling.current = true
      setActiveSection(id)
      callback() // Optionnel : fermer un menu mobile par exemple
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        isClickScrolling.current = false
      }, 1000)
    }
  }

  return { activeSection, scrollToSection }
}
