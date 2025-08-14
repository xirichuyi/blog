import React from 'react';
import './FloatingActionButton.css';

interface FloatingActionButtonProps {
  icon: string;
  label?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  extended?: boolean;
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  size = 'medium',
  extended = false,
  className = ''
}) => {
  const fabElement = extended ? 'md-fab' : 'md-fab';
  
  return (
    <div className={`fab-container fab-${variant} fab-${size} ${className}`}>
      <md-fab
        className={`floating-action-button ${extended ? 'extended' : ''}`}
        onClick={onClick}
        aria-label={label || `${icon} action`}
        size={size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'}
        variant={extended ? 'extended' : 'surface'}
        label={extended ? label : undefined}
      >
        <md-icon slot="icon">{icon}</md-icon>
      </md-fab>
    </div>
  );
};

export default FloatingActionButton;
