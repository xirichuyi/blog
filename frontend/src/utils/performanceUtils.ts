// Performance optimization utilities

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// React hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// React hook for debounced callbacks
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, ...deps]
  );
}

// React hook for throttled callbacks
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);
  const throttleRef = useRef<boolean>(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!throttleRef.current) {
        callbackRef.current(...args);
        throttleRef.current = true;

        setTimeout(() => {
          throttleRef.current = false;
        }, delay);
      }
    }) as T,
    [delay, ...deps]
  );
}

// Memoization utility for expensive calculations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
}

// React hook for memoized expensive calculations
export function useExpensiveCalculation<T>(
  calculate: () => T,
  deps: React.DependencyList
): T {
  return useMemo(calculate, deps);
}

// Performance measurement utility
export class PerformanceMeasure {
  private startTime: number = 0;
  private measurements: { [key: string]: number } = {};

  start(label?: string): void {
    this.startTime = performance.now();
    if (label) {
      console.time(label);
    }
  }

  end(label?: string): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    if (label) {
      console.timeEnd(label);
      this.measurements[label] = duration;
    }

    return duration;
  }

  getMeasurement(label: string): number | undefined {
    return this.measurements[label];
  }

  getAllMeasurements(): { [key: string]: number } {
    return { ...this.measurements };
  }

  clear(): void {
    this.measurements = {};
  }
}

// React hook for performance measurement
export function usePerformanceMeasure() {
  const measureRef = useRef(new PerformanceMeasure());

  return measureRef.current;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Analysis');
    console.log('React version:', React.version);
    console.log('Performance API available:', 'performance' in window);
    console.log('Intersection Observer available:', 'IntersectionObserver' in window);
    console.groupEnd();
  }
};

export default {
  debounce,
  throttle,
  useDebounce,
  useDebounceCallback,
  useThrottleCallback,
  memoize,
  useExpensiveCalculation,
  PerformanceMeasure,
  usePerformanceMeasure,
  useIntersectionObserver,
  analyzeBundleSize
};
