/**
 * 通用按钮组件
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import type { MotionProps } from 'framer-motion';
import { cn } from '@/utils/common';
import { buttonVariants } from '@/utils/animations';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  animated?: boolean;
}

// 分离动画和非动画按钮的类型
type AnimatedButtonProps = ButtonProps & {
  animated: true;
} & Omit<MotionProps, keyof ButtonHTMLAttributes<HTMLButtonElement>>;

type StaticButtonProps = ButtonProps & {
  animated?: false;
};

type CombinedButtonProps = AnimatedButtonProps | StaticButtonProps;

const Button = forwardRef<HTMLButtonElement, CombinedButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    animated = true,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden',
    ];

    const variantClasses = {
      primary: [
        'bg-primary text-white',
        'hover:bg-primary-dark',
        'focus:ring-primary',
      ],
      secondary: [
        'bg-gray-600 text-white',
        'hover:bg-gray-700',
        'focus:ring-gray-500',
      ],
      outline: [
        'border border-gray-300 dark:border-gray-600 bg-transparent',
        'text-gray-700 dark:text-gray-200',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        'focus:ring-gray-500',
      ],
      ghost: [
        'bg-transparent text-gray-700 dark:text-gray-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:ring-gray-500',
      ],
      danger: [
        'bg-red-600 text-white',
        'hover:bg-red-700',
        'focus:ring-red-500',
      ],
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-lg',
    };

    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className
    );

    const content = (
      <>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <span className={cn('flex items-center gap-2', loading && 'invisible')}>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </span>
      </>
    );

    if (animated) {
      const { animated: _, ...motionProps } = props as AnimatedButtonProps;
      return (
        <motion.button
          ref={ref}
          className={classes}
          disabled={disabled || loading}
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          {...motionProps}
        >
          {content}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
