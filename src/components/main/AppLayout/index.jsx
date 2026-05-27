import "./AppLayout.css";

import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import Navbar from "@/components/main/Navbar";
import BottomNav from "@/components/secondary/Navbar/BottomNav";

const AppLayout = () => {
  const { t } = useTranslation();
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);
  const scrollContainerRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setShowScrollToTopButton(scrollContainerRef.current.scrollTop > 50);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="layout-container" ref={scrollContainerRef}>
      <main className="main-content">
        <Navbar />
        <Outlet context={{ t }} />
      </main>

      <BottomNav t={t} />

      <div>
        {showScrollToTopButton && (
          <button
            className="return-top"
            onClick={scrollToTop}
            aria-label="Retour en haut"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
