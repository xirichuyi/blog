import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 只有大于10kb的文件才会被压缩
      deleteOriginFile: false, // 保留原始文件
      verbose: true, // 在控制台中输出压缩结果
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
      verbose: true,
    }),
  ],
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
        // 更细粒度的代码分割策略
        manualChunks: (id) => {
          // 第三方库分割
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@material')) return 'material-vendor';
            if (id.includes('@heroui')) return 'ui-vendor';
            if (id.includes('framer-motion')) return 'animation-vendor';
            if (id.includes('marked') || id.includes('markdown')) return 'markdown-vendor';
            return 'vendor';
          }

          // 博客组件分割
          if (id.includes('/components/blog/')) {
            if (id.includes('ArticleDetail')) return 'blog-article';
            if (id.includes('BlogHome')) return 'blog-home';
            return 'blog-common';
          }

          // 管理后台更细粒度分割
          if (id.includes('/components/admin/')) {
            if (id.includes('PostEditor')) return 'admin-editor';
            if (id.includes('PostManagement')) return 'admin-posts';
            if (id.includes('MusicManagement') || id.includes('MusicUpload')) return 'admin-music';
            if (id.includes('CategoriesTagsManagement')) return 'admin-categories-tags';
            if (id.includes('AboutManagement')) return 'admin-about';
            if (id.includes('Dashboard')) return 'admin-dashboard';
            if (id.includes('Login')) return 'admin-auth';
            return 'admin-common';
          }

          // UI组件分割
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 1024,
    reportCompressedSize: false
  }
})
