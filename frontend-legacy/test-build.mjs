import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting test build...');
console.log('Current directory:', __dirname);

try {
  const result = await build({
    root: __dirname,
    configFile: resolve(__dirname, 'vite.config.ts'),
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: false, // Disable minification for faster build
      sourcemap: true,
      rollupOptions: {
        onwarn(warning, warn) {
          console.warn('⚠️ Warning:', warning.message);
          if (warning.code !== 'UNUSED_EXTERNAL_IMPORT') {
            warn(warning);
          }
        }
      }
    },
    logLevel: 'info'
  });
  
  console.log('✅ Build completed!');
  
  // Check if dist directory was created
  import('fs').then(fs => {
    if (fs.existsSync(resolve(__dirname, 'dist'))) {
      console.log('📁 Dist directory created successfully');
      const files = fs.readdirSync(resolve(__dirname, 'dist'));
      console.log('📄 Files in dist:', files);
    } else {
      console.log('❌ Dist directory not found');
    }
  });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
