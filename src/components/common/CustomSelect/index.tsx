import './CustomSelect.css'

import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Hauteur estimée du dropdown (px). Ajuster si besoin ou mesurer dynamiquement.
const DROPDOWN_ESTIMATED_HEIGHT = 220
const DROPDOWN_MARGIN = 8 // espace entre le select et le dropdown

interface Option {
  value: string | number
  label: string
}

interface CustomSelectProps {
  options?: Option[]
  value?: string | number
  onChange?: (val: string | number) => void
  disabled?: boolean
  error?: string | boolean
  touched?: boolean
  name?: string
  onBlur?: (name?: string, value?: string | number) => void
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options = [],
  value,
  onChange,
  disabled = false,
  error,
  touched,
  name,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState('bottom') // 'bottom' | 'top'

  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { t } = useTranslation()

  /* ── Fermeture au clic extérieur ── */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ── Calcul de la position au moment de l'ouverture ── */
  const computePosition = useCallback(() => {
    if (!wrapperRef.current) return

    const triggerRect = wrapperRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    // Espace disponible en dessous du select
    const spaceBelow = viewportHeight - triggerRect.bottom - DROPDOWN_MARGIN
    // Espace disponible au-dessus du select
    const spaceAbove = triggerRect.top - DROPDOWN_MARGIN

    // Si le dropdown tient en dessous → bas, sinon → haut (si plus de place en haut)
    if (spaceBelow >= DROPDOWN_ESTIMATED_HEIGHT || spaceBelow >= spaceAbove) {
      setDropdownPosition('bottom')
    } else {
      setDropdownPosition('top')
    }
  }, [])

  /* ── Recalcul si le dropdown est déjà ouvert et la fenêtre scrolle / redimensionne ── */
  useEffect(() => {
    if (!isOpen) return
    computePosition()

    window.addEventListener('scroll', computePosition, true)
    window.addEventListener('resize', computePosition)
    return () => {
      window.removeEventListener('scroll', computePosition, true)
      window.removeEventListener('resize', computePosition)
    }
  }, [isOpen, computePosition])

  /* ── Détection débordement du texte sélectionné ── */
  useEffect(() => {
    const checkOverflow = () => {
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const cw = containerRef.current.clientWidth
          const sw = textRef.current.scrollWidth
          if (sw > cw) {
            setIsOverflowing(true)
            textRef.current.style.setProperty('--scroll-amount', `-${sw - cw}px`)
          } else {
            setIsOverflowing(false)
          }
        }
      }, 100)
    }

    const observer = new ResizeObserver(checkOverflow)
    if (containerRef.current) observer.observe(containerRef.current)
    checkOverflow()
    return () => observer.disconnect()
  }, [value, isOpen])

  const selectedLabel = options.find((opt) => String(opt.value) === String(value))?.label || value

  const handleToggle = () => {
    if (disabled) return
    if (!isOpen) computePosition() // calcul avant l'ouverture

    // Si on est en train de fermer et qu'on a un onBlur
    if (isOpen && onBlur) {
      onBlur(name, value)
    }

    setIsOpen(!isOpen)
  }

  const handleSelect = (val: string | number) => {
    if (!disabled) {
      if (onChange) onChange(val)
      if (onBlur) onBlur(name, val)
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    // Si Enter ou Espace -> basculer le menu
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
      return
    }

    // Gestion de la saisie au clavier (recherche rapide)
    if (e.key.length === 1) {
      e.preventDefault()
      const newQuery = searchQuery + e.key.toLowerCase()
      setSearchQuery(newQuery)

      // Chercher la première option qui correspond
      const matchedOption = options.find((opt) => opt.label.toLowerCase().startsWith(newQuery))

      if (matchedOption) {
        if (!isOpen) {
          handleSelect(matchedOption.value)
        } else {
          // Si le menu est ouvert, scroller vers l'élément mais ne pas fermer
          const optIndex = options.indexOf(matchedOption)
          if (dropdownRef.current && optIndex !== -1) {
            const childNode = dropdownRef.current.children[optIndex] as HTMLElement
            if (childNode) {
              childNode.scrollIntoView({ block: 'nearest' })
            }
          }
        }
      }

      // Réinitialiser la recherche après 1s
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery('')
      }, 1000)
    }
  }

  return (
    <div className="custom-select-container" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <button
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${error && touched ? 'border-red-500' : ''}`}
        onClick={handleToggle}
        type="button"
        disabled={disabled}
      >
        <div className="select-label-wrapper" ref={containerRef}>
          <span className={`select-label ${isOverflowing ? 'scrolling' : ''}`} ref={textRef}>
            {selectedLabel}
          </span>
        </div>

        <FontAwesomeIcon
          icon={faChevronDown}
          className={`select-arrow ${isOpen ? 'rotate' : ''}`}
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
              className={`custom-option ${String(value) === String(opt.value) ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {error && touched && (
        <span className="error-text text-red-500 text-sm mt-1 ml-1 block">{error}</span>
      )}
    </div>
  )
}

export default CustomSelect
