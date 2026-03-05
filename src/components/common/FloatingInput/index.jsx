import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./FloatingInput.css";

const FloatingInput = ({ 
    type = "text", 
    id, 
    name, 
    value, 
    onChange, 
    label, 
    required = false, 
    isPassword = false,
    autocomplete
}) => {
    const [showPassword, setShowPassword] = useState(false);
    
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div className="form-group floating-label w-full">
            <input
                type={inputType}
                id={id}
                className="form-input w-full"
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                placeholder=" "
                autoComplete={autocomplete}
            />
            <label htmlFor={id}>
                {label} {required && <span>*</span>}
            </label>

            {isPassword && (
                <button
                    type="button"
                    className="eye-button cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Afficher/Masquer le mot de passe"
                >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
            )}
        </div>
    );
};

export default FloatingInput;