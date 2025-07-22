import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Theme } from '../types/blog';

interface ThemeContextType {
  theme: Theme;
  // 保留toggleTheme接口以避免破坏依赖它的组件，但实际上不会改变主题
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 固定使用暗黑模式
  const theme: Theme = 'dark';

  // 当组件挂载时，确保使用暗黑模式
  useEffect(() => {
    // 确保代码只在客户端执行
    if (typeof window !== 'undefined') {
      // 添加dark类到html元素
      document.documentElement.classList.add('dark');
      // 保存到localStorage以保持一致性
      localStorage.setItem('theme', theme);
    }
  }, []);

  // 保留toggleTheme函数以避免破坏依赖它的组件，但实际上不做任何事情
  const toggleTheme = () => {
    // 不执行任何操作，保持暗黑模式
    console.log('Theme toggle attempted, but site is fixed in dark mode');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 自定义hook，用于在组件中访问主题上下文
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
