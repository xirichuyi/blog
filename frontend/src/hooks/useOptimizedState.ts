/**
 * 优化的状态管理 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from '@/utils/common';

/**
 * 防抖状态 Hook
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  const debouncedSetValue = useCallback(
    debounce((value: T) => {
      setDebouncedValue(value);
    }, delay),
    [delay]
  );

  const setValue = useCallback((value: T) => {
    setImmediateValue(value);
    debouncedSetValue(value);
  }, [debouncedSetValue]);

  return [immediateValue, debouncedValue, setValue];
}

/**
 * 节流状态 Hook
 */
export function useThrottledState<T>(
  initialValue: T,
  limit: number = 100
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  const throttledSetValue = useCallback(
    throttle((newValue: T) => {
      setValue(newValue);
    }, limit),
    [limit]
  );

  return [value, throttledSetValue];
}

/**
 * 安全状态 Hook - 防止在组件卸载后更新状态
 */
export function useSafeState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState];
}

/**
 * 异步状态 Hook
 */
export function useAsyncState<T, E = Error>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList = []
) {
  const [state, setState] = useSafeState<{
    data: T | null;
    loading: boolean;
    error: E | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error as E 
      }));
      throw error;
    }
  }, dependencies);

  useEffect(() => {
    execute().catch(() => {
      // 错误已在execute中处理
    });
  }, [execute]);

  const retry = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    ...state,
    execute,
    retry,
  };
}

/**
 * 本地存储状态 Hook
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setState(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setState(initialValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [state, setValue, removeValue];
}

/**
 * 表单状态 Hook
 */
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, (value: any) => string | null>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // 验证字段
    if (validationRules?.[field]) {
      const error = validationRules[field]!(value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [validationRules]);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const validateAll = useCallback(() => {
    if (!validationRules) return true;

    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field as keyof T]!(values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
  };
}

/**
 * 列表状态 Hook
 */
export function useListState<T>(initialList: T[] = []) {
  const [list, setList] = useState<T[]>(initialList);

  const add = useCallback((item: T) => {
    setList(prev => [...prev, item]);
  }, []);

  const remove = useCallback((index: number) => {
    setList(prev => prev.filter((_, i) => i !== index));
  }, []);

  const update = useCallback((index: number, item: T) => {
    setList(prev => prev.map((existingItem, i) => i === index ? item : existingItem));
  }, []);

  const clear = useCallback(() => {
    setList([]);
  }, []);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    setList(prev => {
      const newList = [...prev];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return newList;
    });
  }, []);

  const reset = useCallback(() => {
    setList(initialList);
  }, [initialList]);

  return {
    list,
    add,
    remove,
    update,
    clear,
    move,
    reset,
    setList,
  };
}

/**
 * 切换状态 Hook
 */
export function useToggle(initialValue = false): [boolean, () => void, (value?: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setToggle = useCallback((newValue?: boolean) => {
    setValue(newValue ?? !value);
  }, [value]);

  return [value, toggle, setToggle];
}

export default {
  useDebouncedState,
  useThrottledState,
  useSafeState,
  useAsyncState,
  useLocalStorageState,
  useFormState,
  useListState,
  useToggle,
};
