import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "./CustomSelect.css";

const CustomSelect = ({ options = [], value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    options.find((opt) => String(opt.value) === String(value))?.label || value;

  useEffect(() => {
    const checkOverflow = () => {
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const cw = containerRef.current.clientWidth;
          const sw = textRef.current.scrollWidth;
          
          if (sw > cw) {
            setIsOverflowing(true);
            textRef.current.style.setProperty('--scroll-amount', `-${sw - cw}px`);
          } else {
            setIsOverflowing(false);
          }
        }
      }, 100); 
    };

    const observer = new ResizeObserver(() => checkOverflow());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    checkOverflow();
    return () => observer.disconnect();
  }, [selectedLabel, isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="custom-select-container" ref={wrapperRef}>
      <button
        className={`custom-select-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="select-label-wrapper" ref={containerRef}>
          <span className={`select-label ${isOverflowing ? "scrolling" : ""}`} ref={textRef}>
            {selectedLabel}
          </span>
        </div>
        
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`select-arrow ${isOpen ? "rotate" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-option ${value === opt.value ? t("common.select") : ""}`}
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