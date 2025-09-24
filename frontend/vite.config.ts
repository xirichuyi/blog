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
  optimizeDeps: {
    // 预构建依赖项
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'react-markdown',
      'remark-gfm',
      'rehype-slug',
      'rehype-autolink-headings'
    ],
    // 排除有问题的依赖项
    exclude: [
      '@material/web'
    ],
    // 强制预构建
    force: true
  },
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
        // 最简化的代码分割策略
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 1024,
    reportCompressedSize: false
  }
})
