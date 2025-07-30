/**
 * 错误报告服务
 */

import { errorUtils } from '@/utils/common';
import { ERROR_MESSAGES } from '@/constants';

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * 错误报告服务
 */
class ErrorReportingService {
  private isEnabled: boolean = process.env.NODE_ENV === 'production';
  private apiEndpoint: string = '/api/errors';
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  /**
   * 报告错误
   */
  async reportError(error: Error, additionalInfo?: Record<string, any>): Promise<void> {
    if (!this.isEnabled) {
      console.warn('Error reporting is disabled in development mode');
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      additionalInfo,
    };

    try {
      await this.sendErrorReport(errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * 报告自定义错误
   */
  async reportCustomError(
    message: string,
    additionalInfo?: Record<string, any>
  ): Promise<void> {
    const error = new Error(message);
    await this.reportError(error, additionalInfo);
  }

  /**
   * 发送错误报告
   */
  private async sendErrorReport(
    errorReport: ErrorReport,
    retryCount: number = 0
  ): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.sendErrorReport(errorReport, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userId: string, sessionId?: string): void {
    // 这里可以存储用户信息，用于后续的错误报告
    // 实际实现可能需要使用全局状态管理
  }

  /**
   * 启用/禁用错误报告
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// 创建单例实例
export const errorReporting = new ErrorReportingService();

/**
 * 全局错误处理器
 */
export const setupGlobalErrorHandling = (): void => {
  // 处理未捕获的 JavaScript 错误
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    errorReporting.reportError(error, {
      type: 'javascript_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 处理未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    errorReporting.reportError(error, {
      type: 'unhandled_promise_rejection',
    });
  });

  // 处理资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      errorReporting.reportCustomError('Resource loading failed', {
        type: 'resource_error',
        element: event.target?.tagName,
        source: (event.target as any)?.src || (event.target as any)?.href,
      });
    }
  }, true);
};

/**
 * React 错误边界错误处理器
 */
export const handleReactError = (error: Error, errorInfo: any): void => {
  errorReporting.reportError(error, {
    type: 'react_error',
    componentStack: errorInfo.componentStack,
  });
};

/**
 * API 错误处理器
 */
export const handleApiError = (
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
): void => {
  errorReporting.reportError(error, {
    type: 'api_error',
    endpoint,
    method,
    statusCode,
  });
};

/**
 * 用户操作错误处理器
 */
export const handleUserActionError = (
  error: Error,
  action: string,
  context?: Record<string, any>
): void => {
  errorReporting.reportError(error, {
    type: 'user_action_error',
    action,
    context,
  });
};

/**
 * 性能监控
 */
export const reportPerformanceIssue = (
  metric: string,
  value: number,
  threshold: number
): void => {
  if (value > threshold) {
    errorReporting.reportCustomError(`Performance issue: ${metric}`, {
      type: 'performance_issue',
      metric,
      value,
      threshold,
    });
  }
};

/**
 * 错误恢复建议
 */
export const getErrorRecoveryActions = (error: Error): Array<{
  label: string;
  action: () => void;
}> => {
  const actions = [];

  // 网络错误恢复
  if (errorUtils.isNetworkError(error)) {
    actions.push({
      label: 'Retry',
      action: () => window.location.reload(),
    });
  }

  // 通用恢复操作
  actions.push(
    {
      label: 'Refresh Page',
      action: () => window.location.reload(),
    },
    {
      label: 'Go Home',
      action: () => window.location.href = '/',
    }
  );

  return actions;
};
