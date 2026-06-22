/**
 * 平滑过渡工具函数
 * 用于防止页面抖动和提供更好的用户体验
 */

/**
 * 延迟执行函数，用于创建平滑的加载体验
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns Promise
 */
export const delayExecution = (fn: () => void | Promise<void>, delay: number = 100): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            await fn();
            resolve();
        }, delay);
    });
};

/**
 * 防抖函数 - 经典实现
 * @param func 要防抖的函数
 * @param wait 等待时间
 * @param immediate 是否立即执行
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
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

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 限制时间间隔
 * @returns 节流后的函数
 */
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

/**
 * 平滑状态变化类 - 用于管理复杂的状态转换
 */
export class SmoothStateManager<T> {
    private currentState: T;
    private pendingState: T | null = null;
    private isTransitioning = false;
    private transitionDelay: number;
    private callbacks: Array<(state: T) => void> = [];

    constructor(initialState: T, transitionDelay: number = 150) {
        this.currentState = initialState;
        this.transitionDelay = transitionDelay;
    }

    /**
     * 获取当前状态
     */
    getCurrentState(): T {
        return this.currentState;
    }

    /**
     * 平滑地更新状态
     */
    updateState(newState: T): Promise<void> {
        return new Promise((resolve) => {
            this.pendingState = newState;

            if (this.isTransitioning) {
                // 如果正在转换，等待当前转换完成
                return;
            }

            this.isTransitioning = true;

            setTimeout(() => {
                if (this.pendingState !== null) {
                    this.currentState = this.pendingState;
                    this.pendingState = null;
                    this.notifyCallbacks();
                }
                this.isTransitioning = false;
                resolve();
            }, this.transitionDelay);
        });
    }

    /**
     * 订阅状态变化
     */
    subscribe(callback: (state: T) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * 通知所有订阅者
     */
    private notifyCallbacks(): void {
        this.callbacks.forEach(callback => callback(this.currentState));
    }

    /**
     * 是否正在转换中
     */
    isTransitionInProgress(): boolean {
        return this.isTransitioning;
    }
}

/**
 * CSS 类名平滑切换工具
 */
export class SmoothClassToggle {
    private element: HTMLElement;
    private transitionDuration: number;

    constructor(element: HTMLElement, transitionDuration: number = 200) {
        this.element = element;
        this.transitionDuration = transitionDuration;
    }

    /**
     * 平滑地添加类名
     */
    async addClass(className: string): Promise<void> {
        return new Promise((resolve) => {
            this.element.classList.add(`${className}-entering`);

            requestAnimationFrame(() => {
                this.element.classList.add(className);
                this.element.classList.remove(`${className}-entering`);

                setTimeout(() => {
                    resolve();
                }, this.transitionDuration);
            });
        });
    }

    /**
     * 平滑地移除类名
     */
    async removeClass(className: string): Promise<void> {
        return new Promise((resolve) => {
            this.element.classList.add(`${className}-leaving`);

            setTimeout(() => {
                this.element.classList.remove(className, `${className}-leaving`);
                resolve();
            }, this.transitionDuration);
        });
    }
}

/**
 * 防止快速连续操作的锁
 */
export class OperationLock {
    private locks = new Map<string, boolean>();

    /**
     * 尝试获取锁
     */
    tryLock(key: string): boolean {
        if (this.locks.get(key)) {
            return false; // 已经被锁定
        }
        this.locks.set(key, true);
        return true;
    }

    /**
     * 释放锁
     */
    unlock(key: string): void {
        this.locks.delete(key);
    }

    /**
     * 自动释放锁的执行函数
     */
    async withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
        if (!this.tryLock(key)) {
            return null; // 操作被阻止
        }

        try {
            return await fn();
        } finally {
            this.unlock(key);
        }
    }
}

// 导出常用的工具实例
export const globalOperationLock = new OperationLock();
