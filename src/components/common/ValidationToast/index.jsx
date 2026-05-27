import './ValidationToast.css';

import { faCheckCircle, faExclamationCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect,useState } from 'react';

const ValidationToast = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState({
    type: 'success', // 'success', 'error', 'info'
    message: '',
    duration: 3000,
  });

  useEffect(() => {
    const handleShowToast = (event) => {
      const { detail } = event;
      setToast(detail);
      setIsVisible(true);

      // Auto-hide après la durée spécifiée
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, detail.duration || 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('validationToast', handleShowToast);
    return () => window.removeEventListener('validationToast', handleShowToast);
  }, []);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faExclamationCircle;
      case 'info':
        return faInfoCircle;
      default:
        return faCheckCircle;
    }
  };

  return (
    <div className={`validation-toast validation-toast--${toast.type}`}>
      <div className="validation-toast__icon">
        <FontAwesomeIcon icon={getIcon()} />
      </div>
      <div className="validation-toast__content">
        <p className="validation-toast__message">{toast.message}</p>
      </div>
    </div>
  );
};

export default ValidationToast;
