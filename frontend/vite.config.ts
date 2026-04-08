import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false,
      verbose: true,
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
      verbose: true,
    }),
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
    ],
    exclude: [
      '@material/web'
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          // Core React vendor
          if (id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
          // Ant Design icons - very large, split separately
          if (id.includes('@ant-design/icons')) {
            return 'antd-icons';
          }
          // Ant Design Pro components (ProTable, ProLayout)
          if (id.includes('@ant-design/pro')) {
            return 'antd-pro';
          }
          // Ant Design core
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'antd';
          }
          // Markdown rendering - article detail only
          if (id.includes('markdown-it') || id.includes('highlight.js') || id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
            return 'markdown';
          }
          // Material Web - public pages
          if (id.includes('@material/web')) {
            return 'material';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 1024,
  }
})
