import './AppLayout.css'

import { faArrowUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router'

import SkipLink from '@/components/common/SkipLink'
import Navbar from '@/components/main/Navbar'
import PatchNotesModal from '@/components/main/PatchNotesModal'
import BottomNav from '@/components/secondary/Navbar/BottomNav'
import { DashboardSettingsProvider } from '@/context/DashboardSettingsContext'
import { useVersionCheck } from '@/hooks/domains/versioning/useVersionCheck'

const AppLayout = () => {
  const { t } = useTranslation()
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setShowScrollToTopButton(scrollContainerRef.current.scrollTop > 50)
    }
  }, [])

  const { pathname } = useLocation()

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { isPatchNotesVisible, latestRelease, closePatchNotes } = useVersionCheck()

  return (
    <DashboardSettingsProvider>
      <div className="layout-container" ref={scrollContainerRef}>
        <SkipLink t={t} />
        <main className="main-content">
          <Navbar />
          <span
            id="main-content"
            tabIndex={-1}
            style={{ outline: 'none', position: 'absolute' }}
          ></span>
          <Outlet context={{ t }} />
        </main>

        <BottomNav t={t} />

        <div>
          {showScrollToTopButton && (
            <button className="return-top" onClick={scrollToTop} aria-label="Retour en haut">
              <FontAwesomeIcon icon={faArrowUp} />
            </button>
          )}
        </div>

        {isPatchNotesVisible && (
          <PatchNotesModal release={latestRelease} onClose={closePatchNotes} />
        )}
      </div>
    </DashboardSettingsProvider>
  )
}

export default AppLayout
