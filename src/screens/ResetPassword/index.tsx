import './ResetPassword.css'

import { faCheckCircle, faExclamationCircle, faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import AuthInput from '@/components/common/AuthInput'
import LoadingButton from '@/components/common/LoadingButton'
import { supabase } from '@/lib/supabase'

const ResetPassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Supabase parse le fragment de l'URL contenant l'access_token si on arrive d'un email
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // L'utilisateur est prêt à réinitialiser son mot de passe
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError(t('ErrorMsg.passwordsNotMatching'))
      return
    }

    setIsAnimating(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || t('auth.resetPassword.error'))
    } finally {
      setIsAnimating(false)
    }
  }

  return (
    <>
      <h2 className="auth-title">{t('auth.resetPassword.title')}</h2>

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
        {t('auth.resetPassword.description')}
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
            <span>{t('auth.resetPassword.success')}</span>
          </div>
        )}

        <AuthInput
          type="password"
          name="password"
          placeholder={t('auth.login.password')}
          value={password}
          onChange={(e: any) => setPassword(e.target.value)}
          icon={faLock}
          required={true}
          isPassword={true}
          ariaLabelToggle={t('auth.login.arialLabelPassword')}
        />

        <AuthInput
          type="password"
          name="confirmPassword"
          placeholder={t('profile.edit.confirmPassword')}
          value={confirmPassword}
          onChange={(e: any) => setConfirmPassword(e.target.value)}
          icon={faLock}
          required={true}
          isPassword={true}
          ariaLabelToggle={t('auth.login.arialLabelPassword')}
        />

        <LoadingButton
          text={t('auth.resetPassword.submit')}
          isAnimating={isAnimating}
          showLoading={isAnimating}
          loadingVariant="login"
          variant="cyber"
          className="mt-4"
        />
      </form>
    </>
  )
}

export default ResetPassword
