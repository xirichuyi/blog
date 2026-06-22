import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
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

/**
 * 防抖函数 Hook
 * @param callback 需要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const callbackRef = useRef(callback);
    const timerRef = useRef<NodeJS.Timeout>();

    // 更新回调函数引用
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const debouncedCallback = useCallback(
        ((...args: Parameters<T>) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        }) as T,
        [delay]
    );

    return debouncedCallback;
}

/**
 * 防抖状态 Hook - 专门用于处理频繁的状态变化
 * @param initialValue 初始值
 * @param delay 防抖延迟
 * @returns [当前值, 设置值的函数, 是否正在等待]
 */
export function useDebouncedState<T>(
    initialValue: T,
    delay: number = 300
): [T, (value: T) => void, boolean] {
    const [value, setValue] = useState<T>(initialValue);
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
    const [isPending, setIsPending] = useState(false);
    const timerRef = useRef<NodeJS.Timeout>();

    const updateValue = useCallback((newValue: T) => {
        setValue(newValue);
        setIsPending(true);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setDebouncedValue(newValue);
            setIsPending(false);
        }, delay);
    }, [delay]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return [debouncedValue, updateValue, isPending];
}

/**
 * 防抖点击 Hook - 防止按钮被快速点击
 * @param callback 点击回调函数
 * @param delay 防抖延迟
 * @returns 防抖后的点击处理函数
 */
export function useDebouncedClick<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): [T, boolean] {
    const [isProcessing, setIsProcessing] = useState(false);
    const callbackRef = useRef(callback);
    const timerRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const debouncedClick = useCallback(
        ((...args: Parameters<T>) => {
            if (isProcessing) return; // 如果正在处理，直接返回

            setIsProcessing(true);
            callbackRef.current(...args);

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                setIsProcessing(false);
            }, delay);
        }) as T,
        [isProcessing, delay]
    );

    return [debouncedClick, isProcessing];
}

export default useDebounce;
