/**
 * 懒加载包装组件
 */

import React, { Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui';
import ErrorBoundary from './ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

// 默认加载组件
const DefaultLoadingFallback = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-300">Loading...</p>
    </motion.div>
  </div>
);

// 默认错误组件
const DefaultErrorFallback = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Failed to load component
      </h2>
      <p className="text-gray-400 text-sm">
        Please refresh the page or try again later.
      </p>
    </motion.div>
  </div>
);

/**
 * 懒加载包装组件
 */
export function LazyWrapper({ 
  children, 
  fallback = <DefaultLoadingFallback />, 
  errorFallback = <DefaultErrorFallback /> 
}: LazyWrapperProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * 创建懒加载组件的高阶函数
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    preload?: boolean;
  }
): LazyExoticComponent<T> {
  const LazyComponent = React.lazy(importFn);

  // 预加载选项
  if (options?.preload) {
    // 在空闲时预加载组件
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importFn().catch(console.error);
      });
    } else {
      // 降级到setTimeout
      setTimeout(() => {
        importFn().catch(console.error);
      }, 100);
    }
  }

  return LazyComponent;
}

/**
 * 路由懒加载包装器
 */
export function LazyRoute({ 
  component: Component, 
  fallback,
  errorFallback,
  ...props 
}: {
  component: LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <LazyWrapper fallback={fallback} errorFallback={errorFallback}>
      <Component {...props} />
    </LazyWrapper>
  );
}

/**
 * 预加载工具函数
 */
export const preloadUtils = {
  /**
   * 预加载组件
   */
  preloadComponent: (importFn: () => Promise<any>) => {
    if (typeof window !== 'undefined') {
      importFn().catch(console.error);
    }
  },

  /**
   * 批量预加载组件
   */
  preloadComponents: (importFns: Array<() => Promise<any>>) => {
    if (typeof window !== 'undefined') {
      importFns.forEach(fn => {
        fn().catch(console.error);
      });
    }
  },

  /**
   * 在用户交互时预加载
   */
  preloadOnInteraction: (
    element: HTMLElement,
    importFn: () => Promise<any>,
    events: string[] = ['mouseenter', 'focus']
  ) => {
    let loaded = false;
    
    const load = () => {
      if (!loaded) {
        loaded = true;
        importFn().catch(console.error);
        // 移除事件监听器
        events.forEach(event => {
          element.removeEventListener(event, load);
        });
      }
    };

    events.forEach(event => {
      element.addEventListener(event, load, { once: true });
    });
  },
};

export default LazyWrapper;
