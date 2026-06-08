import './Login.css'

import { faExclamationCircle, faLock, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import AuthInput from '@/components/common/AuthInput'
import LoadingButton from '@/components/common/LoadingButton'
import { useLogin } from '@/hooks/domains/auth/useLogin'

const Login = () => {
  // L'UI est totalement séparée de la logique !
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isAnimating,
    showLoading,
    handleSubmit,
    t,
  } = useLogin()

  return (
    <>
      <h2 className="auth-title">{t('auth.login.title')}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message-login">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        <AuthInput
          name="email"
          placeholder={t('auth.login.usernameOrEmail')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={faUser}
          required={true}
        />

        <AuthInput
          type="password"
          name="password"
          placeholder={t('auth.login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={faLock}
          required={true}
          isPassword={true}
          ariaLabelToggle={t('auth.login.arialLabelPassword')}
        />

        <LoadingButton
          text={t('auth.login.submit')}
          isAnimating={isAnimating}
          showLoading={showLoading}
          loadingVariant="login"
          variant="cyber"
          className="mt-4"
        />
      </form>

      <div className="auth-footer">
        <p>
          {t('auth.login.newUser')}
          <Link to="/register" className="cyber-link">
            {t('auth.login.newUserLink')}
          </Link>
        </p>
      </div>
    </>
  )
}

export default Login
