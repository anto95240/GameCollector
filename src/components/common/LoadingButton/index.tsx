import React from 'react';
import './LoadingButton.css';

import { useNavigate } from 'react-router';

interface LoadingButtonProps {
  text: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isAnimating?: boolean;
  showLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'cyber';
  className?: string;
  loadingVariant?: 'login' | 'logout';
  loadingReturnTo?: string | null;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  text,
  onClick,
  isAnimating,
  disabled = false,
  type = 'submit',
  variant = 'primary', // "primary", "secondary", "danger", "cyber"
  className = '',
  loadingVariant = 'login', // "login" ou "logout" pour la page de chargement
  loadingReturnTo = null, // où rediriger après le chargement
}: any) => {
  const navigate = useNavigate()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e)
    }

    // Si l'animation commence, rediriger vers la page de chargement
    if (isAnimating) {
      const returnTo = loadingReturnTo || (loadingVariant === 'logout' ? '/' : '/dashboard')
      navigate(`/loading?variant=${loadingVariant}&returnTo=${encodeURIComponent(returnTo)}`)
    }
  }

  return (
    <div className={`button-wrapper ${className}`}>
      <button
        type={type}
        onClick={handleClick}
        className={`base-button btn-${variant} ${isAnimating ? 'is-loading' : ''}`}
        disabled={disabled || isAnimating}
      >
        {isAnimating ? <span className="loader-circle"></span> : text}
      </button>
    </div>
  )
}

export default LoadingButton
