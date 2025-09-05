import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    // 跳过TypeScript类型检查
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    // 紧急性能优化
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
        // 激进的代码分割策略
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@material')) return 'material-vendor';
            if (id.includes('@heroui')) return 'ui-vendor';
            return 'vendor';
          }
          if (id.includes('/components/blog/')) return 'blog';
          if (id.includes('/components/admin/')) return 'admin';
        }
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 1024,
    reportCompressedSize: false
  }
})
