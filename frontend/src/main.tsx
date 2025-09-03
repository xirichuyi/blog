import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { HeroUIProvider } from '@heroui/react'

// Import Material Design styles and setup
import './material-web.ts'
import './styles/theme.css'
import './styles/global.css'
import './styles/heroui.css'
import './index.css'
import initializeMaterialDesign from './components/material/material-setup'

import App from './App.tsx'

// Initialize theme before Material Design
const initializeTheme = () => {
  const root = document.documentElement;

  // Clear any existing theme attributes first
  root.removeAttribute('data-theme');

  // Get saved theme preference
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

  // Set theme - default to light if no saved preference
  if (!savedTheme || !['light', 'dark'].includes(savedTheme)) {
    // Clear localStorage and set to light
    localStorage.removeItem('theme');
    localStorage.setItem('theme', 'light');
    root.setAttribute('data-theme', 'light');
    console.log('Theme initialized to light (default)');
  } else {
    root.setAttribute('data-theme', savedTheme);
    console.log('Theme set to:', savedTheme);
  }

  // Force a style recalculation
  root.style.display = 'none';
  root.offsetHeight; // Trigger reflow
  root.style.display = '';
};

// Initialize theme first
initializeTheme();

// Initialize Material Design
initializeMaterialDesign()

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </HelmetProvider>,
)
