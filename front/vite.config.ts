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
    // Dev proxy so the SPA can call the Rust API same-origin (avoids CORS in dev).
    proxy: {
      '/api': { target: 'http://127.0.0.1:3006', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3006', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-highlight'],
        },
      },
    },
  },
})
