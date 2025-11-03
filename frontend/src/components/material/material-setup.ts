// Material Web Components Setup and Configuration

// Import only the Material Web Components we actually use
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/elevated-button.js';

import '@material/web/labs/card/elevated-card.js';
import '@material/web/labs/card/outlined-card.js';

import '@material/web/chips/assist-chip.js';
import '@material/web/chips/filter-chip.js';

import '@material/web/divider/divider.js';

import '@material/web/icon/icon.js';

import '@material/web/iconbutton/icon-button.js';

import '@material/web/list/list.js';
import '@material/web/list/list-item.js';

import '@material/web/progress/circular-progress.js';

import '@material/web/textfield/outlined-text-field.js';

// Import Typography Styles
import { styles as typescaleStyles } from '@material/web/typography/md-typescale-styles.js';

// Apply typography styles to document
if (typeof document !== 'undefined') {
  if (typescaleStyles.styleSheet) {
    document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
  }
}

// Note: TypeScript declarations are centralized in services/types/material-web.d.ts

// Material Icons Setup
export const loadMaterialIcons = () => {
  if (typeof document !== 'undefined') {
    // Check if Material Icons are already loaded
    const existingLink = document.querySelector('link[href*="Material+Icons"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }

    // Also load Material Symbols for better icon support
    const existingSymbols = document.querySelector('link[href*="Material+Symbols"]');
    if (!existingSymbols) {
      const symbolsLink = document.createElement('link');
      symbolsLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
      symbolsLink.rel = 'stylesheet';
      symbolsLink.crossOrigin = 'anonymous';
      document.head.appendChild(symbolsLink);
    }
  }
};

// Theme Configuration Helper
export const configureTheme = (theme: 'light' | 'dark' = 'light') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }
};

// Initialize Material Design
export const initializeMaterialDesign = () => {
  loadMaterialIcons();

  // Set up theme based on saved preference
  if (typeof window !== 'undefined') {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      configureTheme(savedTheme);
    } else {
      // Default to light theme
      configureTheme('light');
    }
  }
};

// Export for use in main.tsx
export default initializeMaterialDesign;
