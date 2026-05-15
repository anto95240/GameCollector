import React from 'react';

/**
 * Error Boundary - Capture les erreurs non gérées et affiche un fallback
 * Empêche l'app de crasher complètement
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorCount = this.state.errorCount + 1;
    this.setState({
      error,
      errorInfo,
      errorCount,
    });

    // Log l'erreur en développement
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Log l'erreur en production (optionnel)
    if (process.env.NODE_ENV === 'production') {
      // Vous pouvez envoyer l'erreur à un service de monitoring
      // ex: Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Optionnel: recharger la page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.title}>⚠️ Oups! Une erreur s'est produite</h1>
            
            <p style={styles.description}>
              L'application a rencontré une erreur inattendue.
              {this.state.errorCount > 2 && (
                <span style={styles.warning}>
                  {' '}Cette erreur s'est produite {this.state.errorCount} fois. Veuillez recharger la page.
                </span>
              )}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary style={styles.summary}>Détails technique (dev only)</summary>
                <pre style={styles.errorText}>
                  <strong>Error:</strong>
                  {'\n'}
                  {this.state.error && this.state.error.toString()}
                  {'\n\n'}
                  <strong>Stack trace:</strong>
                  {'\n'}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.button}>
                🏠 Retour à l'accueil
              </button>
              <button 
                onClick={() => window.location.reload()} 
                style={{ ...styles.button, ...styles.buttonSecondary }}
              >
                🔄 Recharger la page
              </button>
            </div>

            <p style={styles.footer}>
              Si le problème persiste, contactez le support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  },
  content: {
    maxWidth: '600px',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  title: {
    color: '#1f2937',
    fontSize: '24px',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  description: {
    color: '#6b7280',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '24px',
    margin: '0 0 24px 0',
  },
  warning: {
    color: '#ef4444',
    fontWeight: '600',
    display: 'block',
    marginTop: '8px',
  },
  details: {
    marginTop: '20px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: '12px',
  },
  errorText: {
    backgroundColor: '#1f2937',
    color: '#10b981',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
    lineHeight: '1.4',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonSecondary: {
    backgroundColor: '#6b7280',
  },
  footer: {
    marginTop: '24px',
    color: '#9ca3af',
    fontSize: '14px',
    margin: '24px 0 0 0',
  },
};

export default ErrorBoundary;
