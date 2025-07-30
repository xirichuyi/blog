import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useTheme as useThemeHook, type Theme, type ThemeConfig } from '@/hooks/useTheme';

interface ThemeContextType extends ThemeConfig {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeState = useThemeHook();

  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 重新导出类型
export type { Theme, ThemeConfig };
