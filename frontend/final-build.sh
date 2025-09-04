#!/bin/bash

echo "🚀 Chuyi的博客 - 最终构建过程"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

print_status "Starting build process..."

# Step 1: Clean previous build
print_status "Cleaning previous build..."
rm -rf dist
rm -rf node_modules/.vite

# Step 2: Check dependencies
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Step 3: Run TypeScript check
print_status "Running TypeScript check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_warning "TypeScript check failed, but continuing with build..."
fi

# Step 4: Try different build approaches
print_status "Attempting build with multiple strategies..."

# Strategy 1: Standard build
print_status "Strategy 1: Standard Vite build"
npx vite build --mode production 2>&1 | tee build.log
if [ -d "dist" ]; then
    print_success "Standard build successful!"
    BUILD_SUCCESS=true
else
    print_warning "Standard build failed, trying alternative..."
    BUILD_SUCCESS=false
fi

# Strategy 2: Build with legacy support (if first failed)
if [ "$BUILD_SUCCESS" = false ]; then
    print_status "Strategy 2: Build with legacy browser support"
    npx vite build --mode production --target es2015 2>&1 | tee -a build.log
    if [ -d "dist" ]; then
        print_success "Legacy build successful!"
        BUILD_SUCCESS=true
    else
        print_warning "Legacy build failed, trying minimal build..."
    fi
fi

# Strategy 3: Minimal build (if others failed)
if [ "$BUILD_SUCCESS" = false ]; then
    print_status "Strategy 3: Minimal build configuration"
    
    # Create a minimal vite config for emergency build
    cat > vite.config.minimal.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      onwarn: () => {} // Ignore all warnings
    }
  }
})
EOF
    
    npx vite build --config vite.config.minimal.ts 2>&1 | tee -a build.log
    if [ -d "dist" ]; then
        print_success "Minimal build successful!"
        BUILD_SUCCESS=true
        rm vite.config.minimal.ts
    else
        print_error "All build strategies failed!"
        rm vite.config.minimal.ts
    fi
fi

# Step 5: Verify build results
if [ "$BUILD_SUCCESS" = true ]; then
    print_success "Build completed successfully!"
    print_status "Build summary:"
    echo "📁 Dist directory size: $(du -sh dist | cut -f1)"
    echo "📄 Files generated:"
    ls -la dist/
    
    if [ -d "dist/assets" ]; then
        echo ""
        echo "📦 Assets:"
        ls -la dist/assets/
    fi
    
    print_success "🎉 Production build ready in dist/ directory!"
    
else
    print_error "Build failed with all strategies!"
    print_status "Build log saved to build.log"
    print_status "Please check the log for detailed error information."
    
    # Create a fallback dist with placeholder
    print_status "Creating fallback placeholder build..."
    mkdir -p dist
    echo "Build failed - placeholder created" > dist/BUILD_FAILED.txt
    
    exit 1
fi

# Step 6: Optional - Create build info
cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildTool": "Vite",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "success": true,
  "strategy": "Production Build"
}
EOF

print_success "Chuyi的博客构建过程成功完成！🚀"
