import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`error-message ${className}`}>
      <div className="error-content">
        <md-icon className="error-icon">error_outline</md-icon>
        <h3 className="error-title md-typescale-headline-small">{title}</h3>
        <p className="error-text md-typescale-body-medium">{message}</p>
        {onRetry && (
          <md-filled-button onClick={onRetry} className="retry-button">
            <md-icon slot="icon">refresh</md-icon>
            Try Again
          </md-filled-button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
