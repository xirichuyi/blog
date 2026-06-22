// Performance utilities and hooks

import { useEffect, useRef, useState, useCallback } from 'react';

// Intersection Observer Hook for lazy loading
export function useIntersectionObserver(
    options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
    const elementRef = useRef<HTMLElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            {
                threshold: 0.1,
                rootMargin: '50px',
                ...options,
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [options]);

    return [elementRef, isIntersecting];
}

// Debounce hook
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

// Throttle hook
export function useThrottle<T>(value: T, limit: number): T {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const lastRan = useRef<number>(Date.now());

    useEffect(() => {
        const handler = setTimeout(() => {
            if (Date.now() - lastRan.current >= limit) {
                setThrottledValue(value);
                lastRan.current = Date.now();
            }
        }, limit - (Date.now() - lastRan.current));

        return () => {
            clearTimeout(handler);
        };
    }, [value, limit]);

    return throttledValue;
}

// Performance monitoring utilities
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, number> = new Map();

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    // Start timing a operation
    startTiming(label: string): void {
        this.metrics.set(`${label}_start`, performance.now());
    }

    // End timing and get duration
    endTiming(label: string): number {
        const startTime = this.metrics.get(`${label}_start`);
        if (!startTime) {
            console.warn(`No start time found for label: ${label}`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.metrics.set(label, duration);
        this.metrics.delete(`${label}_start`);

        return duration;
    }

    // Get metric
    getMetric(label: string): number | undefined {
        return this.metrics.get(label);
    }

    // Get all metrics
    getAllMetrics(): Record<string, number> {
        return Object.fromEntries(this.metrics);
    }

    // Clear metrics
    clear(): void {
        this.metrics.clear();
    }
}

// Web Vitals measurement
export interface WebVitals {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
}

export function measureWebVitals(): Promise<WebVitals> {
    return new Promise((resolve) => {
        const vitals: WebVitals = {};
        let measurementsComplete = 0;
        const totalMeasurements = 5;

        const checkComplete = () => {
            measurementsComplete++;
            if (measurementsComplete >= totalMeasurements) {
                resolve(vitals);
            }
        };

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries[entries.length - 1];
            vitals.fcp = fcpEntry.startTime;
            fcpObserver.disconnect();
            checkComplete();
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries[entries.length - 1];
            vitals.lcp = lcpEntry.startTime;
            lcpObserver.disconnect();
            checkComplete();
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fidEntry = entries[0];
            vitals.fid = fidEntry.processingStart - fidEntry.startTime;
            fidObserver.disconnect();
            checkComplete();
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                }
            }
            vitals.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Time to First Byte
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
            vitals.ttfb = navEntry.responseStart - navEntry.requestStart;
        }
        checkComplete();

        // Fallback timeout
        setTimeout(() => {
            resolve(vitals);
        }, 10000);
    });
}

// Image lazy loading utility
export function createLazyImageObserver(
    callback: (entry: IntersectionObserverEntry) => void,
    options: IntersectionObserverInit = {}
): IntersectionObserver {
    return new IntersectionObserver(
        (entries) => {
            entries.forEach(callback);
        },
        {
            rootMargin: '50px',
            threshold: 0.1,
            ...options,
        }
    );
}

// Memory usage monitoring
export function getMemoryUsage(): MemoryInfo | null {
    if ('memory' in performance) {
        return (performance as any).memory;
    }
    return null;
}

// Bundle size analyzer
export function analyzeBundleSize(): void {
    if (process.env.NODE_ENV === 'development') {
        console.group('Bundle Analysis');

        // Log loaded scripts
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        scripts.forEach((script) => {
            console.log(`Script: ${(script as HTMLScriptElement).src}`);
        });

        // Log loaded stylesheets
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        stylesheets.forEach((link) => {
            console.log(`Stylesheet: ${(link as HTMLLinkElement).href}`);
        });

        console.groupEnd();
    }
}

// Resource timing analysis
export function analyzeResourceTiming(): void {
    const resources = performance.getEntriesByType('resource');
    const analysis = {
        totalResources: resources.length,
        slowResources: resources.filter(r => r.duration > 1000),
        largeResources: resources.filter(r => (r as any).transferSize > 100000),
        cachedResources: resources.filter(r => (r as any).transferSize === 0),
    };

    console.table(analysis);
    return analysis;
}
