import React, { useState, useEffect } from 'react';
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

  const getThemeIcon = () => {
    return theme === 'light' ? 'light_mode' : 'dark_mode';
  };

  const getThemeLabel = () => {
    return theme === 'light' ? 'Light theme' : 'Dark theme';
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
