import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import "./customSelect.css";

const CustomSelect = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Fermer le menu si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Trouver le label de l'option sélectionnée
    const selectedLabel = options.find(opt => opt.value === value)?.label || value;

    const handleSelect = (val) => {
        onChange(val); // Renvoie juste la valeur, comme un select natif
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
                            className={`custom-option ${value === opt.value ? "selected" : ""}`}
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