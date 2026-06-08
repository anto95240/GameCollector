import React from 'react'
import ErrorFallback from '../ErrorFallback'
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    console.error('Error caught by boundary:', error, errorInfo)

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
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error} retry={this.handleReset} />
      }
      return <ErrorFallback error={this.state.error} retry={this.handleReset} />
    }

    return this.props.children
  }
}

export default ErrorBoundary
