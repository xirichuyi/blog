import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router/AppRouter'
import { lightTheme } from './config/antd';
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={lightTheme}>
      <AppRouter />
    </ConfigProvider>
  )
}

export default App
