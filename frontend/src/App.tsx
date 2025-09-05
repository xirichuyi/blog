// import React from 'react' // Not needed in React 17+
import AppRouter from './router/AppRouter'
import ResourcePreloader from './components/ui/ResourcePreloader'
import PerformanceOptimizer from './components/ui/PerformanceOptimizer'
import './App.css'

function App() {
  return (
    <>
      <PerformanceOptimizer />
      <ResourcePreloader
        resources={[
          // 减少预加载资源，只保留最关键的
          '/src/styles/theme.css',
        ]}
        fonts={[
          // 只预加载最关键的字体
          'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2'
        ]}
        criticalCSS={[]}
      />
      <AppRouter />
    </>
  )
}

export default App
