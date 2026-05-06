import { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "./CustomSelect.css";

// Hauteur estimée du dropdown (px). Ajuster si besoin ou mesurer dynamiquement.
const DROPDOWN_ESTIMATED_HEIGHT = 220;
const DROPDOWN_MARGIN = 8; // espace entre le select et le dropdown

const CustomSelect = ({ options = [], value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom"); // 'bottom' | 'top'

  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const { t } = useTranslation();

  /* ── Fermeture au clic extérieur ── */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Calcul de la position au moment de l'ouverture ── */
  const computePosition = useCallback(() => {
    if (!wrapperRef.current) return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Espace disponible en dessous du select
    const spaceBelow = viewportHeight - triggerRect.bottom - DROPDOWN_MARGIN;
    // Espace disponible au-dessus du select
    const spaceAbove = triggerRect.top - DROPDOWN_MARGIN;

    // Si le dropdown tient en dessous → bas, sinon → haut (si plus de place en haut)
    if (spaceBelow >= DROPDOWN_ESTIMATED_HEIGHT || spaceBelow >= spaceAbove) {
      setDropdownPosition("bottom");
    } else {
      setDropdownPosition("top");
    }
  }, []);

  /* ── Recalcul si le dropdown est déjà ouvert et la fenêtre scrolle / redimensionne ── */
  useEffect(() => {
    if (!isOpen) return;
    computePosition();

    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);
    return () => {
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [isOpen, computePosition]);

  /* ── Détection débordement du texte sélectionné ── */
  useEffect(() => {
    const checkOverflow = () => {
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const cw = containerRef.current.clientWidth;
          const sw = textRef.current.scrollWidth;
          if (sw > cw) {
            setIsOverflowing(true);
            textRef.current.style.setProperty("--scroll-amount", `-${sw - cw}px`);
          } else {
            setIsOverflowing(false);
          }
        }
      }, 100);
    };

    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    checkOverflow();
    return () => observer.disconnect();
  }, [value, isOpen]);

  const selectedLabel =
    options.find((opt) => String(opt.value) === String(value))?.label || value;

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) computePosition(); // calcul avant l'ouverture
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val) => {
    if (!disabled) {
      onChange(val);
      setIsOpen(false);
    }
  };

  return (
    <div className="custom-select-container" ref={wrapperRef}>
      <button
        className={`custom-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={handleToggle}
        type="button"
        disabled={disabled}
      >
        <div className="select-label-wrapper" ref={containerRef}>
          <span
            className={`select-label ${isOverflowing ? "scrolling" : ""}`}
            ref={textRef}
          >
            {selectedLabel}
          </span>
        </div>

        <FontAwesomeIcon
          icon={faChevronDown}
          className={`select-arrow ${isOpen ? "rotate" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className={`custom-select-dropdown custom-select-dropdown--${dropdownPosition}`}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-option ${String(value) === String(opt.value) ? "selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;