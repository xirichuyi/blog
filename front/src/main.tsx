import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '@/lib/theme'
import { SiteUIProvider } from '@/lib/site-ui'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <ThemeProvider>
      <BrowserRouter>
        <SiteUIProvider>
          <App />
        </SiteUIProvider>
      </BrowserRouter>
    </ThemeProvider>
  </HelmetProvider>
)
