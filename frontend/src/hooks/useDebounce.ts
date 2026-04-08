import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
    callback: T,
    delay: number
): T {
    const callbackRef = useRef(callback);
    const timerRef = useRef<NodeJS.Timeout>();

    useEffect(() => { callbackRef.current = callback; }, [callback]);
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return useCallback(
        ((...args: Parameters<T>) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
        }) as T,
        [delay]
    );
}

export default useDebounce;
