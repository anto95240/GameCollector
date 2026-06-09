import './FloatingInput.css';

import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';

export interface FloatingInputProps {
  type?: string;
  id?: string;
  name?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: React.ReactNode;
  required?: boolean;
  isPassword?: boolean;
  autocomplete?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  type = 'text',
  id,
  name,
  value,
  onChange,
  label,
  required = false,
  isPassword = false,
  autocomplete,
  onKeyDown,
}: any) => {
  const [showPassword, setShowPassword] = useState(false)

  const containerRef = useRef<HTMLLabelElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  useEffect(() => {
    const checkOverflow = () => {
      // Un petit setTimeout garantit que le navigateur a fini de dessiner le texte
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const cw = containerRef.current.clientWidth
          const sw = textRef.current.scrollWidth

          if (sw > cw) {
            setIsOverflowing(true)
            // On calcule la distance (négative pour aller vers la gauche)
            textRef.current.style.setProperty('--scroll-amount', `-${sw - cw}px`)
          } else {
            setIsOverflowing(false)
          }
        }
      }, 100)
    }

    const observer = new ResizeObserver(() => checkOverflow())
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    checkOverflow()
    return () => observer.disconnect()
  }, [label, value])

  return (
    <div className="form-group floating-label w-full">
      <input
        type={inputType}
        id={id}
        className="form-input w-full"
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        required={required}
        placeholder=" "
        autoComplete={autocomplete}
      />
      <label htmlFor={id} ref={containerRef}>
        <span className={`label-text ${isOverflowing ? 'scrolling' : ''}`} ref={textRef}>
          {label} {required && <span>*</span>}
        </span>
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
  )
}

export default FloatingInput
