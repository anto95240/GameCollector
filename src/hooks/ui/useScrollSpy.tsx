import { useEffect, useRef, useState } from 'react'

export const useScrollSpy = (initialSection: any, selector: string) => {
  const [activeSection, setActiveSection] = useState(initialSection)
  const isClickScrolling = useRef(false)

  useEffect(() => {
    let observer: IntersectionObserver | null = null
    let mutationObs: MutationObserver | null = null

    const setupObserver = () => {
      // Nettoyer l'ancien observer si on le recrée
      observer?.disconnect()

      const handleIntersect = (entries: IntersectionObserverEntry[]) => {
        if (isClickScrolling.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      }

      observer = new IntersectionObserver(handleIntersect, {
        root: null,
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0,
      })

      const sections = document.querySelectorAll(selector)
      sections.forEach((section) => observer!.observe(section))
      return sections.length > 0
    }

    // Essai immédiat (fonctionne si les sections existent déjà : Profile)
    if (!setupObserver()) {
      // Les sections n'existent pas encore (AddEditGame en cours de chargement)
      // On surveille le DOM et on recrée l'observer quand elles apparaissent
      mutationObs = new MutationObserver(() => {
        if (setupObserver()) {
          mutationObs?.disconnect()
          mutationObs = null
        }
      })
      mutationObs.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      mutationObs?.disconnect()
    }
  }, [selector])

  const scrollToSection = (id: string, callback = () => {}) => {
    const element = document.getElementById(id)
    if (!element) return

    isClickScrolling.current = true
    setActiveSection(id)
    callback()
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      isClickScrolling.current = false
    }, 1000)
  }

  return { activeSection, scrollToSection }
}
