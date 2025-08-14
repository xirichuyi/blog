import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'medium'
}) => {
  const [theme, setTheme] = useState<Theme>('auto');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    // Detect system theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    const effectiveTheme = theme === 'auto' ? systemTheme : theme;
    
    root.setAttribute('data-theme', effectiveTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme, systemTheme]);

  const handleThemeChange = () => {
    const themes: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return 'light_mode';
      case 'dark':
        return 'dark_mode';
      case 'auto':
        return 'brightness_auto';
      default:
        return 'brightness_auto';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'auto':
        return 'Auto theme';
      default:
        return 'Auto theme';
    }
  };

  return (
    <md-icon-button
      className={`theme-toggle theme-toggle-${size} ${className}`}
      onClick={handleThemeChange}
      aria-label={`Switch theme. Current: ${getThemeLabel()}`}
      title={getThemeLabel()}
    >
      <md-icon>{getThemeIcon()}</md-icon>
    </md-icon-button>
  );
};

export default ThemeToggle;
