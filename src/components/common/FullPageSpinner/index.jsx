import './FullPageSpinner.css'

import React from 'react'

const FullPageSpinner = ({ text = 'Chargement en cours...', show = false }) => {
  if (!show) return null

  return (
    <div className="full-page-spinner-overlay" role="alert" aria-busy="true">
      <div className="fps-ring-container">
        <div className="fps-ring fps-ring-1"></div>
        <div className="fps-ring fps-ring-2"></div>
        <div className="fps-ring fps-ring-3"></div>
      </div>
      {text && <div className="fps-text">{text}</div>}
    </div>
  )
}

export default FullPageSpinner
