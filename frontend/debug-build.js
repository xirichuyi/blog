const { build } = require('vite');
const path = require('path');

async function buildProject() {
  try {
    console.log('🚀 Starting Vite build...');
    
    const result = await build({
      root: __dirname,
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          onwarn(warning, warn) {
            console.warn('⚠️ Build warning:', warning.message);
            warn(warning);
          }
        }
      }
    });
    
    console.log('✅ Build completed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProject();
