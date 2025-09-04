#!/bin/bash

echo "🚀 Starting build process..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Run build
echo "📦 Building project..."
npx vite build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful! Files generated in dist/"
    echo "📊 Build summary:"
    ls -la dist/
    echo ""
    echo "📁 Assets:"
    ls -la dist/assets/ 2>/dev/null || echo "No assets directory found"
else
    echo "❌ Build failed - no dist directory found"
    exit 1
fi

echo "🎉 Build process completed!"
