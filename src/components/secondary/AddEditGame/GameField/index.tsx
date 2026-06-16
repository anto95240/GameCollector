import './GameField.css'

import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const GameField = ({ label, required, tooltip, children, error, touched, htmlFor }: any) => {
  return (
    <div className={`game-field ${error && touched ? 'has-error' : ''}`}>
      <div className="game-field-header">
        <label htmlFor={htmlFor}>
          {label} {required && <span className="text-purple-500 ml-1">*</span>}
        </label>
        {tooltip && (
          <div className="game-field-tooltip-container" data-tooltip={tooltip}>
            <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
          </div>
        )}
      </div>
      <div className="game-field-content">{children}</div>
      {error && touched && <div className="game-field-error">{error}</div>}
    </div>
  )
}

export default GameField
