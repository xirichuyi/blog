import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
  indeterminate?: boolean;
  value?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  className = '',
  indeterminate = true,
  value
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'medium':
        return 48;
      case 'large':
        return 64;
      default:
        return 48;
    }
  };

  return (
    <div className={`loading-spinner loading-spinner-${size} ${className}`}>
      <md-circular-progress
        indeterminate={indeterminate}
        value={value}
        style={{
          '--md-circular-progress-size': `${getSizeValue()}px`
        }}
      />
      {message && (
        <p className={`loading-message md-typescale-${size === 'large' ? 'body-large' : 'body-medium'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
