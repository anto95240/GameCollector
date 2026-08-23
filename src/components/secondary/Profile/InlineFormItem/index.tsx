import './InlineFormItem.css'

import { faChevronDown, faChevronUp, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

const InlineFormItem = ({
  label,
  value: _value,
  placeholder,
  showForm,
  inputType = 'text',
  toggleForm,
  formValue,
  onFormChange,
  buttonLabel: _buttonLabel,
  hideInput = false,
  children,
}: any) => {
  const [showPassword, setShowPassword] = useState(false)
  const actualType = inputType === 'password' && showPassword ? 'text' : inputType

  return (
    <>
      <div className="account-info-item" onClick={toggleForm} style={{ cursor: 'pointer' }}>
        <div className="account-info-header">
          <p className="label">{label}</p>
          <FontAwesomeIcon
            icon={showForm ? faChevronUp : faChevronDown}
            className="accordion-icon"
          />
        </div>
      </div>

      <div className={`inline-form-wrapper ${showForm ? 'open' : ''}`}>
        <div className="inline-form-content">
          {!hideInput && (
            <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
              <input
                type={actualType}
                placeholder={placeholder}
                value={formValue}
                onChange={onFormChange}
                style={{ width: '100%' }}
                autoComplete={inputType === 'password' ? 'new-password' : 'off'}
              />
              {inputType === 'password' && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '5px',
                  }}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  )
}

export default InlineFormItem
