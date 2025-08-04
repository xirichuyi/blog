import React from 'react';
import './MaterialCard.css';

interface MaterialCardProps {
  variant?: 'filled' | 'outlined' | 'elevated';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  tabIndex?: number;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  variant = 'filled',
  children,
  className = '',
  onClick,
  style,
  tabIndex
}) => {
  const cardElement = variant === 'outlined' ? 'md-outlined-card' : 
                     variant === 'elevated' ? 'md-elevated-card' : 'md-filled-card';

  return React.createElement(
    cardElement,
    {
      className: `material-card ${className}`,
      onClick,
      style,
      tabIndex
    },
    children
  );
};

export default MaterialCard;
