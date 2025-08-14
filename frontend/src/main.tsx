import { StrictMode } from 'react'
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

// Initialize Material Design
initializeMaterialDesign()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <HeroUIProvider>
        <App />
      </HeroUIProvider>
    </HelmetProvider>
  </StrictMode>,
)
