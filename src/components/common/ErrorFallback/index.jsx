import React from 'react'
import './ErrorFallback.css'

export const ErrorFallback = ({ error, retry }) => (
  <div className="error-fallback-container">
    <div className="error-fallback-content">
      <div className="error-fallback-icon">⚠️</div>
      <h2 className="error-fallback-title">Oups! Une erreur s'est produite</h2>
      <p className="error-fallback-message">
        {error?.message || "L'application a rencontré une erreur inattendue."}
      </p>

      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details className="error-fallback-details">
          <summary>Détails techniques (dev only)</summary>
          <pre>{error.stack}</pre>
        </details>
      )}

      <div className="error-fallback-actions">
        {retry && (
          <button className="error-fallback-btn primary" onClick={retry}>
            🔄 Réessayer
          </button>
        )}
        <button
          className="error-fallback-btn secondary"
          onClick={() => (window.location.href = '/')}
        >
          🏠 Retour à l'accueil
        </button>
      </div>
    </div>
  </div>
)

export default ErrorFallback
