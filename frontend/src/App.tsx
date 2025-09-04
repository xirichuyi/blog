// import React from 'react' // Not needed in React 17+
import AppRouter from './router/AppRouter'
import ResourcePreloader from './components/ui/ResourcePreloader'
import './App.css'

function App() {
  return (
    <>
      <ResourcePreloader
        resources={[
          // Critical CSS and JS files
          '/assets/css/critical.css',
        ]}
        fonts={[
          // Google Fonts
          'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
          'https://fonts.gstatic.com/s/robotomono/v23/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW4.woff2'
        ]}
        criticalCSS={[
          // Material Design CSS
          'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
        ]}
      />
      <AppRouter />
    </>
  )
}

export default App
