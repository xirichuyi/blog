// Performance monitoring utility for tracking API requests and cache performance

export interface RequestMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  fromCache: boolean;
  status: 'success' | 'error';
  error?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  averageResponseTime: number;
  totalResponseTime: number;
  duplicateRequests: number;
  requestsByEndpoint: Record<string, number>;
  // Web Vitals
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  firstContentfulPaint?: number;
}

class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private duplicateTracker = new Map<string, number>();
  private isEnabled = process.env.NODE_ENV === 'development';
  private webVitals: Partial<PerformanceStats> = {};
  private observer?: PerformanceObserver;

  constructor() {
    this.initWebVitalsMonitoring();
  }

  // Initialize Web Vitals monitoring
  private initWebVitalsMonitoring(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Monitor LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.webVitals.largestContentfulPaint = entry.startTime;
            } else if (entry.entryType === 'first-input') {
              this.webVitals.firstInputDelay = (entry as any).processingStart - entry.startTime;
            } else if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              this.webVitals.cumulativeLayoutShift =
                (this.webVitals.cumulativeLayoutShift || 0) + (entry as any).value;
            } else if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
              this.webVitals.firstContentfulPaint = entry.startTime;
            }
          }
        });

        this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint'] });
      }

      // Monitor TTI (Time to Interactive) using a simple heuristic
      if ('performance' in window && 'timing' in performance) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const timing = performance.timing;
            this.webVitals.timeToInteractive = timing.domInteractive - timing.navigationStart;
          }, 0);
        });
      }
    } catch (error) {
      console.warn('Failed to initialize Web Vitals monitoring:', error);
    }
  }

  // Start tracking a request
  startRequest(url: string, method: string = 'GET'): string {
    if (!this.isEnabled) return '';

    const requestId = `${method}:${url}:${Date.now()}:${Math.random()}`;
    const startTime = performance.now();

    // Track potential duplicates
    const key = `${method}:${url}`;
    const count = this.duplicateTracker.get(key) || 0;
    this.duplicateTracker.set(key, count + 1);

    // Store partial metric
    const metric: Partial<RequestMetrics> = {
      url,
      method,
      startTime,
      fromCache: false
    };

    // Store with requestId for later completion
    (this.metrics as any)[requestId] = metric;

    return requestId;
  }

  // Complete tracking a request
  endRequest(
    requestId: string,
    status: 'success' | 'error',
    fromCache: boolean = false,
    error?: string
  ): void {
    if (!this.isEnabled || !requestId) return;

    const metric = (this.metrics as any)[requestId] as Partial<RequestMetrics>;
    if (!metric) return;

    const endTime = performance.now();
    const completedMetric: RequestMetrics = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime!,
      fromCache,
      status,
      error
    } as RequestMetrics;

    // Remove from temporary storage and add to metrics
    delete (this.metrics as any)[requestId];
    this.metrics.push(completedMetric);

    // Log performance issues
    if (completedMetric.duration > 1000) {
      console.warn(`Slow request detected: ${completedMetric.url} took ${completedMetric.duration.toFixed(2)}ms`);
    }

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Get performance statistics
  getStats(): PerformanceStats {
    const totalRequests = this.metrics.length;
    const cacheHits = this.metrics.filter(m => m.fromCache).length;
    const cacheMisses = totalRequests - cacheHits;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const requestsByEndpoint: Record<string, number> = {};
    this.metrics.forEach(m => {
      const key = `${m.method} ${m.url}`;
      requestsByEndpoint[key] = (requestsByEndpoint[key] || 0) + 1;
    });

    // Count duplicate requests (same endpoint called multiple times)
    const duplicateRequests = Array.from(this.duplicateTracker.values())
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);

    return {
      totalRequests,
      cacheHits,
      cacheMisses,
      cacheHitRate,
      averageResponseTime,
      totalResponseTime,
      duplicateRequests,
      requestsByEndpoint,
      // Include Web Vitals
      ...this.webVitals
    };
  }

  // Get recent slow requests
  getSlowRequests(threshold: number = 500): RequestMetrics[] {
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }

  // Get duplicate request patterns
  getDuplicatePatterns(): Array<{ endpoint: string; count: number }> {
    return Array.from(this.duplicateTracker.entries())
      .filter(([, count]) => count > 1)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.duplicateTracker.clear();
  }

  // Generate performance report
  generateReport(): string {
    const stats = this.getStats();
    const slowRequests = this.getSlowRequests();
    const duplicates = this.getDuplicatePatterns();

    let report = '=== Performance Report ===\n';
    report += `Total Requests: ${stats.totalRequests}\n`;
    report += `Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}% (${stats.cacheHits}/${stats.totalRequests})\n`;
    report += `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms\n`;
    report += `Duplicate Requests: ${stats.duplicateRequests}\n\n`;

    if (slowRequests.length > 0) {
      report += '=== Slow Requests (>500ms) ===\n';
      slowRequests.forEach(req => {
        report += `${req.method} ${req.url}: ${req.duration.toFixed(2)}ms ${req.fromCache ? '(cached)' : ''}\n`;
      });
      report += '\n';
    }

    if (duplicates.length > 0) {
      report += '=== Duplicate Request Patterns ===\n';
      duplicates.forEach(({ endpoint, count }) => {
        report += `${endpoint}: ${count} requests\n`;
      });
      report += '\n';
    }

    report += '=== Requests by Endpoint ===\n';
    Object.entries(stats.requestsByEndpoint)
      .sort(([, a], [, b]) => b - a)
      .forEach(([endpoint, count]) => {
        report += `${endpoint}: ${count}\n`;
      });

    return report;
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to wrap API calls with performance monitoring
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  method: string = 'GET'
): T {
  return (async (...args: any[]) => {
    const requestId = performanceMonitor.startRequest(endpoint, method);

    try {
      const result = await fn(...args);
      performanceMonitor.endRequest(requestId, 'success', false);
      return result;
    } catch (error) {
      performanceMonitor.endRequest(
        requestId,
        'error',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }) as T;
}

// Development helper to log performance stats
if (process.env.NODE_ENV === 'development') {
  // Log performance stats every 30 seconds
  setInterval(() => {
    const stats = performanceMonitor.getStats();
    if (stats.totalRequests > 0) {
      console.group('🚀 Performance Stats');
      console.log(`Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
      console.log(`Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
      console.log(`Duplicate Requests: ${stats.duplicateRequests}`);

      const duplicates = performanceMonitor.getDuplicatePatterns();
      if (duplicates.length > 0) {
        console.warn('Duplicate request patterns detected:', duplicates);
      }

      console.groupEnd();
    }
  }, 30000);
}
