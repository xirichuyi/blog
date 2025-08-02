/**
 * 错误边界组件
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '@/components/ui';
import { fadeInUp } from '@/utils/animations';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 这里可以添加错误报告服务
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <motion.div
            className="max-w-md w-full"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <Card variant="elevated" className="bg-gray-800 border-gray-700">
              <CardContent className="text-center p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Something went wrong
                  </h2>
                  <p className="text-gray-400 text-sm">
                    We're sorry, but something unexpected happened. Please try again.
                  </p>
                </div>

                {/* 开发环境下显示错误详情 */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 mb-2">
                      Error Details (Development)
                    </summary>
                    <div className="bg-gray-900 p-3 rounded text-xs text-red-400 overflow-auto max-h-32">
                      <div className="font-mono">
                        <div className="font-semibold mb-1">Error:</div>
                        <div className="mb-2">{this.state.error.message}</div>
                        <div className="font-semibold mb-1">Stack:</div>
                        <div className="whitespace-pre-wrap">
                          {this.state.error.stack}
                        </div>
                      </div>
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    onClick={this.handleRetry}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleReload}
                    className="flex-1"
                  >
                    Reload Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * 简化的错误边界 Hook
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
  };
};

/**
 * 增强的异步错误边界组件
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, fallback, onError }) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      setError(error);
      onError?.(error);

      // 阻止默认的控制台错误输出
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      setError(error);
      onError?.(error);
    };

    // 处理异步错误
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalRequestAnimationFrame = window.requestAnimationFrame;

    // 包装setTimeout以捕获其中的错误
    window.setTimeout = function(callback: Function, delay?: number, ...args: any[]) {
      const wrappedCallback = function() {
        try {
          return callback.apply(this, args);
        } catch (error) {
          setError(error instanceof Error ? error : new Error(String(error)));
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      };
      return originalSetTimeout.call(this, wrappedCallback, delay);
    };

    // 包装setInterval以捕获其中的错误
    window.setInterval = function(callback: Function, delay?: number, ...args: any[]) {
      const wrappedCallback = function() {
        try {
          return callback.apply(this, args);
        } catch (error) {
          setError(error instanceof Error ? error : new Error(String(error)));
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      };
      return originalSetInterval.call(this, wrappedCallback, delay);
    };

    // 包装requestAnimationFrame以捕获其中的错误
    window.requestAnimationFrame = function(callback: FrameRequestCallback) {
      const wrappedCallback = function(time: number) {
        try {
          return callback(time);
        } catch (error) {
          setError(error instanceof Error ? error : new Error(String(error)));
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      };
      return originalRequestAnimationFrame.call(this, wrappedCallback);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);

      // 恢复原始函数
      window.setTimeout = originalSetTimeout;
      window.setInterval = originalSetInterval;
      window.requestAnimationFrame = originalRequestAnimationFrame;
    };
  }, [onError]);

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <ErrorBoundary>
        <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Async Error Occurred
          </h3>
          <p className="text-red-600 dark:text-red-300 text-sm">
            {error.message}
          </p>
          <button
            onClick={() => setError(null)}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  return <>{children}</>;
};
