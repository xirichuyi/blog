import React from 'react';
import './CustomButton.css';

interface CustomButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  onClick,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const buttonClass = [
    'custom-button',
    `custom-button--${variant}`,
    `custom-button--${size}`,
    disabled ? 'custom-button--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="custom-button__content">
        {children}
      </span>
    </button>
  );
};
