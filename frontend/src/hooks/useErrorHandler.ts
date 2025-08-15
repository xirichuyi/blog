import { useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp?: Date;
  source?: string;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  retryable?: boolean;
  onRetry?: () => void;
}

export const useErrorHandler = () => {
  const { showNotification } = useNotification();
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((
    error: Error | string | ErrorInfo,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification: shouldShowNotification = true,
      logToConsole = true,
      retryable = false,
      onRetry
    } = options;

    // Normalize error to ErrorInfo
    let errorInfo: ErrorInfo;
    
    if (typeof error === 'string') {
      errorInfo = {
        message: error,
        timestamp: new Date(),
        source: 'user'
      };
    } else if (error instanceof Error) {
      errorInfo = {
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack
        },
        timestamp: new Date(),
        source: 'exception'
      };
    } else {
      errorInfo = {
        ...error,
        timestamp: error.timestamp || new Date()
      };
    }

    // Log to console if enabled
    if (logToConsole) {
      console.error('Error handled:', errorInfo);
    }

    // Add to error list
    setErrors(prev => [...prev.slice(-9), errorInfo]); // Keep last 10 errors

    // Show notification if enabled
    if (shouldShowNotification) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: errorInfo.message,
        duration: retryable ? 0 : 5000, // Persistent if retryable
        actions: retryable && onRetry ? [
          {
            label: 'Retry',
            action: async () => {
              setIsRetrying(true);
              try {
                await onRetry();
              } catch (retryError) {
                handleError(retryError as Error, { retryable: false });
              } finally {
                setIsRetrying(false);
              }
            }
          }
        ] : undefined
      });
    }

    return errorInfo;
  }, [showNotification]);

  const handleApiError = useCallback((
    error: any,
    context?: string,
    onRetry?: () => void
  ) => {
    let message = 'An unexpected error occurred';
    let code: string | number | undefined;

    // Handle different error types
    if (error?.response) {
      // HTTP error response
      code = error.response.status;
      message = error.response.data?.message || 
                error.response.statusText || 
                `HTTP ${error.response.status} Error`;
    } else if (error?.message) {
      // Error object with message
      message = error.message;
    } else if (typeof error === 'string') {
      // String error
      message = error;
    }

    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    return handleError({
      message,
      code,
      details: error,
      source: 'api'
    }, {
      retryable: !!onRetry,
      onRetry
    });
  }, [handleError]);

  const handleNetworkError = useCallback((
    error: any,
    onRetry?: () => void
  ) => {
    const isOffline = !navigator.onLine;
    const message = isOffline 
      ? 'You appear to be offline. Please check your internet connection.'
      : 'Network error occurred. Please check your connection and try again.';

    return handleError({
      message,
      code: 'NETWORK_ERROR',
      details: { isOffline, originalError: error },
      source: 'network'
    }, {
      retryable: true,
      onRetry
    });
  }, [handleError]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getErrorSummary = useCallback(() => {
    const total = errors.length;
    const bySource = errors.reduce((acc, error) => {
      acc[error.source || 'unknown'] = (acc[error.source || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, bySource };
  }, [errors]);

  return {
    errors,
    isRetrying,
    handleError,
    handleApiError,
    handleNetworkError,
    clearErrors,
    clearError,
    getErrorSummary
  };
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandler = (errorHandler: ReturnType<typeof useErrorHandler>) => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(event.reason, {
      showNotification: true,
      logToConsole: true
    });
  });

  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error || event.message, {
      showNotification: true,
      logToConsole: true
    });
  });

  // Handle network status changes
  window.addEventListener('online', () => {
    console.log('Network connection restored');
  });

  window.addEventListener('offline', () => {
    errorHandler.handleError('You are now offline', {
      showNotification: true,
      logToConsole: true
    });
  });
};

export default useErrorHandler;
