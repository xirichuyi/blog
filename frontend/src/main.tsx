import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { logger } from './utils/logger'

// Initialize theme FIRST, before any other imports that might fail
const initializeTheme = () => {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (!savedTheme || !['light', 'dark'].includes(savedTheme)) {
    localStorage.removeItem('theme');
    localStorage.setItem('theme', 'light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.setAttribute('data-theme', savedTheme);
  }
};
initializeTheme();

// Material Icons (local, no CDN)
import 'material-symbols/outlined.css'

// Import Material Design styles and setup
import './material-web.ts'
import './styles/theme.css'
import './styles/global.css'
import './index.css'
import './styles/mobile.css'
import './styles/apple-design-tokens.css'
import initializeMaterialDesign from './components/material/material-setup'

import App from './App.tsx'

// Initialize Material Design
initializeMaterialDesign()

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
)
