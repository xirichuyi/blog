import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// 防抖Hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 节流Hook
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

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
};

// 虚拟滚动Hook
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleItems,
    handleScroll
  };
};

// 懒加载Hook
export const useLazyLoad = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
};

// 性能监控Hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 16) { // 超过16ms警告
      console.warn(`[Performance] ${componentName} render took ${renderTime}ms (render #${renderCount.current})`);
    }

    startTime.current = endTime;
  });

  return {
    renderCount: renderCount.current,
    logPerformance: () => {
      console.log(`[Performance] ${componentName} has rendered ${renderCount.current} times`);
    }
  };
};

// 内存泄漏检测Hook
export const useMemoryLeakDetection = (componentName: string) => {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  const listeners = useRef<Set<() => void>>(new Set());

  const addTimer = useCallback((timer: NodeJS.Timeout) => {
    timers.current.add(timer);
    return timer;
  }, []);

  const addListener = useCallback((cleanup: () => void) => {
    listeners.current.add(cleanup);
    return cleanup;
  }, []);

  useEffect(() => {
    return () => {
      // 清理所有定时器
      timers.current.forEach(timer => clearTimeout(timer));
      timers.current.clear();

      // 清理所有监听器
      listeners.current.forEach(cleanup => cleanup());
      listeners.current.clear();

      console.log(`[Memory] Cleaned up resources for ${componentName}`);
    };
  }, [componentName]);

  return { addTimer, addListener };
};

// 批量状态更新Hook
export const useBatchedUpdates = <T>() => {
  const [state, setState] = useState<T[]>([]);
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((newItem: T) => {
    batchRef.current.push(newItem);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prev => [...prev, ...batchRef.current]);
      batchRef.current = [];
    }, 16); // 批量更新间隔16ms
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { state, batchUpdate };
};

// 组合所有优化Hook
export const usePerformanceOptimization = (componentName: string) => {
  const performanceMonitor = usePerformanceMonitor(componentName);
  const memoryLeakDetection = useMemoryLeakDetection(componentName);

  return {
    ...performanceMonitor,
    ...memoryLeakDetection,
    // 提供常用的优化工具
    debounce: useDebounce,
    throttle: useThrottle,
    virtualScroll: useVirtualScroll,
    lazyLoad: useLazyLoad,
    batchedUpdates: useBatchedUpdates
  };
};


