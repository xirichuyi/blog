import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    // 暂时禁用ESLint检查以便快速启动
    // eslint: false
  })],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    global: 'globalThis',
  },
  // 暂时忽略ESLint错误
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
