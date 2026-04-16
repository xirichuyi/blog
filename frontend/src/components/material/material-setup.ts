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
try {
  if (typeof document !== 'undefined' && typescaleStyles.styleSheet) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, typescaleStyles.styleSheet];
  }
} catch (_) { /* ignore */ }

// Note: TypeScript declarations are centralized in services/types/material-web.d.ts

// Material Icons Setup - no external font loading needed (using system fonts)
export const loadMaterialIcons = () => {
  // No-op: removed Google Fonts loading to avoid blocked requests in China
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
