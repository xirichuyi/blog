import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

type Theme = 'light' | 'dark';

interface ThemeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'medium'
}) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      // Default to light theme if no saved preference
      setTheme('light');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = () => {
    // Toggle between light and dark
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getThemeLabel = () => {
    return theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  };

  const iconSize = size === 'small' ? 18 : size === 'large' ? 24 : 20;

  return (
    <button
      className={`theme-toggle theme-toggle-${size} ${className}`}
      onClick={handleThemeChange}
      aria-label={getThemeLabel()}
      title={getThemeLabel()}
    >
      {theme === 'light' ? (
        <Sun size={iconSize} />
      ) : (
        <Moon size={iconSize} />
      )}
    </button>
  );
};

export default ThemeToggle;
