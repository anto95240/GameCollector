import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "./CustomSelect.css";

const CustomSelect = ({ options = [], value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
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

    const selectedLabel = options.find(opt => String(opt.value) === String(value))?.label || value;
    
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
                <span className="select-label">{selectedLabel}</span>
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
                            className={`custom-option ${value === opt.value ? t('common.select') : ""}`}
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