/**
 * Toast 通知组件
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNotifications, type Notification } from '@/hooks/useNotification';
import { Button, Icon } from '@/components/ui';
import { cn } from '@/utils/common';

interface ToastItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  notification,
  onRemove,
}) => {
  const { id, type, title, message, action } = notification;

  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-800 dark:text-green-200',
      message: 'text-green-700 dark:text-green-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-200',
      message: 'text-red-700 dark:text-red-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200',
      message: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-200',
      message: 'text-blue-700 dark:text-blue-300',
    },
  };

  const iconNames = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  const styles = typeStyles[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative w-full max-w-sm p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon
            name={iconNames[type]}
            size="md"
            className={styles.icon}
          />
        </div>
        
        <div className="ml-3 flex-1">
          <h4 className={cn('text-sm font-medium', styles.title)}>
            {title}
          </h4>
          {message && (
            <p className={cn('mt-1 text-sm', styles.message)}>
              {message}
            </p>
          )}
          
          {action && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                className={cn('text-xs', styles.title)}
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(id)}
            className={cn('text-gray-400 hover:text-gray-600 dark:hover:text-gray-200')}
          >
            <Icon name="close" size="sm" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
}) => {
  const { notifications, removeNotification } = useNotifications();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  // 限制显示的通知数量
  const visibleNotifications = notifications.slice(-maxToasts);

  const containerContent = (
    <div
      className={cn(
        'fixed z-50 flex flex-col space-y-3 pointer-events-none',
        positionClasses[position]
      )}
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <ToastItem
              notification={notification}
              onRemove={removeNotification}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );

  return createPortal(containerContent, document.body);
};

export default ToastContainer;

/**
 * Toast Provider 组件
 */
export const ToastProvider: React.FC<{
  children: React.ReactNode;
  position?: ToastContainerProps['position'];
  maxToasts?: number;
}> = ({ children, position, maxToasts }) => {
  return (
    <>
      {children}
      <ToastContainer
        position={position}
        maxToasts={maxToasts}
      />
    </>
  );
};

/**
 * 快捷 Toast 组件
 */
export const QuickToast: React.FC<{
  type: Notification['type'];
  title: string;
  message?: string;
  onClose?: () => void;
}> = ({ type, title, message, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 pointer-events-auto"
    >
      <ToastItem
        notification={{
          id: 'quick',
          type,
          title,
          message,
          timestamp: new Date(),
        }}
        onRemove={() => onClose?.()}
      />
    </motion.div>
  );
};
