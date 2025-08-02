/**
 * 主题管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/utils/common';
import { STORAGE_KEYS } from '@/constants';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>('dark'); // 默认暗色主题
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');

  // 获取系统主题
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // 计算实际应用的主题
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // 应用主题到 DOM
  const applyTheme = useCallback((appliedTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (appliedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        appliedTheme === 'dark' ? '#111827' : '#ffffff'
      );
    }
  }, []);

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storage.set(STORAGE_KEYS.THEME, newTheme);
    
    const appliedTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyTheme(appliedTheme);
  }, [getSystemTheme, applyTheme]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);

      // 如果当前使用系统主题，则应用新的系统主题
      if (theme === 'system') {
        applyTheme(newSystemTheme);
      }
    };

    // 使用 AbortController 确保清理
    const controller = new AbortController();

    try {
      mediaQuery.addEventListener('change', handleChange, { signal: controller.signal });
    } catch (error) {
      // 降级到传统方式
      mediaQuery.addEventListener('change', handleChange);
    }

    // 初始化系统主题
    setSystemTheme(getSystemTheme());

    return () => {
      controller.abort();
      // 确保移除监听器（降级兼容）
      try {
        mediaQuery.removeEventListener('change', handleChange);
      } catch (error) {
        console.warn('Failed to remove media query listener:', error);
      }
    };
  }, [theme, getSystemTheme, applyTheme]);

  // 初始化主题
  useEffect(() => {
    // 从本地存储加载主题设置
    const savedTheme = storage.get<Theme>(STORAGE_KEYS.THEME);
    const initialTheme = savedTheme || 'dark'; // 默认暗色主题
    
    setThemeState(initialTheme);
    
    // 应用主题
    const appliedTheme = initialTheme === 'system' ? getSystemTheme() : initialTheme;
    applyTheme(appliedTheme);
  }, [getSystemTheme, applyTheme]);

  return {
    theme,
    systemTheme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
};

/**
 * 主题相关的工具函数
 */
export const themeUtils = {
  /**
   * 获取主题对应的颜色值
   */
  getThemeColors: (theme: 'light' | 'dark') => ({
    background: theme === 'dark' ? '#111827' : '#ffffff',
    foreground: theme === 'dark' ? '#f9fafb' : '#111827',
    primary: '#3b82f6',
    secondary: theme === 'dark' ? '#374151' : '#f3f4f6',
    accent: theme === 'dark' ? '#1f2937' : '#e5e7eb',
    muted: theme === 'dark' ? '#6b7280' : '#9ca3af',
    border: theme === 'dark' ? '#374151' : '#e5e7eb',
  }),

  /**
   * 获取主题对应的 CSS 变量
   */
  getThemeVariables: (theme: 'light' | 'dark') => {
    const colors = themeUtils.getThemeColors(theme);
    return Object.entries(colors).reduce((acc, [key, value]) => {
      acc[`--color-${key}`] = value;
      return acc;
    }, {} as Record<string, string>);
  },

  /**
   * 检查是否为暗色主题
   */
  isDark: (theme: 'light' | 'dark') => theme === 'dark',

  /**
   * 获取对比主题
   */
  getOppositeTheme: (theme: 'light' | 'dark'): 'light' | 'dark' => 
    theme === 'dark' ? 'light' : 'dark',
};

/**
 * 主题感知的样式 Hook
 */
export const useThemeStyles = () => {
  const { resolvedTheme } = useTheme();

  const getThemeClass = useCallback((lightClass: string, darkClass: string) => {
    return resolvedTheme === 'dark' ? darkClass : lightClass;
  }, [resolvedTheme]);

  const getThemeStyle = useCallback((lightStyle: React.CSSProperties, darkStyle: React.CSSProperties) => {
    return resolvedTheme === 'dark' ? darkStyle : lightStyle;
  }, [resolvedTheme]);

  const getThemeValue = useCallback(<T>(lightValue: T, darkValue: T): T => {
    return resolvedTheme === 'dark' ? darkValue : lightValue;
  }, [resolvedTheme]);

  return {
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    getThemeClass,
    getThemeStyle,
    getThemeValue,
  };
};

/**
 * 颜色模式切换 Hook
 */
export const useColorMode = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const colorModes: Array<{ value: Theme; label: string; icon: string }> = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'computer' },
  ];

  const currentMode = colorModes.find(mode => mode.value === theme);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    colorModes,
    currentMode,
  };
};
