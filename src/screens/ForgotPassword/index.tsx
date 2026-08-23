import './ForgotPassword.css'

import { faCheckCircle, faExclamationCircle, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import AuthInput from '@/components/common/AuthInput'
import LoadingButton from '@/components/common/LoadingButton'
import { supabase } from '@/lib/supabase'

const ForgotPassword = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsAnimating(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setIsAnimating(false)
    }
  }

  return (
    <>
      <h2 className="auth-title">{t('auth.forgotPassword.title')}</h2>

      <p
        className="auth-description"
        style={{
          color: 'var(--text-color)',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '0.9rem',
          opacity: 0.8,
        }}
      >
        {t('auth.forgotPassword.description')}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message-login">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            className="error-message-login"
            style={{
              color: 'var(--success-color)',
              background: 'rgba(0, 255, 128, 0.1)',
              border: '1px solid var(--success-color)',
            }}
          >
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{t('auth.forgotPassword.success')}</span>
          </div>
        )}

        <AuthInput
          name="email"
          placeholder={t('auth.login.usernameOrEmail')}
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          icon={faUser}
          required={true}
        />

        <LoadingButton
          text={t('auth.forgotPassword.submit')}
          isAnimating={isAnimating}
          showLoading={isAnimating}
          loadingVariant="login"
          variant="cyber"
          className="mt-4"
        />
      </form>

      <div className="auth-footer">
        <p>
          <Link to="/login" className="cyber-link">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </>
  )
}

export default ForgotPassword
