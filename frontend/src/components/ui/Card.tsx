/**
 * 通用卡片组件
 */

import { forwardRef, HTMLAttributes } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/utils/common';
import { cardVariants } from '@/utils/animations';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  animated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps & MotionProps>(
  ({
    className,
    variant = 'default',
    padding = 'md',
    hoverable = false,
    animated = true,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'rounded-lg transition-all duration-200',
    ];

    const variantClasses = {
      default: [
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
      ],
      elevated: [
        'bg-white dark:bg-gray-800',
        'shadow-lg hover:shadow-xl',
        'border border-gray-100 dark:border-gray-700',
      ],
      outlined: [
        'bg-transparent',
        'border-2 border-gray-200 dark:border-gray-600',
        'hover:border-gray-300 dark:hover:border-gray-500',
      ],
      glass: [
        'bg-white/10 dark:bg-gray-900/10',
        'backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/20',
      ],
    };

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const hoverClasses = hoverable ? [
      'cursor-pointer',
      'hover:shadow-lg',
      'hover:scale-[1.02]',
    ] : [];

    const classes = cn(
      baseClasses,
      variantClasses[variant],
      paddingClasses[padding],
      hoverClasses,
      className
    );

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={classes}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          whileHover={hoverable ? "hover" : undefined}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// 子组件
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-600 dark:text-gray-400', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export default Card;
