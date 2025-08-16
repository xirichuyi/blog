// 通用加载状态管理Hook
import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseLoadingOptions {
  initialLoading?: boolean;
  minLoadingTime?: number; // 最小加载时间（毫秒）
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
}

export interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  loadingStates: Record<string, boolean>;
  setLoadingState: (key: string, loading: boolean) => void;
  isAnyLoading: boolean;
}

export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const {
    initialLoading = false,
    minLoadingTime = 0,
    onLoadingStart,
    onLoadingEnd
  } = options;

  const [isLoading, setIsLoading] = useState(initialLoading);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const loadingStartTime = useRef<number | null>(null);
  const minTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (minTimeoutRef.current) {
        clearTimeout(minTimeoutRef.current);
      }
    };
  }, []);

  // 开始加载
  const startLoading = useCallback(() => {
    if (!isLoading) {
      setIsLoading(true);
      loadingStartTime.current = Date.now();
      onLoadingStart?.();
    }
  }, [isLoading, onLoadingStart]);

  // 停止加载
  const stopLoading = useCallback(() => {
    const stopLoadingInternal = () => {
      setIsLoading(false);
      loadingStartTime.current = null;
      onLoadingEnd?.();
    };

    if (minLoadingTime > 0 && loadingStartTime.current) {
      const elapsedTime = Date.now() - loadingStartTime.current;
      const remainingTime = minLoadingTime - elapsedTime;

      if (remainingTime > 0) {
        minTimeoutRef.current = setTimeout(stopLoadingInternal, remainingTime);
      } else {
        stopLoadingInternal();
      }
    } else {
      stopLoadingInternal();
    }
  }, [minLoadingTime, onLoadingEnd]);

  // 包装异步函数以自动管理加载状态
  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // 设置特定键的加载状态
  const setLoadingState = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  // 检查是否有任何加载状态为true
  const isAnyLoading = isLoading || Object.values(loadingStates).some(Boolean);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
    loadingStates,
    setLoadingState,
    isAnyLoading
  };
}

// 多个加载状态管理Hook
export function useMultipleLoading(keys: string[] = []): {
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: boolean;
  isAllLoading: boolean;
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
  resetAll: () => void;
} {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  const isAllLoading = Object.values(loadingStates).every(Boolean);

  const withLoading = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true);
    try {
      return await asyncFn();
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const resetAll = useCallback(() => {
    setLoadingStates(prev => 
      Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    );
  }, []);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    isAllLoading,
    withLoading,
    resetAll
  };
}

// 预定义的加载配置
export const LoadingConfigs = {
  // 快速加载（无最小时间）
  fast: {
    minLoadingTime: 0
  },

  // 平滑加载（最小300ms）
  smooth: {
    minLoadingTime: 300
  },

  // 用户友好加载（最小500ms）
  userFriendly: {
    minLoadingTime: 500
  },

  // API请求加载
  api: {
    minLoadingTime: 200,
    onLoadingStart: () => console.log('API request started'),
    onLoadingEnd: () => console.log('API request completed')
  }
};
