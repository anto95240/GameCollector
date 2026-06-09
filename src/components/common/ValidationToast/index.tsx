import './ValidationToast.css';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { useToast } from '@/context';

const ValidationToast: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
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
    <div className="toast-container">
      {toasts.map((toast: any) => (
        <div 
          key={toast.id} 
          className={`validation-toast validation-toast--${toast.type} ${toast.exiting ? 'exiting' : ''}`}
        >
          <div className="validation-toast__icon">
            <FontAwesomeIcon icon={getIcon(toast.type)} />
          </div>
          
          <div className="validation-toast__content">
            <p className="validation-toast__message">{toast.message}</p>
          </div>
          
          {toast.actionLabel && toast.onAction && (
            <button 
              className="validation-toast__action" 
              onClick={() => {
                toast.onAction();
                dismissToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}

          <button 
            className="validation-toast__close" 
            onClick={() => dismissToast(toast.id)}
            aria-label="Fermer la notification"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ValidationToast;
