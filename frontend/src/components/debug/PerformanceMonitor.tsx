// Real-time performance monitoring component

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { globalCache } from '../../utils/cacheManager';
import './PerformanceMonitor.css';

interface PerformanceStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  averageResponseTime: number;
  duplicateRequests: number;
  memoryUsage?: number;
  renderCount: number;
  // Web Vitals
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  firstContentfulPaint?: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  updateInterval?: number;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = false,
  position = 'bottom-right',
  updateInterval = 2000
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    duplicateRequests: 0,
    renderCount: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Update render count
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Update performance stats
  const updateStats = useCallback(() => {
    const perfStats = performanceMonitor.getStats();
    const cacheStats = globalCache.getStats();

    // Get memory usage if available
    let memoryUsage: number | undefined;
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }

    setStats({
      totalRequests: perfStats.totalRequests,
      cacheHits: perfStats.cacheHits,
      cacheMisses: perfStats.cacheMisses,
      cacheHitRate: perfStats.cacheHitRate,
      averageResponseTime: perfStats.averageResponseTime,
      duplicateRequests: perfStats.duplicateRequests,
      memoryUsage,
      renderCount
    });
  }, [renderCount]);

  // Set up update interval
  useEffect(() => {
    if (!isVisible) return;

    updateStats(); // Initial update
    const interval = setInterval(updateStats, updateInterval);

    return () => clearInterval(interval);
  }, [isVisible, updateInterval, updateStats]);

  // Clear all performance data
  const handleClear = useCallback(() => {
    performanceMonitor.clear();
    globalCache.clear();
    setRenderCount(0);
    updateStats();
  }, [updateStats]);

  // Get performance status color
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return '#4CAF50'; // Green
    if (value <= thresholds.warning) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  if (!isVisible) return null;

  return (
    <div className={`performance-monitor ${position} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header */}
      <div className="monitor-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="monitor-title">
          <span className="monitor-icon">📊</span>
          Performance
        </div>
        <div className="monitor-toggle">
          {isExpanded ? '−' : '+'}
        </div>
      </div>

      {/* Stats */}
      {isExpanded && (
        <div className="monitor-content">
          {/* Key Metrics */}
          <div className="metric-group">
            <h4>Network</h4>
            <div className="metric">
              <span className="metric-label">Requests:</span>
              <span className="metric-value">{stats.totalRequests}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Cache Hit Rate:</span>
              <span
                className="metric-value"
                style={{ color: getStatusColor(100 - stats.cacheHitRate, { good: 20, warning: 50 }) }}
              >
                {stats.cacheHitRate.toFixed(1)}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Avg Response:</span>
              <span
                className="metric-value"
                style={{ color: getStatusColor(stats.averageResponseTime, { good: 100, warning: 500 }) }}
              >
                {stats.averageResponseTime.toFixed(0)}ms
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Duplicates:</span>
              <span
                className="metric-value"
                style={{ color: stats.duplicateRequests > 0 ? '#F44336' : '#4CAF50' }}
              >
                {stats.duplicateRequests}
              </span>
            </div>
          </div>

          {/* Memory & Rendering */}
          <div className="metric-group">
            <h4>Performance</h4>
            {stats.memoryUsage && (
              <div className="metric">
                <span className="metric-label">Memory:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.memoryUsage, { good: 50, warning: 100 }) }}
                >
                  {stats.memoryUsage}MB
                </span>
              </div>
            )}
            <div className="metric">
              <span className="metric-label">Renders:</span>
              <span className="metric-value">{stats.renderCount}</span>
            </div>
          </div>

          {/* Cache Details */}
          <div className="metric-group">
            <h4>Cache</h4>
            <div className="metric">
              <span className="metric-label">Hits:</span>
              <span className="metric-value">{stats.cacheHits}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Misses:</span>
              <span className="metric-value">{stats.cacheMisses}</span>
            </div>
          </div>

          {/* Web Vitals */}
          <div className="metric-group">
            <h4>Web Vitals</h4>
            {stats.largestContentfulPaint && (
              <div className="metric">
                <span className="metric-label">LCP:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.largestContentfulPaint, { good: 2500, warning: 4000 }) }}
                >
                  {stats.largestContentfulPaint.toFixed(0)}ms
                </span>
              </div>
            )}
            {stats.firstInputDelay && (
              <div className="metric">
                <span className="metric-label">FID:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.firstInputDelay, { good: 100, warning: 300 }) }}
                >
                  {stats.firstInputDelay.toFixed(1)}ms
                </span>
              </div>
            )}
            {stats.cumulativeLayoutShift !== undefined && (
              <div className="metric">
                <span className="metric-label">CLS:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.cumulativeLayoutShift * 1000, { good: 100, warning: 250 }) }}
                >
                  {stats.cumulativeLayoutShift.toFixed(3)}
                </span>
              </div>
            )}
            {stats.firstContentfulPaint && (
              <div className="metric">
                <span className="metric-label">FCP:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.firstContentfulPaint, { good: 1800, warning: 3000 }) }}
                >
                  {stats.firstContentfulPaint.toFixed(0)}ms
                </span>
              </div>
            )}
            {stats.timeToInteractive && (
              <div className="metric">
                <span className="metric-label">TTI:</span>
                <span
                  className="metric-value"
                  style={{ color: getStatusColor(stats.timeToInteractive, { good: 3800, warning: 7300 }) }}
                >
                  {stats.timeToInteractive.toFixed(0)}ms
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="monitor-actions">
            <button className="clear-button" onClick={handleClear}>
              Clear Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for using performance monitor
export const usePerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isVisible, setIsVisible };
};

export default PerformanceMonitor;
