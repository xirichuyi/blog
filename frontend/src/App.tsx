// import React from 'react' // Not needed in React 17+
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router/AppRouter'
import ResourcePreloader from './components/ui/ResourcePreloader'
import PerformanceOptimizer from './components/ui/PerformanceOptimizer'
import { lightTheme } from './config/antd';
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={lightTheme}>
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
    </ConfigProvider>
  )
}

export default App
