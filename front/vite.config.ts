import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', threshold: 10240 }),
    compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 10240 }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Dev proxy so the SPA can call the API same-origin (avoids CORS in dev).
    // Defaults to the deployed backend; set VITE_API_TARGET to a local backend
    // (e.g. http://127.0.0.1:3006) when running one locally.
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET ?? 'https://blog.chuyi.uk', changeOrigin: true },
      '/uploads': { target: process.env.VITE_API_TARGET ?? 'https://blog.chuyi.uk', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
