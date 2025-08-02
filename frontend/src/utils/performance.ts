/**
 * 性能监控工具
 */

import React from 'react';
import { reportPerformanceIssue } from '@/services/errorReporting';

// 性能阈值配置
const PERFORMANCE_THRESHOLDS = {
  // 页面加载时间 (ms)
  PAGE_LOAD: 3000,
  // 首次内容绘制 (ms)
  FCP: 1800,
  // 最大内容绘制 (ms)
  LCP: 2500,
  // 首次输入延迟 (ms)
  FID: 100,
  // 累积布局偏移
  CLS: 0.1,
  // 组件渲染时间 (ms)
  COMPONENT_RENDER: 16,
  // API响应时间 (ms)
  API_RESPONSE: 2000,
  // 内存使用 (MB)
  MEMORY_USAGE: 100,
} as const;

// 性能指标接口
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  component?: string;
}

// 性能监控类
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // 观察导航时间
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load', navEntry.loadEventEnd - navEntry.fetchStart);
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
            this.recordMetric('first_byte', navEntry.responseStart - navEntry.fetchStart);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // 观察绘制时间
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // 观察最大内容绘制
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // 观察首次输入延迟
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          this.recordMetric('fid', fidEntry.processingStart - fidEntry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // 观察布局偏移
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, metadata?: { url?: string; component?: string }) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      ...metadata,
    };

    this.metrics.push(metric);

    // 检查是否超过阈值
    this.checkThreshold(metric);

    // 限制指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThreshold(metric: PerformanceMetric) {
    const thresholds: Record<string, number> = {
      page_load: PERFORMANCE_THRESHOLDS.PAGE_LOAD,
      fcp: PERFORMANCE_THRESHOLDS.FCP,
      lcp: PERFORMANCE_THRESHOLDS.LCP,
      fid: PERFORMANCE_THRESHOLDS.FID,
      cls: PERFORMANCE_THRESHOLDS.CLS,
      component_render: PERFORMANCE_THRESHOLDS.COMPONENT_RENDER,
      api_response: PERFORMANCE_THRESHOLDS.API_RESPONSE,
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      reportPerformanceIssue(metric.name, metric.value, threshold);
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(metric => metric.name === name);
    }
    return [...this.metrics];
  }

  /**
   * 获取性能统计
   */
  getStats(name: string) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
    };
  }

  /**
   * 清除指标
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * 销毁监控器
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 组件性能监控 Hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current;
        performanceMonitor.recordMetric('component_render', renderTime, {
          component: componentName,
        });
      }
    };
  });

  const measureOperation = React.useCallback((operationName: string, operation: () => void | Promise<void>) => {
    const start = performance.now();
    
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        performanceMonitor.recordMetric(`${componentName}_${operationName}`, duration, {
          component: componentName,
        });
      });
    } else {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(`${componentName}_${operationName}`, duration, {
        component: componentName,
      });
      return result;
    }
  }, [componentName]);

  return { measureOperation };
};

/**
 * API性能监控
 */
export const measureApiCall = async <T>(
  url: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await apiCall();
    const duration = performance.now() - start;
    
    performanceMonitor.recordMetric('api_response', duration, { url });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric('api_error', duration, { url });
    throw error;
  }
};

/**
 * 内存使用监控
 */
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    
    performanceMonitor.recordMetric('memory_usage', usedMB);
    
    if (usedMB > PERFORMANCE_THRESHOLDS.MEMORY_USAGE) {
      console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
    }
  }
};

/**
 * 性能报告生成
 */
export const generatePerformanceReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    metrics: {
      pageLoad: performanceMonitor.getStats('page_load'),
      fcp: performanceMonitor.getStats('fcp'),
      lcp: performanceMonitor.getStats('lcp'),
      fid: performanceMonitor.getStats('fid'),
      cls: performanceMonitor.getStats('cls'),
      apiResponse: performanceMonitor.getStats('api_response'),
      memoryUsage: performanceMonitor.getStats('memory_usage'),
    },
    rawMetrics: performanceMonitor.getMetrics(),
  };

  return report;
};

// 定期监控内存使用
if (typeof window !== 'undefined') {
  setInterval(monitorMemoryUsage, 30000); // 每30秒检查一次
}

export default performanceMonitor;
