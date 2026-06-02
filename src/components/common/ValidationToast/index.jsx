import './ValidationToast.css';

import { faCheckCircle, faExclamationCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

import { useToast } from '@/context';

const ValidationToast = () => {
  const { toast } = useToast();

  if (!toast.isVisible) return null;

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
